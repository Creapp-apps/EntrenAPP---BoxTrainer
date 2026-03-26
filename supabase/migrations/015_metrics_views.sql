-- ============================================================
-- MIGRATION 015 — Vistas y funciones analíticas para Métricas
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- ─── 1. Per-student: Permitir que un alumno cargue RMs ──────

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
  -- Alumnos activos/inactivos
  SELECT
    count(*) FILTER (WHERE active = true),
    count(*) FILTER (WHERE active = false)
  INTO v_active_students, v_inactive_students
  FROM public.users
  WHERE created_by = p_trainer_id AND role = 'student';

  -- Ciclos activos por tipo
  SELECT
    count(*) FILTER (WHERE COALESCE(cycle_type, 'strength') = 'strength'),
    count(*) FILTER (WHERE cycle_type = 'crossfit')
  INTO v_cycles_strength, v_cycles_crossfit
  FROM public.training_cycles
  WHERE trainer_id = p_trainer_id AND active = true AND is_template = false;

  -- Pagos del mes actual
  SELECT
    COALESCE(SUM(amount) FILTER (WHERE status = 'pagado'), 0),
    count(*) FILTER (WHERE status = 'pendiente'),
    count(*) FILTER (WHERE status = 'vencido')
  INTO v_payments_paid, v_payments_pending, v_payments_overdue
  FROM public.student_payments
  WHERE trainer_id = p_trainer_id
    AND date_trunc('month', due_date) = date_trunc('month', CURRENT_DATE);

  -- Adherencia últimos 30 días
  -- Ratio de session_logs completados vs días planificados
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

-- ─── 4. RPC: Stats de un ciclo ──────────────────────────────

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
  v_students_assigned int;
BEGIN
  SELECT * INTO v_cycle FROM public.training_cycles WHERE id = p_cycle_id;

  -- Total días (no rest)
  SELECT count(*)
  INTO v_total_days
  FROM public.training_weeks w
  JOIN public.training_days d ON d.week_id = w.id
  WHERE w.cycle_id = p_cycle_id
    AND COALESCE(d.is_rest, false) = false;

  -- Días completados (session_logs)
  SELECT count(DISTINCT sl.training_day_id)
  INTO v_completed_days
  FROM public.session_logs sl
  JOIN public.training_days d ON d.id = sl.training_day_id
  JOIN public.training_weeks w ON w.id = d.week_id
  WHERE w.cycle_id = p_cycle_id
    AND sl.student_id = v_cycle.student_id
    AND sl.completed = true;

  -- Total bloques
  SELECT count(*)
  INTO v_total_blocks
  FROM public.training_weeks w
  JOIN public.training_days d ON d.week_id = w.id
  JOIN public.training_blocks b ON b.day_id = d.id
  WHERE w.cycle_id = p_cycle_id;

  -- CF: scores cargados y promedio (solo si es CrossFit)
  IF COALESCE(v_cycle.cycle_type, 'strength') = 'crossfit' THEN
    SELECT count(*), AVG(score_total_reps)
    INTO v_scores_loaded, v_avg_score
    FROM public.cf_results r
    JOIN public.training_blocks b ON b.id = r.block_id
    JOIN public.training_days d ON d.id = b.day_id
    JOIN public.training_weeks w ON w.id = d.week_id
    WHERE w.cycle_id = p_cycle_id;
  ELSE
    v_scores_loaded := 0;
    v_avg_score := 0;
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

-- ─── 5. RPC: Stats de un día específico ─────────────────────

CREATE OR REPLACE FUNCTION public.day_metrics(p_day_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_students_assigned int;
  v_students_completed int;
  v_cf_scores jsonb;
BEGIN
  -- Cuántos alumnos tienen este día asignado (via ciclo)
  SELECT count(DISTINCT c.student_id)
  INTO v_students_assigned
  FROM public.training_days d
  JOIN public.training_weeks w ON w.id = d.week_id
  JOIN public.training_cycles c ON c.id = w.cycle_id
  WHERE d.id = p_day_id AND c.student_id IS NOT NULL AND c.active = true;

  -- Cuántos lo completaron
  SELECT count(DISTINCT sl.student_id)
  INTO v_students_completed
  FROM public.session_logs sl
  WHERE sl.training_day_id = p_day_id AND sl.completed = true;

  -- Scores CF de ese día
  SELECT jsonb_agg(jsonb_build_object(
    'student_name', u.full_name,
    'score_value', r.score_value,
    'score_type', r.score_type,
    'level_used', r.level_used,
    'ranking', lb.ranking
  ))
  INTO v_cf_scores
  FROM public.cf_results r
  JOIN public.users u ON u.id = r.student_id
  LEFT JOIN public.cf_wod_leaderboard lb ON lb.result_id = r.id
  WHERE r.day_id = p_day_id;

  v_result := jsonb_build_object(
    'day_id', p_day_id,
    'students_assigned', v_students_assigned,
    'students_completed', v_students_completed,
    'completion_pct', CASE WHEN v_students_assigned = 0 THEN 0
      ELSE ROUND(v_students_completed::numeric / v_students_assigned * 100, 1) END,
    'cf_scores', COALESCE(v_cf_scores, '[]'::jsonb)
  );

  RETURN v_result;
END;
$$;

-- ─── 6. RPC: Métricas de un alumno ──────────────────────────

CREATE OR REPLACE FUNCTION public.student_metrics(
  p_student_id uuid,
  p_trainer_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_total_sessions bigint;
  v_completed_sessions bigint;
  v_prs jsonb;
  v_recent_weights jsonb;
  v_cf_results jsonb;
  v_tonnage numeric;
BEGIN
  -- Verify student belongs to trainer
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_student_id AND created_by = p_trainer_id) THEN
    RAISE EXCEPTION 'Alumno no encontrado o sin permisos';
  END IF;

  -- Adherencia total
  SELECT
    count(*),
    count(*) FILTER (WHERE completed = true)
  INTO v_total_sessions, v_completed_sessions
  FROM public.session_logs
  WHERE student_id = p_student_id;

  -- PRs actuales (último RM por ejercicio)
  SELECT jsonb_agg(pr_row ORDER BY pr_row->>'exercise_name')
  INTO v_prs
  FROM (
    SELECT DISTINCT ON (pr.exercise_id)
      jsonb_build_object(
        'exercise_id', pr.exercise_id,
        'exercise_name', e.name,
        'weight_kg', pr.weight_kg,
        'reps', pr.reps,
        'date', pr.date,
        'verified', pr.verified_by_trainer
      ) AS pr_row
    FROM public.personal_records pr
    JOIN public.exercises e ON e.id = pr.exercise_id
    WHERE pr.student_id = p_student_id
    ORDER BY pr.exercise_id, pr.date DESC
  ) sub;

  -- Tonelaje últimos 30 días
  SELECT COALESCE(SUM(el.weight_used * COALESCE(el.sets_done, 1) * COALESCE(el.reps_done::int, 1)), 0)
  INTO v_tonnage
  FROM public.exercise_logs el
  JOIN public.session_logs sl ON sl.id = el.session_log_id
  WHERE sl.student_id = p_student_id
    AND sl.date >= CURRENT_DATE - INTERVAL '30 days'
    AND el.weight_used IS NOT NULL;

  -- Últimos 10 resultados CF
  SELECT jsonb_agg(cf_row)
  INTO v_cf_results
  FROM (
    SELECT jsonb_build_object(
      'block_id', r.block_id,
      'day_id', r.day_id,
      'score_value', r.score_value,
      'score_type', r.score_type,
      'level_used', r.level_used,
      'date', r.created_at
    ) AS cf_row
    FROM public.cf_results r
    WHERE r.student_id = p_student_id
    ORDER BY r.created_at DESC
    LIMIT 10
  ) sub;

  v_result := jsonb_build_object(
    'student_id', p_student_id,
    'total_sessions', v_total_sessions,
    'completed_sessions', v_completed_sessions,
    'adherence_pct', CASE WHEN v_total_sessions = 0 THEN 0
      ELSE ROUND(v_completed_sessions::numeric / v_total_sessions * 100, 1) END,
    'personal_records', COALESCE(v_prs, '[]'::jsonb),
    'tonnage_30d', v_tonnage,
    'cf_results', COALESCE(v_cf_results, '[]'::jsonb)
  );

  RETURN v_result;
END;
$$;

-- ─── 7. Vista: Adherencia por tipo de ciclo ─────────────────

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
