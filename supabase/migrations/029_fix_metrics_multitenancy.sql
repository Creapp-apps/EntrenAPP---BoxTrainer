-- ============================================================
-- MIGRATION 029 — Reparación y Multitenancy de Métricas y RPCs Analíticos
-- Corrige el choque provocado por la migración 024 y conecta 
-- las estadísticas reales del Box filtrando por box_id en lugar de created_by.
-- ============================================================

-- ─── 1. Nueva Función Específica para la Pantalla de Métricas ───────────────────
-- Devuelve exactamente la firma JSON (snake_case) que espera MetricasPage.tsx
CREATE OR REPLACE FUNCTION public.trainer_analytics_stats(p_trainer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_actual_trainer_id uuid;
  v_box_id uuid;
  v_result jsonb;
  v_active_students int;
  v_inactive_students int;
  v_cycles_strength int;
  v_cycles_crossfit int;
  v_payments_paid numeric;
  v_payments_pending int;
  v_payments_overdue int;
  v_adherence_pct numeric;
BEGIN
  -- Resolucionar el ID del Dueño del Box (soporta Co-Trainers / Profesores)
  v_actual_trainer_id := public.get_box_owner_id(p_trainer_id);
  
  -- Obtener el Box ID asociado
  SELECT box_id INTO v_box_id FROM public.users WHERE id = v_actual_trainer_id;

  -- 1. Total Alumnos del Box (Activos / Inactivos)
  SELECT
    count(*) FILTER (WHERE active = true),
    count(*) FILTER (WHERE active = false)
  INTO v_active_students, v_inactive_students
  FROM public.users
  WHERE box_id = v_box_id AND role = 'student';

  -- 2. Ciclos de Entrenamiento activos por tipo
  SELECT
    count(*) FILTER (WHERE COALESCE(cycle_type, 'strength') = 'strength'),
    count(*) FILTER (WHERE cycle_type = 'crossfit')
  INTO v_cycles_strength, v_cycles_crossfit
  FROM public.training_cycles
  WHERE active = true 
    AND is_template = false 
    AND student_id IN (
      SELECT id FROM public.users WHERE box_id = v_box_id AND role = 'student'
    );

  -- 3. Pagos del mes calendario actual (Mayo 2026 o mes actual)
  -- Mide los ingresos recaudados de facturas cuyo vencimiento cae en el mes en curso.
  SELECT
    COALESCE(SUM(sp.amount) FILTER (WHERE sp.status = 'pagado'), 0),
    count(*) FILTER (WHERE sp.status = 'pendiente'),
    count(*) FILTER (WHERE sp.status = 'vencido')
  INTO v_payments_paid, v_payments_pending, v_payments_overdue
  FROM public.student_payments sp
  JOIN public.users u ON u.id = sp.student_id
  WHERE u.box_id = v_box_id
    AND sp.due_date >= date_trunc('month', CURRENT_DATE)
    AND sp.due_date <= (date_trunc('month', CURRENT_DATE) + interval '1 month' - interval '1 second');

  -- 4. Adherencia General del Box (últimos 30 días)
  WITH planned AS (
    SELECT DISTINCT d.id AS day_id, c.student_id
    FROM public.training_cycles c
    JOIN public.users u ON u.id = c.student_id
    JOIN public.training_weeks w ON w.cycle_id = c.id
    JOIN public.training_days d ON d.week_id = w.id
    WHERE u.box_id = v_box_id
      AND c.active = true
      AND c.is_template = false
      AND COALESCE(d.is_rest, false) = false
  ),
  completed AS (
    SELECT DISTINCT sl.training_day_id, sl.student_id
    FROM public.session_logs sl
    JOIN public.users u ON u.id = sl.student_id
    JOIN planned p ON p.day_id = sl.training_day_id AND p.student_id = sl.student_id
    WHERE sl.completed = true
      AND u.box_id = v_box_id
      AND sl.date >= CURRENT_DATE - INTERVAL '30 days'
  )
  SELECT
    CASE WHEN (SELECT count(*) FROM planned) = 0 THEN 0
    ELSE ROUND((SELECT count(*) FROM completed)::numeric / GREATEST((SELECT count(*) FROM planned), 1) * 100, 1)
    END
  INTO v_adherence_pct;

  -- Construcción del JSON con llaves idénticas a las esperadas por el Frontend
  v_result := jsonb_build_object(
    'active_students', COALESCE(v_active_students, 0),
    'inactive_students', COALESCE(v_inactive_students, 0),
    'cycles_strength', COALESCE(v_cycles_strength, 0),
    'cycles_crossfit', COALESCE(v_cycles_crossfit, 0),
    'payments_paid', COALESCE(v_payments_paid, 0),
    'payments_pending', COALESCE(v_payments_pending, 0),
    'payments_overdue', COALESCE(v_payments_overdue, 0),
    'adherence_pct', COALESCE(v_adherence_pct, 0)
  );

  RETURN v_result;
END;
$$;

-- ─── 2. Actualización de student_adherence_list ─────────────────────────────────
-- Modificada para buscar alumnos por box_id y no por created_by.
CREATE OR REPLACE FUNCTION public.student_adherence_list(
  p_trainer_id uuid,
  p_days int DEFAULT 30
)
RETURNS TABLE(
  student_id uuid,
  student_name text,
  planned_days bigint,
  completed_days bigint,
  adherence_pct numeric,
  cycle_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_actual_trainer_id uuid;
  v_box_id uuid;
BEGIN
  v_actual_trainer_id := public.get_box_owner_id(p_trainer_id);
  SELECT box_id INTO v_box_id FROM public.users WHERE id = v_actual_trainer_id;

  RETURN QUERY
  WITH planned AS (
    SELECT c.student_id, COALESCE(c.cycle_type, 'strength') AS ctype, d.id AS day_id
    FROM public.training_cycles c
    JOIN public.users u ON u.id = c.student_id
    JOIN public.training_weeks w ON w.cycle_id = c.id
    JOIN public.training_days d ON d.week_id = w.id
    WHERE u.box_id = v_box_id
      AND c.active = true
      AND c.is_template = false
      AND COALESCE(d.is_rest, false) = false
  ),
  completed AS (
    SELECT sl.student_id, sl.training_day_id
    FROM public.session_logs sl
    JOIN public.users u ON u.id = sl.student_id
    WHERE sl.completed = true
      AND u.box_id = v_box_id
      AND sl.date >= CURRENT_DATE - p_days * INTERVAL '1 day'
  )
  SELECT
    u.id AS student_id,
    u.full_name AS student_name,
    count(DISTINCT p.day_id) AS planned_days,
    count(DISTINCT c.training_day_id) AS completed_days,
    CASE WHEN count(DISTINCT p.day_id) = 0 THEN 0
    ELSE ROUND(count(DISTINCT c.training_day_id)::numeric / count(DISTINCT p.day_id) * 100, 1)
    END AS adherence_pct,
    p.ctype AS cycle_type
  FROM planned p
  JOIN public.users u ON u.id = p.student_id
  LEFT JOIN completed c ON c.student_id = p.student_id AND c.training_day_id = p.day_id
  GROUP BY u.id, u.full_name, p.ctype
  ORDER BY adherence_pct DESC;
END;
$$;
