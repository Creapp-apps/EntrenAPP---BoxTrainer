-- ============================================================
-- MIGRATION 037 — Fix Cycle Policies and Drop Student ID
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- ─── 1. Recreate can_access_cycle ───────────────────────────────
CREATE OR REPLACE FUNCTION public.can_access_cycle(c_trainer_id uuid, c_cycle_id uuid)
RETURNS boolean AS $$
BEGIN
  IF c_trainer_id = auth.uid() THEN RETURN true; END IF;
  IF public.get_my_role() = 'super_admin' THEN RETURN true; END IF;
  
  -- Check if user is enrolled
  IF EXISTS (
    SELECT 1 FROM public.training_cycle_enrollments
    WHERE cycle_id = c_cycle_id AND student_id = auth.uid() AND active = true
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ─── 2. Recreate View adherence_by_cycle_type ───────────────────
DROP VIEW IF EXISTS public.adherence_by_cycle_type;

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
JOIN public.training_cycle_enrollments e ON e.cycle_id = c.id
JOIN public.training_weeks w ON w.cycle_id = c.id
JOIN public.training_days d ON d.week_id = w.id
LEFT JOIN public.session_logs sl ON sl.training_day_id = d.id AND sl.student_id = e.student_id
WHERE c.active = true AND c.is_template = false AND e.active = true
GROUP BY c.trainer_id, COALESCE(c.cycle_type, 'strength');

ALTER VIEW public.adherence_by_cycle_type SET (security_invoker = true);


-- ─── 3. Recreate Policies to use enrollments instead of student_id
DROP POLICY IF EXISTS "student_reads_own_cycle" ON public.training_cycles;
CREATE POLICY "student_reads_own_cycle" ON public.training_cycles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.training_cycle_enrollments e
      WHERE e.cycle_id = id AND e.student_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "access_training_weeks" ON public.training_weeks;
CREATE POLICY "access_training_weeks" ON public.training_weeks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.training_cycles c
      WHERE c.id = cycle_id AND public.can_access_cycle(c.trainer_id, c.id)
    )
  );

DROP POLICY IF EXISTS "access_training_days" ON public.training_days;
CREATE POLICY "access_training_days" ON public.training_days FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.training_weeks w
      JOIN public.training_cycles c ON c.id = w.cycle_id
      WHERE w.id = week_id AND public.can_access_cycle(c.trainer_id, c.id)
    )
  );

DROP POLICY IF EXISTS "access_training_blocks" ON public.training_blocks;
CREATE POLICY "access_training_blocks" ON public.training_blocks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.training_days d
      JOIN public.training_weeks w ON w.id = d.week_id
      JOIN public.training_cycles c ON c.id = w.cycle_id
      WHERE d.id = day_id AND public.can_access_cycle(c.trainer_id, c.id)
    )
  );

DROP POLICY IF EXISTS "access_training_exercises" ON public.training_exercises;
CREATE POLICY "access_training_exercises" ON public.training_exercises FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.training_blocks b
      JOIN public.training_days d ON d.id = b.day_id
      JOIN public.training_weeks w ON w.id = d.week_id
      JOIN public.training_cycles c ON c.id = w.cycle_id
      WHERE b.id = block_id AND public.can_access_cycle(c.trainer_id, c.id)
    )
  );

DROP POLICY IF EXISTS "student_read_complex_sets" ON public.training_complex_sets;
DROP POLICY IF EXISTS "access_training_complex_sets" ON public.training_complex_sets;
CREATE POLICY "access_training_complex_sets" ON public.training_complex_sets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.training_days d
      JOIN public.training_weeks w ON w.id = d.week_id
      JOIN public.training_cycles c ON c.id = w.cycle_id
      WHERE d.id = day_id AND public.can_access_cycle(c.trainer_id, c.id)
    )
  );

DROP POLICY IF EXISTS "access_cf_block_exercises" ON public.cf_block_exercises;
CREATE POLICY "access_cf_block_exercises" ON public.cf_block_exercises FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.training_blocks b
      JOIN public.training_days d ON d.id = b.day_id
      JOIN public.training_weeks w ON w.id = d.week_id
      JOIN public.training_cycles c ON c.id = w.cycle_id
      WHERE b.id = block_id AND public.can_access_cycle(c.trainer_id, c.id)
    )
  );

DROP POLICY IF EXISTS "access_cf_wod_levels" ON public.cf_wod_levels;
CREATE POLICY "access_cf_wod_levels" ON public.cf_wod_levels FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.cf_block_exercises be
      JOIN public.training_blocks b ON b.id = be.block_id
      JOIN public.training_days d ON d.id = b.day_id
      JOIN public.training_weeks w ON w.id = d.week_id
      JOIN public.training_cycles c ON c.id = w.cycle_id
      WHERE be.id = block_exercise_id AND public.can_access_cycle(c.trainer_id, c.id)
    )
  );


-- ─── 4. DROP COLUMN student_id with CASCADE to remove any remaining dependent policies ───
ALTER TABLE public.training_cycles DROP COLUMN student_id CASCADE;
