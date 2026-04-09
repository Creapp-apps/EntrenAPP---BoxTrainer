-- ============================================================
-- FIX 024 — Multitenancy para RPCs (Dashboard, Horarios, Métricas)
-- Hace que si un Profesor llama al RPC, obtenga la información 
-- del Entrenador (Owner del Box) automáticamente.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_box_owner_id(p_user_id uuid)
RETURNS uuid AS $$
DECLARE
  v_role text;
  v_box_id uuid;
  v_owner_id uuid;
BEGIN
  -- Obtain role and box_id for the requesting user
  SELECT role, box_id INTO v_role, v_box_id FROM public.users WHERE id = p_user_id;
  
  -- If user is already the trainer or admin, use their own ID
  IF v_role IN ('trainer', 'admin') THEN
    RETURN p_user_id;
  END IF;

  -- If user is a professor/co_trainer, find the trainer of their box
  IF v_role IN ('professor', 'co_trainer') THEN
    SELECT id INTO v_owner_id FROM public.users 
    WHERE box_id = v_box_id AND role = 'trainer' 
    LIMIT 1;
    
    IF v_owner_id IS NOT NULL THEN
      RETURN v_owner_id;
    END IF;
  END IF;

  -- Fallback
  RETURN p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 1. Actualizar get_available_slots
CREATE OR REPLACE FUNCTION public.get_available_slots(
  p_trainer_id uuid,
  p_date date
)
RETURNS TABLE (
  slot_id uuid,
  day_of_week integer,
  start_time time without time zone,
  end_time time without time zone,
  max_capacity integer,
  label text,
  current_bookings bigint,
  spots_available bigint,
  activity_id uuid,
  activity_name text,
  activity_color text
) AS $$
DECLARE
  v_actual_trainer_id uuid;
BEGIN
  v_actual_trainer_id := public.get_box_owner_id(p_trainer_id);

  RETURN QUERY
  SELECT
    s.id AS slot_id,
    s.day_of_week,
    s.start_time,
    s.end_time,
    s.max_capacity,
    s.label,
    COUNT(b.id) AS current_bookings,
    (s.max_capacity - COUNT(b.id))::bigint AS spots_available,
    s.activity_id,
    a.name AS activity_name,
    a.color AS activity_color
  FROM public.box_schedule_slots s
  LEFT JOIN public.bookings b 
    ON b.slot_id = s.id 
    AND b.booking_date = p_date 
    AND b.status = 'confirmada'
  LEFT JOIN public.box_activities a 
    ON a.id = s.activity_id
  WHERE s.trainer_id = v_actual_trainer_id
    AND s.active = true
    AND s.day_of_week = CASE EXTRACT(dow FROM p_date)
      WHEN 0 THEN 7
      ELSE EXTRACT(dow FROM p_date)::integer
    END
    AND NOT EXISTS (
      SELECT 1 FROM public.box_blocked_dates bd
      WHERE bd.trainer_id = v_actual_trainer_id AND bd.blocked_date = p_date
    )
  GROUP BY 
    s.id, s.day_of_week, s.start_time, s.end_time, 
    s.max_capacity, s.label, s.activity_id, a.name, a.color
  ORDER BY s.start_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Actualizar trainer_dashboard_stats
CREATE OR REPLACE FUNCTION public.trainer_dashboard_stats(p_trainer_id uuid)
RETURNS json AS $$
DECLARE
  v_actual_trainer_id uuid;
  result json;
  v_total_students integer;
  v_active_students integer;
  v_overdue_payments integer;
  v_monthly_revenue numeric;
  v_today_bookings integer;
BEGIN
  v_actual_trainer_id := public.get_box_owner_id(p_trainer_id);

  -- 1. Total alumnos
  SELECT COUNT(*) INTO v_total_students
  FROM public.users
  WHERE role = 'student' 
    AND box_id = (SELECT box_id FROM public.users WHERE id = v_actual_trainer_id)
    AND active = true;

  -- 2. Alumnos activos (con suscripción vigente)
  SELECT COUNT(DISTINCT student_id) INTO v_active_students
  FROM public.student_plan_subscriptions
  WHERE status = 'activo'
    AND student_id IN (
      SELECT id FROM public.users 
      WHERE role = 'student' 
        AND box_id = (SELECT box_id FROM public.users WHERE id = v_actual_trainer_id)
    );

  -- 3. Pagos vencidos
  SELECT COUNT(*) INTO v_overdue_payments
  FROM public.student_payments
  WHERE trainer_id = v_actual_trainer_id AND status = 'vencido';

  -- 4. Ingresos del mes
  SELECT COALESCE(SUM(amount), 0) INTO v_monthly_revenue
  FROM public.student_payments
  WHERE trainer_id = v_actual_trainer_id
    AND status = 'pagado'
    AND paid_at >= date_trunc('month', current_date);

  -- 5. Turnos de hoy
  SELECT COUNT(*) INTO v_today_bookings
  FROM public.bookings b
  JOIN public.box_schedule_slots s ON s.id = b.slot_id
  WHERE s.trainer_id = v_actual_trainer_id
    AND b.booking_date = current_date
    AND b.status = 'confirmada';

  result := json_build_object(
    'totalStudents', v_total_students,
    'activeStudents', v_active_students,
    'overduePayments', v_overdue_payments,
    'monthlyRevenue', v_monthly_revenue,
    'todayBookings', v_today_bookings
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
