-- ============================================================
-- MIGRATION 050 — Fix Global Exercise Variants RLS Policy
-- ============================================================

DROP POLICY IF EXISTS "manage_exercise_variants" ON public.exercise_variants;

-- Allow trainers to manage variants for exercises they own, or exercises that are global (trainer_id IS NULL)
CREATE POLICY "manage_exercise_variants" ON public.exercise_variants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.exercises e
      WHERE e.id = exercise_id
        AND (public.can_access_trainer_data(e.trainer_id) OR e.trainer_id IS NULL)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.exercises e
      WHERE e.id = exercise_id
        AND (public.can_access_trainer_data(e.trainer_id) OR e.trainer_id IS NULL)
    )
  );
