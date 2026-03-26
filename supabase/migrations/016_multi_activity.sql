-- ============================================================
-- MIGRATION 016 — Sistema Multi-Actividad para Tu Box
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- ─── 1. TABLA: Actividades del Box ──────────────────────────

CREATE TABLE IF NOT EXISTS public.box_activities (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  trainer_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3b82f6',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(trainer_id, name)
);

ALTER TABLE public.box_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trainer_manages_activities" ON public.box_activities FOR ALL
  USING (trainer_id = auth.uid());

CREATE POLICY "students_read_activities" ON public.box_activities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'student' AND created_by = box_activities.trainer_id
    )
  );

-- ─── 2. Seed default activities per trainer ─────────────────

INSERT INTO public.box_activities (trainer_id, name, color)
SELECT u.id, a.name, a.color
FROM public.users u
CROSS JOIN (VALUES
  ('Pesas',        '#3b82f6'),
  ('CrossFit',     '#ea580c'),
  ('Prep Física',  '#16a34a')
) AS a(name, color)
WHERE u.role = 'trainer'
ON CONFLICT (trainer_id, name) DO NOTHING;

-- ─── 3. ALTER: Agregar activity_id a slots ──────────────────

ALTER TABLE public.box_schedule_slots
  ADD COLUMN IF NOT EXISTS activity_id uuid REFERENCES public.box_activities(id) ON DELETE SET NULL;

-- Backfill: asignar "Pesas" a todos los slots existentes
UPDATE public.box_schedule_slots s
SET activity_id = (
  SELECT ba.id FROM public.box_activities ba
  WHERE ba.trainer_id = s.trainer_id AND ba.name = 'Pesas'
  LIMIT 1
)
WHERE s.activity_id IS NULL;

-- ─── 4. ALTER: Agregar allowed_activities a plans ───────────

ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS allowed_activities uuid[] DEFAULT '{}';

-- Backfill: asignar "Pesas" a todos los plans existentes
UPDATE public.plans p
SET allowed_activities = ARRAY[(
  SELECT ba.id FROM public.box_activities ba
  WHERE ba.trainer_id = p.trainer_id AND ba.name = 'Pesas'
  LIMIT 1
)]
WHERE allowed_activities = '{}' OR allowed_activities IS NULL;

-- ─── 5. INDEX ───────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_box_activities_trainer ON public.box_activities(trainer_id);
CREATE INDEX IF NOT EXISTS idx_slots_activity ON public.box_schedule_slots(activity_id);

-- ─── 6. UPDATE: get_available_slots — ahora retorna actividad ─

DROP FUNCTION IF EXISTS public.get_available_slots(uuid, date);

CREATE OR REPLACE FUNCTION public.get_available_slots(
  p_trainer_id uuid,
  p_date date
)
RETURNS TABLE (
  slot_id uuid,
  day_of_week integer,
  start_time time,
  end_time time,
  max_capacity integer,
  label text,
  activity_id uuid,
  activity_name text,
  activity_color text,
  current_bookings bigint,
  spots_available bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id AS slot_id,
    s.day_of_week,
    s.start_time,
    s.end_time,
    s.max_capacity,
    s.label,
    s.activity_id,
    COALESCE(ba.name, 'General') AS activity_name,
    COALESCE(ba.color, '#6b7280') AS activity_color,
    COUNT(b.id) AS current_bookings,
    (s.max_capacity - COUNT(b.id))::bigint AS spots_available
  FROM public.box_schedule_slots s
  LEFT JOIN public.box_activities ba ON ba.id = s.activity_id
  LEFT JOIN public.bookings b
    ON b.slot_id = s.id
    AND b.booking_date = p_date
    AND b.status = 'confirmada'
  WHERE s.trainer_id = p_trainer_id
    AND s.active = true
    AND s.day_of_week = CASE EXTRACT(DOW FROM p_date)
      WHEN 0 THEN 7
      ELSE EXTRACT(DOW FROM p_date)::integer
    END
    AND NOT EXISTS (
      SELECT 1 FROM public.box_blocked_dates bd
      WHERE bd.trainer_id = p_trainer_id AND bd.blocked_date = p_date
    )
  GROUP BY s.id, s.day_of_week, s.start_time, s.end_time, s.max_capacity, s.label,
           s.activity_id, ba.name, ba.color
  ORDER BY s.start_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 7. UPDATE: make_booking — valida actividad del plan ─────

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
