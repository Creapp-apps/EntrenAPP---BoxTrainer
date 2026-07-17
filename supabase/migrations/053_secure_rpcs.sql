-- ============================================================
-- MIGRATION 053 — Secure Public RPCs (Stored Procedures)
-- ============================================================

-- 1. Secure make_booking
DROP FUNCTION IF EXISTS public.make_booking(uuid, uuid, date);

CREATE OR REPLACE FUNCTION public.make_booking(
  p_student_id uuid,
  p_slot_id uuid,
  p_date date
)
RETURNS uuid AS $$
DECLARE
  v_booking_id uuid;
  v_subscription_id uuid;
  v_trainer_id uuid;
  v_max_capacity integer;
  v_current_count integer;
  v_student_modality text;
  v_slot_activity_id uuid;
BEGIN
  -- 🛡️ Auth Check: Solo el alumno propietario o staff del mismo box pueden reservar
  IF auth.uid() <> p_student_id THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.users caller
      JOIN public.users target ON target.id = p_student_id
      WHERE caller.id = auth.uid()
        AND caller.role IN ('trainer', 'professor', 'co_trainer', 'admin')
        AND caller.box_id = target.box_id
    ) AND NOT EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'
    ) THEN
      RAISE EXCEPTION 'No tenés permisos para realizar esta reserva';
    END IF;
  END IF;

  -- Verificar modalidad del alumno
  SELECT modality INTO v_student_modality
  FROM public.users WHERE id = p_student_id;

  IF v_student_modality = 'a_distancia' THEN
    RAISE EXCEPTION 'Los alumnos a distancia no pueden reservar turnos presenciales';
  END IF;

  -- Obtener trainer_id, capacidad y actividad del slot
  SELECT trainer_id, max_capacity, activity_id
  INTO v_trainer_id, v_max_capacity, v_slot_activity_id
  FROM public.box_schedule_slots WHERE id = p_slot_id AND active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El horario seleccionado no existe o no está activo';
  END IF;

  -- Verificar que no es fecha bloqueada
  IF EXISTS (
    SELECT 1 FROM public.box_blocked_dates
    WHERE trainer_id = v_trainer_id AND blocked_date = p_date
  ) THEN
    RAISE EXCEPTION 'Esta fecha está bloqueada por el entrenador';
  END IF;

  -- Verificar capacidad
  SELECT COUNT(*) INTO v_current_count
  FROM public.bookings
  WHERE slot_id = p_slot_id AND booking_date = p_date AND status = 'confirmada';

  IF v_current_count >= v_max_capacity THEN
    RAISE EXCEPTION 'No hay cupo disponible en este horario';
  END IF;

  -- Verificar reserva duplicada
  IF EXISTS (
    SELECT 1 FROM public.bookings
    WHERE student_id = p_student_id AND slot_id = p_slot_id
      AND booking_date = p_date AND status = 'confirmada'
  ) THEN
    RAISE EXCEPTION 'Ya tenés una reserva en este horario';
  END IF;

  -- Buscar suscripción activa con créditos Y que permita la actividad del slot
  SELECT id INTO v_subscription_id
  FROM public.student_plan_subscriptions sps
  JOIN public.plans pl ON pl.id = sps.plan_id
  WHERE sps.student_id = p_student_id
    AND sps.status = 'activo'
    AND p_date BETWEEN sps.period_start AND sps.period_end
    AND sps.credits_used < sps.credits_total
    AND (
      -- Plan cubre la actividad del slot, o el slot no tiene actividad
      v_slot_activity_id IS NULL
      OR v_slot_activity_id = ANY(pl.allowed_activities)
      OR pl.allowed_activities = '{}'
    )
  ORDER BY sps.period_start DESC
  LIMIT 1;

  IF v_subscription_id IS NULL THEN
    RAISE EXCEPTION 'No tenés créditos disponibles para esta actividad. Contactá a tu entrenador.';
  END IF;

  -- Crear la reserva
  INSERT INTO public.bookings (student_id, slot_id, subscription_id, booking_date)
  VALUES (p_student_id, p_slot_id, v_subscription_id, p_date)
  RETURNING id INTO v_booking_id;

  -- Consumir 1 crédito
  UPDATE public.student_plan_subscriptions
  SET credits_used = credits_used + 1
  WHERE id = v_subscription_id;

  RETURN v_booking_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Secure cancel_booking
DROP FUNCTION IF EXISTS public.cancel_booking(uuid, text);

CREATE OR REPLACE FUNCTION public.cancel_booking(
  p_booking_id uuid,
  p_reason text default null
)
RETURNS boolean AS $$
DECLARE
  v_booking record;
  v_cancel_hours integer;
  v_trainer_id uuid;
  v_hours_until numeric;
BEGIN
  -- Obtener la reserva
  SELECT b.*, s.trainer_id, s.start_time
  INTO v_booking
  FROM public.bookings b
  JOIN public.box_schedule_slots s ON s.id = b.slot_id
  WHERE b.id = p_booking_id AND b.status = 'confirmada';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reserva no encontrada o ya cancelada';
  END IF;

  -- 🛡️ Auth Check: Solo el alumno propietario o staff del mismo box pueden cancelar
  IF auth.uid() <> v_booking.student_id THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.users caller
      JOIN public.users target ON target.id = v_booking.student_id
      WHERE caller.id = auth.uid()
        AND caller.role IN ('trainer', 'professor', 'co_trainer', 'admin')
        AND caller.box_id = target.box_id
    ) AND NOT EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'
    ) THEN
      RAISE EXCEPTION 'No tenés permisos para cancelar esta reserva';
    END IF;
  END IF;

  v_trainer_id := v_booking.trainer_id;

  -- Obtener política de cancelación
  SELECT COALESCE(cancel_hours_before, 12) INTO v_cancel_hours
  FROM public.trainer_settings WHERE trainer_id = v_trainer_id;
  
  IF v_cancel_hours IS NULL THEN v_cancel_hours := 12; END IF;

  -- Calcular horas hasta la clase
  v_hours_until := EXTRACT(epoch FROM (
    (v_booking.booking_date + v_booking.start_time) - NOW()
  )) / 3600;

  -- Cancelar la reserva
  UPDATE public.bookings
  SET status = 'cancelada',
      cancelled_at = NOW(),
      cancel_reason = p_reason
  WHERE id = p_booking_id;

  -- Devolver crédito si cancela a tiempo
  IF v_hours_until >= v_cancel_hours AND v_booking.subscription_id IS NOT NULL THEN
    UPDATE public.student_plan_subscriptions
    SET credits_used = GREATEST(0, credits_used - 1)
    WHERE id = v_booking.subscription_id;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Secure trainer_dashboard_stats
DROP FUNCTION IF EXISTS public.trainer_dashboard_stats(uuid);

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

  -- 🛡️ Auth Check: Solo el propio entrenador, staff del mismo box o super_admin
  IF auth.uid() <> v_actual_trainer_id THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'
    ) AND NOT EXISTS (
      SELECT 1 FROM public.users caller
      JOIN public.users owner ON owner.id = v_actual_trainer_id
      WHERE caller.id = auth.uid()
        AND caller.role IN ('trainer', 'professor', 'co_trainer', 'admin')
        AND caller.box_id = owner.box_id
    ) THEN
      RAISE EXCEPTION 'No tenés permisos para consultar estas estadísticas';
    END IF;
  END IF;

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


-- 4. Secure student_adherence_list
DROP FUNCTION IF EXISTS public.student_adherence_list(uuid, int);

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
  -- 🛡️ Auth Check: Solo el propio entrenador, staff del mismo box o super_admin
  IF auth.uid() <> p_trainer_id THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'
    ) AND NOT EXISTS (
      SELECT 1 FROM public.users caller
      JOIN public.users owner ON owner.id = p_trainer_id
      WHERE caller.id = auth.uid()
        AND caller.role IN ('trainer', 'professor', 'co_trainer', 'admin')
        AND caller.box_id = owner.box_id
    ) THEN
      RAISE EXCEPTION 'No tenés permisos para consultar la adherencia';
    END IF;
  END IF;

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


-- 5. Secure enroll_student
DROP FUNCTION IF EXISTS public.enroll_student(uuid, uuid, text, timestamptz);

CREATE OR REPLACE FUNCTION public.enroll_student(
  p_cycle_id uuid,
  p_student_id uuid,
  p_sync_mode text,
  p_enrolled_at timestamptz DEFAULT now()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 🛡️ Auth Check: Solo staff del mismo box que el estudiante o super_admin
  IF NOT EXISTS (
    SELECT 1 FROM public.users caller
    JOIN public.users student ON student.id = p_student_id
    WHERE caller.id = auth.uid()
      AND caller.role IN ('trainer', 'professor', 'co_trainer', 'admin')
      AND caller.box_id = student.box_id
  ) AND NOT EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'No tenés permisos para enrolar a este alumno';
  END IF;

  -- Desactivar enrollments anteriores del alumno
  UPDATE public.training_cycle_enrollments
  SET active = false
  WHERE student_id = p_student_id;

  -- Insertar nuevo enrollment
  INSERT INTO public.training_cycle_enrollments (cycle_id, student_id, sync_mode, active, enrolled_at)
  VALUES (p_cycle_id, p_student_id, p_sync_mode, true, p_enrolled_at)
  ON CONFLICT (cycle_id, student_id) DO UPDATE 
  SET active = true, sync_mode = EXCLUDED.sync_mode, enrolled_at = EXCLUDED.enrolled_at;
END;
$$;
