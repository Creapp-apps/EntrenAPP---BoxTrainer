-- ============================================================
-- FIX 025 — Forzar que todos los datos creados por el staff
-- (profesores, co-entrenadores) se asocien al Entrenador Principal
-- ============================================================

CREATE OR REPLACE FUNCTION public.trg_enforce_box_owner()
RETURNS trigger AS $$
DECLARE
  v_owner_id uuid;
  -- Recordamos que NEW contiene el row que se está insertando
BEGIN
  -- Obtener el owner id en caso de que sea profesor
  v_owner_id := public.get_box_owner_id(auth.uid());

  -- Si la tabla tiene trainer_id, forzarlo al owner
  IF TG_OP = 'INSERT' THEN
    -- Verificamos que no estemos rompiendo nada si ya venía bien,
    -- pero para asegurar, siempre sobreescribimos con el owner
    NEW.trainer_id := v_owner_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar a las tablas relevantes que usan trainer_id
DROP TRIGGER IF EXISTS trg_enforce_owner_slots ON public.box_schedule_slots;
CREATE TRIGGER trg_enforce_owner_slots BEFORE INSERT ON public.box_schedule_slots
  FOR EACH ROW EXECUTE FUNCTION public.trg_enforce_box_owner();

DROP TRIGGER IF EXISTS trg_enforce_owner_plans ON public.plans;
CREATE TRIGGER trg_enforce_owner_plans BEFORE INSERT ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.trg_enforce_box_owner();

DROP TRIGGER IF EXISTS trg_enforce_owner_cycles ON public.training_cycles;
CREATE TRIGGER trg_enforce_owner_cycles BEFORE INSERT ON public.training_cycles
  FOR EACH ROW EXECUTE FUNCTION public.trg_enforce_box_owner();

DROP TRIGGER IF EXISTS trg_enforce_owner_exercises ON public.exercises;
CREATE TRIGGER trg_enforce_owner_exercises BEFORE INSERT ON public.exercises
  FOR EACH ROW EXECUTE FUNCTION public.trg_enforce_box_owner();

DROP TRIGGER IF EXISTS trg_enforce_owner_activities ON public.box_activities;
CREATE TRIGGER trg_enforce_owner_activities BEFORE INSERT ON public.box_activities
  FOR EACH ROW EXECUTE FUNCTION public.trg_enforce_box_owner();

DROP TRIGGER IF EXISTS trg_enforce_owner_payments ON public.student_payments;
CREATE TRIGGER trg_enforce_owner_payments BEFORE INSERT ON public.student_payments
  FOR EACH ROW EXECUTE FUNCTION public.trg_enforce_box_owner();
