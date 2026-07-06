-- ============================================================
-- MIGRATION 047 — Expansion of Trainer Metrics Suite
-- Defines functions for: Load & Fatigue, Inactivity Alerts, and Box Attendance
-- ============================================================

-- 1. Get List of Inactive Students
CREATE OR REPLACE FUNCTION public.student_inactivity_list(p_trainer_id uuid)
RETURNS TABLE(
  student_id uuid,
  student_name text,
  last_training_date date,
  days_inactive integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_actual_trainer_id uuid;
  v_box_id uuid;
BEGIN
  -- Resolve box owner ID
  v_actual_trainer_id := public.get_box_owner_id(p_trainer_id);
  SELECT box_id INTO v_box_id FROM public.users WHERE id = v_actual_trainer_id;

  RETURN QUERY
  SELECT
    u.id AS student_id,
    u.full_name AS student_name,
    max(sl.date) AS last_training_date,
    (CURRENT_DATE - COALESCE(max(sl.date), u.created_at::date))::integer AS days_inactive
  FROM public.users u
  LEFT JOIN public.session_logs sl ON sl.student_id = u.id AND sl.completed = true
  WHERE u.box_id = v_box_id 
    AND u.role = 'student' 
    AND u.active = true
  GROUP BY u.id, u.full_name, u.created_at
  ORDER BY days_inactive DESC;
END;
$$;


-- 2. Get Weekly Load vs Fatigue (RPE) for a Student (with workouts breakdown)
DROP FUNCTION IF EXISTS public.student_weekly_load_fatigue(uuid, integer);
CREATE OR REPLACE FUNCTION public.student_weekly_load_fatigue(
  p_student_id uuid, 
  p_weeks integer DEFAULT 8
)
RETURNS TABLE(
  week_start_date date,
  total_tonnage numeric,
  completed_workouts integer,
  avg_real_rpe numeric,
  avg_planned_rpe numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH weeks_series AS (
    -- Generate series of week start dates (Mondays) for the last p_weeks
    SELECT (date_trunc('week', CURRENT_DATE) - (i * INTERVAL '1 week'))::date AS ws_date
    FROM generate_series(0, p_weeks - 1) i
  ),
  weekly_completed_logs AS (
    -- Compute weekly volume, session count and real RPE from session_logs and exercise_logs
    SELECT
      (date_trunc('week', sl.date))::date AS ws_date,
      SUM(COALESCE(el.weight_used_kg * COALESCE(el.sets_completed, 1) * COALESCE(el.reps_completed::int, 1), 0)) AS tonnage,
      count(DISTINCT sl.id)::integer AS workouts_count,
      AVG(sl.rpe_overall) AS avg_real_rpe
    FROM public.session_logs sl
    LEFT JOIN public.exercise_logs el ON el.session_log_id = sl.id
    WHERE sl.student_id = p_student_id 
      AND sl.completed = true
      AND sl.date >= CURRENT_DATE - (p_weeks * INTERVAL '1 week')
    GROUP BY ws_date
  ),
  weekly_planned_rpe AS (
    -- Compute weekly planned RPE from training cycles, weeks, days, blocks, exercises
    SELECT
      (date_trunc('week', c.start_date + (w.week_number - 1) * INTERVAL '1 week'))::date AS ws_date,
      AVG(te.rpe_target) AS avg_planned_rpe
    FROM public.training_cycles c
    JOIN public.training_cycle_enrollments tce ON tce.cycle_id = c.id
    JOIN public.training_weeks w ON w.cycle_id = c.id
    JOIN public.training_days d ON d.week_id = w.id
    JOIN public.training_blocks b ON b.day_id = d.id
    JOIN public.training_exercises te ON te.block_id = b.id
    WHERE tce.student_id = p_student_id 
      AND tce.active = true 
      AND c.active = true
      AND te.rpe_target IS NOT NULL
    GROUP BY ws_date
  )
  SELECT
    ws.ws_date AS week_start_date,
    COALESCE(cl.tonnage, 0) AS total_tonnage,
    COALESCE(cl.workouts_count, 0) AS completed_workouts,
    ROUND(COALESCE(cl.avg_real_rpe, 0)::numeric, 1) AS avg_real_rpe,
    ROUND(COALESCE(pr.avg_planned_rpe, 0)::numeric, 1) AS avg_planned_rpe
  FROM weeks_series ws
  LEFT JOIN weekly_completed_logs cl ON cl.ws_date = ws.ws_date
  LEFT JOIN weekly_planned_rpe pr ON pr.ws_date = ws.ws_date
  ORDER BY week_start_date ASC;
END;
$$;


-- 3. Get Box Attendance Statistics
CREATE OR REPLACE FUNCTION public.box_attendance_stats(
  p_trainer_id uuid,
  p_days integer DEFAULT 30
)
RETURNS TABLE(
  booking_date date,
  present_count bigint,
  no_show_count bigint,
  cancelled_count bigint
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
  SELECT
    b.booking_date,
    count(*) FILTER (WHERE b.status = 'completada' OR (b.status = 'confirmada' AND b.booking_date < CURRENT_DATE)) AS present_count,
    count(*) FILTER (WHERE b.status = 'no_show') AS no_show_count,
    count(*) FILTER (WHERE b.status = 'cancelada') AS cancelled_count
  FROM public.bookings b
  JOIN public.users u ON u.id = b.student_id
  WHERE u.box_id = v_box_id
    AND b.booking_date >= CURRENT_DATE - p_days * INTERVAL '1 day'
  GROUP BY b.booking_date
  ORDER BY b.booking_date ASC;
END;
$$;


-- 4. Get Individual Student Attendance Statistics and Log
CREATE OR REPLACE FUNCTION public.student_attendance_stats(
  p_student_id uuid,
  p_days integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_present bigint;
  v_no_show bigint;
  v_cancelled bigint;
  v_bookings jsonb;
  v_result jsonb;
BEGIN
  -- Count statuses (treating past confirmed bookings as completed)
  SELECT
    count(*) FILTER (WHERE status = 'completada' OR (status = 'confirmada' AND booking_date < CURRENT_DATE)),
    count(*) FILTER (WHERE status = 'no_show'),
    count(*) FILTER (WHERE status = 'cancelada')
  INTO v_present, v_no_show, v_cancelled
  FROM public.bookings
  WHERE student_id = p_student_id
    AND booking_date >= CURRENT_DATE - p_days * INTERVAL '1 day';

  -- Fetch last 15 booking records with slots info
  SELECT COALESCE(jsonb_agg(b_row), '[]'::jsonb)
  INTO v_bookings
  FROM (
    SELECT jsonb_build_object(
      'id', b.id,
      'booking_date', b.booking_date,
      'status', b.status,
      'slot_label', s.label,
      'start_time', s.start_time,
      'end_time', s.end_time
    ) AS b_row
    FROM public.bookings b
    JOIN public.box_schedule_slots s ON s.id = b.slot_id
    WHERE b.student_id = p_student_id
    ORDER BY b.booking_date DESC, s.start_time DESC
    LIMIT 15
  ) sub;

  v_result := jsonb_build_object(
    'present', COALESCE(v_present, 0),
    'no_show', COALESCE(v_no_show, 0),
    'cancelled', COALESCE(v_cancelled, 0),
    'history', v_bookings
  );

  RETURN v_result;
END;
$$;


-- 5. Redefine student_metrics to UNION personal_records and student_one_rm (handling both class PRs and loaded RMs)
CREATE OR REPLACE FUNCTION public.student_metrics(
  p_student_id uuid,
  p_trainer_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_actual_trainer_id uuid;
  v_trainer_box_id uuid;
  v_student_box_id uuid;
  v_total_sessions bigint;
  v_completed_sessions bigint;
  v_prs jsonb;
  v_cf_results jsonb;
  v_tonnage numeric;
  v_result jsonb;
BEGIN
  -- Resolve trainer's box owner and box_id
  v_actual_trainer_id := public.get_box_owner_id(p_trainer_id);
  SELECT box_id INTO v_trainer_box_id FROM public.users WHERE id = v_actual_trainer_id;

  -- Resolve student's box_id
  SELECT box_id INTO v_student_box_id FROM public.users WHERE id = p_student_id;

  -- Verify box alignment
  IF v_trainer_box_id IS NULL OR v_student_box_id IS NULL OR v_trainer_box_id <> v_student_box_id THEN
    RAISE EXCEPTION 'Alumno no encontrado o sin permisos';
  END IF;

  -- Adherencia total
  SELECT
    count(*),
    count(*) FILTER (WHERE completed = true)
  INTO v_total_sessions, v_completed_sessions
  FROM public.session_logs
  WHERE student_id = p_student_id;

  -- PRs/RMs actuales (último RM/PR por ejercicio)
  SELECT jsonb_agg(pr_row ORDER BY pr_row->>'exercise_name')
  INTO v_prs
  FROM (
    SELECT DISTINCT ON (exercise_id)
      jsonb_build_object(
        'exercise_id', exercise_id,
        'exercise_name', exercise_name,
        'weight_kg', weight_kg,
        'reps', reps,
        'date', date,
        'verified', verified
      ) AS pr_row
    FROM (
      -- 1. PRs de la tabla personal_records
      SELECT 
        pr.exercise_id, 
        e.name AS exercise_name, 
        pr.weight_kg, 
        pr.reps, 
        pr.date, 
        pr.verified_by_trainer AS verified
      FROM public.personal_records pr
      JOIN public.exercises e ON e.id = pr.exercise_id
      WHERE pr.student_id = p_student_id

      UNION ALL

      -- 2. RMs de la tabla student_one_rm
      SELECT 
        rm.exercise_id, 
        e.name AS exercise_name, 
        rm.weight_kg, 
        1 AS reps, 
        rm.recorded_at AS date, 
        true AS verified
      FROM public.student_one_rm rm
      JOIN public.exercises e ON e.id = rm.exercise_id
      WHERE rm.student_id = p_student_id
    ) union_prs
    ORDER BY exercise_id, date DESC
  ) sub;

  -- Tonelaje últimos 30 días (Using correct column names)
  SELECT COALESCE(SUM(el.weight_used_kg * COALESCE(el.sets_completed, 1) * COALESCE(el.reps_completed::int, 1)), 0)
  INTO v_tonnage
  FROM public.exercise_logs el
  JOIN public.session_logs sl ON sl.id = el.session_log_id
  WHERE sl.student_id = p_student_id
    AND sl.date >= CURRENT_DATE - INTERVAL '30 days'
    AND el.weight_used_kg IS NOT NULL;

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


-- 6. Update RLS policy for exercise_logs to support multitenancy
DROP POLICY IF EXISTS "access_exercise_logs" ON public.exercise_logs;
CREATE POLICY "access_exercise_logs" ON public.exercise_logs FOR ALL
  USING (
    exists (
      select 1 from public.session_logs s
      where s.id = session_log_id and (
        s.student_id = auth.uid() or
        public.can_access_student_data(s.student_id)
      )
    )
  );
