-- ============================================================
-- MIGRATION 045 — Fix RLS circular dependency for exercises table
-- ============================================================

-- 1. Create a helper function with SECURITY DEFINER privileges to bypass RLS checks
--    when validating if a trainer belongs to the student's box.
CREATE OR REPLACE FUNCTION public.is_trainer_in_my_box(p_trainer_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = p_trainer_id
      AND u.role IN ('trainer', 'professor', 'co_trainer', 'admin')
      AND u.box_id = (SELECT box_id FROM public.users WHERE id = auth.uid())
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 2. Drop the old problematic students policy
DROP POLICY IF EXISTS "students_read_exercises" ON public.exercises;

-- 3. Recreate it using the SECURITY DEFINER function to prevent RLS circular dependencies
CREATE POLICY "students_read_exercises" ON public.exercises FOR SELECT
  USING (
    public.get_my_role() = 'student'
    AND public.is_trainer_in_my_box(trainer_id)
  );
