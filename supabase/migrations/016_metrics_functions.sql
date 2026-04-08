-- ============================================================
-- MIGRATION: Vistas y funciones analíticas para Métricas
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- ─── 1. Columna para que alumno edite sus propios RMs ────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS can_edit_own_rms boolean DEFAULT false;

-- ─── 2. RPC: Dashboard stats para el entrenador ─────────────
CREATE OR REPLACE FUNCTION public.trainer_dashboard_stats(p_trainer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
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
  SELECT
    count(*) FILTER (WHERE active = true),
    count(*) FILTER (WHERE active = false)
  INTO v_active_students, v_inactive_students
  FROM public.users
  WHERE created_by = p_trainer_id AND role = 'student';

  SELECT
    count(*) FILTER (WHERE COALESCE(cycle_type, 'strength') = 'strength'),
    count(*) FILTER (WHERE cycle_type = 'crossfit')
  INTO v_cycles_strength, v_cycles_crossfit
  FROM public.training_cycles
  WHERE trainer_id = p_trainer_id AND active = true AND is_template = false;

  SELECT
    COALESCE(SUM(amount) FILTER (WHERE status = 'pagado'), 0),
    count(*) FILTER (WHERE status = 'pendiente'),
    count(*) FILTER (WHERE status = 'vencido')
  INTO v_payments_paid, v_payments_pending, v_payments_overdue
  FROM public.student_payments
  WHERE trainer_id = p_trainer_id
    AND date_trunc('month', due_date) = date_trunc('month', CURRENT_DATE);

  WITH planned AS (
    SELECT DISTINCT d.id AS day_id, c.student_id
    FROM public.training_cycles c
    JOIN public.training_weeks w ON w.cycle_id = c.id
    JOIN public.training_days d ON d.week_id = w.id
    WHERE c.trainer_id = p_trainer_id
      AND c.active = true
      AND c.is_template = false
      AND c.student_id IS NOT NULL
      AND COALESCE(d.is_rest, false) = false
  ),
  completed AS (
    SELECT DISTINCT sl.training_day_id, sl.student_id
    FROM public.session_logs sl
    JOIN planned p ON p.day_id = sl.training_day_id AND p.student_id = sl.student_id
    WHERE sl.completed = true
      AND sl.date >= CURRENT_DATE - INTERVAL '30 days'
  )
  SELECT
    CASE WHEN (SELECT count(*) FROM planned) = 0 THEN 0
    ELSE ROUND((SELECT count(*) FROM completed)::numeric / GREATEST((SELECT count(*) FROM planned), 1) * 100, 1)
    END
  INTO v_adherence_pct;

  v_result := jsonb_build_object(
    'active_students', v_active_students,
    'inactive_students', v_inactive_students,
    'cycles_strength', v_cycles_strength,
    'cycles_crossfit', v_cycles_crossfit,
    'payments_paid', v_payments_paid,
    'payments_pending', v_payments_pending,
    'payments_overdue', v_payments_overdue,
    'adherence_pct', v_adherence_pct
  );

  RETURN v_result;
END;
$$;

-- ─── 3. RPC: Adherencia por alumno ──────────────────────────
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
BEGIN
  RETURN QUERY
  WITH planned AS (
    SELECT c.student_id, COALESCE(c.cycle_type, 'strength') AS ctype, d.id AS day_id
    FROM public.training_cycles c
    JOIN public.training_weeks w ON w.cycle_id = c.id
    JOIN public.training_days d ON d.week_id = w.id
    WHERE c.trainer_id = p_trainer_id
      AND c.active = true
      AND c.is_template = false
      AND c.student_id IS NOT NULL
      AND COALESCE(d.is_rest, false) = false
  ),
  completed AS (
    SELECT sl.student_id, sl.training_day_id
    FROM public.session_logs sl
    WHERE sl.completed = true
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

-- ─── 4. RPC: Métricas de un ciclo ───────────────────────────
CREATE OR REPLACE FUNCTION public.cycle_metrics(p_cycle_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_total_days int;
  v_completed_days int;
  v_total_blocks int;
  v_cycle record;
  v_avg_score numeric;
  v_scores_loaded int;
BEGIN
  SELECT * INTO v_cycle FROM public.training_cycles WHERE id = p_cycle_id;

  SELECT count(*) INTO v_total_days
  FROM public.training_weeks w
  JOIN public.training_days d ON d.week_id = w.id
  WHERE w.cycle_id = p_cycle_id AND COALESCE(d.is_rest, false) = false;

  SELECT count(DISTINCT sl.training_day_id) INTO v_completed_days
  FROM public.session_logs sl
  JOIN public.training_days d ON d.id = sl.training_day_id
  JOIN public.training_weeks w ON w.id = d.week_id
  WHERE w.cycle_id = p_cycle_id AND sl.student_id = v_cycle.student_id AND sl.completed = true;

  SELECT count(*) INTO v_total_blocks
  FROM public.training_weeks w
  JOIN public.training_days d ON d.week_id = w.id
  JOIN public.training_blocks b ON b.day_id = d.id
  WHERE w.cycle_id = p_cycle_id;

  IF COALESCE(v_cycle.cycle_type, 'strength') = 'crossfit' THEN
    SELECT count(*), AVG(score_total_reps) INTO v_scores_loaded, v_avg_score
    FROM public.cf_results r
    JOIN public.training_blocks b ON b.id = r.block_id
    JOIN public.training_days d ON d.id = b.day_id
    JOIN public.training_weeks w ON w.id = d.week_id
    WHERE w.cycle_id = p_cycle_id;
  ELSE
    v_scores_loaded := 0; v_avg_score := 0;
  END IF;

  v_result := jsonb_build_object(
    'cycle_id', p_cycle_id,
    'cycle_name', v_cycle.name,
    'cycle_type', COALESCE(v_cycle.cycle_type, 'strength'),
    'total_days', v_total_days,
    'completed_days', v_completed_days,
    'completion_pct', CASE WHEN v_total_days = 0 THEN 0 ELSE ROUND(v_completed_days::numeric / v_total_days * 100, 1) END,
    'total_blocks', v_total_blocks,
    'cf_scores_loaded', v_scores_loaded,
    'cf_avg_score', v_avg_score
  );

  RETURN v_result;
END;
$$;

-- ─── 5. Vista: Adherencia por tipo de ciclo ─────────────────
CREATE OR REPLACE VIEW public.adherence_by_cycle_type AS
SELECT
  c.trainer_id,
  COALESCE(c.cycle_type, 'strength') AS cycle_type,
  count(DISTINCT d.id) AS planned_days,
  count(DISTINCT sl.id) FILTER (WHERE sl.completed = true) AS completed_days,
  CASE WHEN count(DISTINCT d.id) = 0 THEN 0
  ELSE ROUND(
    count(DISTINCT sl.id) FILTER (WHERE sl.completed = true)::numeric
    / count(DISTINCT d.id) * 100, 1
  )
  END AS adherence_pct
FROM public.training_cycles c
JOIN public.training_weeks w ON w.cycle_id = c.id
JOIN public.training_days d ON d.week_id = w.id
LEFT JOIN public.session_logs sl ON sl.training_day_id = d.id AND sl.student_id = c.student_id
WHERE c.active = true AND c.is_template = false AND c.student_id IS NOT NULL
GROUP BY c.trainer_id, COALESCE(c.cycle_type, 'strength');
