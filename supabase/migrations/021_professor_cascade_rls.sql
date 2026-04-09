-- ============================================================
-- FIX 021 — Permitir a los profesores acceso en cascada
-- a semanas, días, bloques y ejercicios de los ciclos/plantillas.
-- ============================================================

-- helper para no repetir tanto código:
-- check_cycle_access(uuid trainer_id, uuid student_id)
-- Devuelve TRUE si es owner, o si es professor del mismo box.

CREATE OR REPLACE FUNCTION public.can_access_cycle(c_trainer_id uuid, c_student_id uuid)
RETURNS boolean AS $$
BEGIN
  -- Si es el dueño directo o el alumno
  IF c_trainer_id = auth.uid() OR c_student_id = auth.uid() THEN
    RETURN true;
  END IF;

  -- Si es super admin
  IF public.get_my_role() = 'super_admin' THEN
    RETURN true;
  END IF;

  -- Si es un profesor del mismo box que el creador del ciclo
  IF public.get_my_role() = 'professor' AND public.get_my_box_id() = (SELECT box_id FROM public.users WHERE id = c_trainer_id) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ── 1. TRAINING_WEEKS ──
DROP POLICY IF EXISTS "access_training_weeks" ON public.training_weeks;
CREATE POLICY "access_training_weeks" ON public.training_weeks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.training_cycles c
      WHERE c.id = cycle_id AND public.can_access_cycle(c.trainer_id, c.student_id)
    )
  );

-- ── 2. TRAINING_DAYS ──
DROP POLICY IF EXISTS "access_training_days" ON public.training_days;
CREATE POLICY "access_training_days" ON public.training_days FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.training_weeks w
      JOIN public.training_cycles c ON c.id = w.cycle_id
      WHERE w.id = week_id AND public.can_access_cycle(c.trainer_id, c.student_id)
    )
  );

-- ── 3. TRAINING_BLOCKS ──
DROP POLICY IF EXISTS "access_training_blocks" ON public.training_blocks;
CREATE POLICY "access_training_blocks" ON public.training_blocks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.training_days d
      JOIN public.training_weeks w ON w.id = d.week_id
      JOIN public.training_cycles c ON c.id = w.cycle_id
      WHERE d.id = day_id AND public.can_access_cycle(c.trainer_id, c.student_id)
    )
  );

-- ── 4. TRAINING_EXERCISES ──
DROP POLICY IF EXISTS "access_training_exercises" ON public.training_exercises;
CREATE POLICY "access_training_exercises" ON public.training_exercises FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.training_blocks b
      JOIN public.training_days d ON d.id = b.day_id
      JOIN public.training_weeks w ON w.id = d.week_id
      JOIN public.training_cycles c ON c.id = w.cycle_id
      WHERE b.id = block_id AND public.can_access_cycle(c.trainer_id, c.student_id)
    )
  );

-- ── 5. TRAINING_COMPLEX_SETS ──
DROP POLICY IF EXISTS "access_training_complex_sets" ON public.training_complex_sets;
CREATE POLICY "access_training_complex_sets" ON public.training_complex_sets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.training_days d
      JOIN public.training_weeks w ON w.id = d.week_id
      JOIN public.training_cycles c ON c.id = w.cycle_id
      WHERE d.id = day_id AND public.can_access_cycle(c.trainer_id, c.student_id)
    )
  );

-- ── 6. CF_BLOCK_EXERCISES ──
DROP POLICY IF EXISTS "access_cf_block_exercises" ON public.cf_block_exercises;
CREATE POLICY "access_cf_block_exercises" ON public.cf_block_exercises FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.training_blocks b
      JOIN public.training_days d ON d.id = b.day_id
      JOIN public.training_weeks w ON w.id = d.week_id
      JOIN public.training_cycles c ON c.id = w.cycle_id
      WHERE b.id = block_id AND public.can_access_cycle(c.trainer_id, c.student_id)
    )
  );

-- ── 7. CF_WOD_LEVELS ──
DROP POLICY IF EXISTS "access_cf_wod_levels" ON public.cf_wod_levels;
CREATE POLICY "access_cf_wod_levels" ON public.cf_wod_levels FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.cf_block_exercises be
      JOIN public.training_blocks b ON b.id = be.block_id
      JOIN public.training_days d ON d.id = b.day_id
      JOIN public.training_weeks w ON w.id = d.week_id
      JOIN public.training_cycles c ON c.id = w.cycle_id
      WHERE be.id = block_exercise_id AND public.can_access_cycle(c.trainer_id, c.student_id)
    )
  );
