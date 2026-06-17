-- ============================================================
-- MIGRATION 041 — Fix Exercise Variants RLS Policy
-- ============================================================

-- Drop the old overly restrictive policy
DROP POLICY IF EXISTS "access_exercise_variants" ON public.exercise_variants;
DROP POLICY IF EXISTS "read_exercise_variants" ON public.exercise_variants;
DROP POLICY IF EXISTS "manage_exercise_variants" ON public.exercise_variants;

-- 1. SELECT Policy: Anyone (staff or student) who can read the parent exercise can see its variants
CREATE POLICY "read_exercise_variants" ON public.exercise_variants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.exercises e
      WHERE e.id = exercise_id
    )
  );

-- 2. WRITE Policy: Only staff who can access the owner trainer's data can manage variants
CREATE POLICY "manage_exercise_variants" ON public.exercise_variants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.exercises e
      WHERE e.id = exercise_id
        AND public.can_access_trainer_data(e.trainer_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.exercises e
      WHERE e.id = exercise_id
        AND public.can_access_trainer_data(e.trainer_id)
    )
  );
