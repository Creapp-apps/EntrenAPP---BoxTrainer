-- ============================================================
-- FIX 026 — Actualizar RLS de cf_exercises para soporte Multi-tenant
-- Permite que los Profesores vean y creen ejercicios de CrossFit
-- referenciando el Box de su Entrenador.
-- ============================================================

-- Remover la restricción estricta de auth.uid() del entrenador para cf_exercises
DROP POLICY IF EXISTS "trainer_manages_cf_exercises" ON public.cf_exercises;

CREATE POLICY "box_staff_manages_cf_exercises" ON public.cf_exercises FOR ALL
  USING (public.can_access_trainer_data(trainer_id))
  WITH CHECK (public.can_access_trainer_data(trainer_id));

-- Forzar que cualquier profesor que cree un cf_exercise,
-- se asigne automáticamente al trainer_id del Entrenador principal del BOX
DROP TRIGGER IF EXISTS trg_enforce_owner_cf_exercises ON public.cf_exercises;

CREATE TRIGGER trg_enforce_owner_cf_exercises BEFORE INSERT ON public.cf_exercises
  FOR EACH ROW EXECUTE FUNCTION public.trg_enforce_box_owner();
