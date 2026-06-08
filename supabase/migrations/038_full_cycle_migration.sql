-- ============================================================
-- MIGRATION 036 — Cycle Enrollments (1:N)
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- ─── 1. Create Enrollment Table ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.training_cycle_enrollments (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  cycle_id uuid REFERENCES public.training_cycles(id) ON DELETE CASCADE NOT NULL,
  student_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  enrolled_at timestamptz DEFAULT now(),
  sync_mode text NOT NULL DEFAULT 'SYNC' CHECK (sync_mode IN ('SYNC', 'ASYNC')),
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE (cycle_id, student_id)
);

-- RLS
ALTER TABLE public.training_cycle_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trainers_manage_enrollments" ON public.training_cycle_enrollments FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.training_cycles tc
    WHERE tc.id = training_cycle_enrollments.cycle_id AND tc.trainer_id = auth.uid()
  )
);

CREATE POLICY "students_read_enrollments" ON public.training_cycle_enrollments FOR SELECT
USING (student_id = auth.uid());


-- ─── 2. Data Migration: Group duplicated cycles ─────────────────
DO $$ 
DECLARE
    r RECORD;
    v_master_cycle_id uuid;
BEGIN
    -- For each cycle that has a student assigned
    FOR r IN 
        SELECT id, trainer_id, student_id, name, template_id, start_date 
        FROM public.training_cycles 
        WHERE student_id IS NOT NULL AND is_template = false
    LOOP
        -- Determine master cycle. Try to use template_id if it exists
        IF r.template_id IS NOT NULL THEN
            -- Check if the template exists
            SELECT id INTO v_master_cycle_id FROM public.training_cycles WHERE id = r.template_id;
        ELSE
            v_master_cycle_id := NULL;
        END IF;

        -- If no template, try to find another non-template cycle with the same name and trainer created earlier
        IF v_master_cycle_id IS NULL THEN
            SELECT id INTO v_master_cycle_id 
            FROM public.training_cycles 
            WHERE trainer_id = r.trainer_id 
              AND name = r.name 
              AND is_template = false 
              AND student_id IS NULL
            ORDER BY created_at ASC 
            LIMIT 1;
        END IF;

        -- If STILL no master found, make this one the master by removing its student_id
        IF v_master_cycle_id IS NULL THEN
            UPDATE public.training_cycles SET student_id = NULL WHERE id = r.id;
            v_master_cycle_id := r.id;
        END IF;

        -- Create enrollment
        INSERT INTO public.training_cycle_enrollments (cycle_id, student_id, enrolled_at, sync_mode, active)
        VALUES (v_master_cycle_id, r.student_id, r.start_date::timestamp, 'SYNC', true)
        ON CONFLICT (cycle_id, student_id) DO NOTHING;

        -- If this cycle wasn't made the master, delete it (cascade will drop its weeks/days/exercises)
        IF v_master_cycle_id != r.id THEN
            DELETE FROM public.training_cycles WHERE id = r.id;
        END IF;
    END LOOP;
END $$;

-- We will drop student_id column at the end of the script with CASCADE to prevent dependency errors.


-- ─── 3. Replace copy_cycle to remove student_id ─────────────────
CREATE OR REPLACE FUNCTION public.copy_cycle(
  p_source_cycle_id uuid,
  p_trainer_id       uuid,
  p_name             text,
  p_start_date       date,
  p_is_template      boolean default false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_source        record;
  v_new_cycle_id  uuid;
  v_new_week_id   uuid;
  v_new_day_id    uuid;
  v_new_block_id  uuid;
  v_week          record;
  v_day           record;
  v_block         record;
  v_ex            record;
BEGIN
  -- Verificar que el origen pertenece al trainer
  SELECT * INTO v_source FROM public.training_cycles
  WHERE id = p_source_cycle_id AND trainer_id = p_trainer_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ciclo no encontrado o sin permisos';
  END IF;

  -- Crear ciclo nuevo
  INSERT INTO public.training_cycles (
    trainer_id, name, start_date,
    total_weeks, phase_structure, active,
    is_template, template_id
  ) VALUES (
    p_trainer_id,
    p_name,
    p_start_date,
    v_source.total_weeks,
    v_source.phase_structure,
    CASE WHEN p_is_template THEN false ELSE true END,
    p_is_template,
    CASE WHEN NOT p_is_template THEN p_source_cycle_id ELSE NULL END
  )
  RETURNING id INTO v_new_cycle_id;

  -- Copiar semanas
  FOR v_week IN
    SELECT * FROM public.training_weeks
    WHERE cycle_id = p_source_cycle_id
    ORDER BY week_number
  LOOP
    INSERT INTO public.training_weeks (cycle_id, week_number, type)
    VALUES (v_new_cycle_id, v_week.week_number, v_week.type)
    RETURNING id INTO v_new_week_id;

    -- Copiar días
    FOR v_day IN
      SELECT * FROM public.training_days
      WHERE week_id = v_week.id
      ORDER BY "order"
    LOOP
      INSERT INTO public.training_days (week_id, day_of_week, label, "order", is_rest)
      VALUES (v_new_week_id, v_day.day_of_week, v_day.label, v_day."order", v_day.is_rest)
      RETURNING id INTO v_new_day_id;

      -- Copiar bloques
      FOR v_block IN
        SELECT * FROM public.training_blocks
        WHERE day_id = v_day.id
        ORDER BY "order"
      LOOP
        INSERT INTO public.training_blocks (day_id, name, type, "order")
        VALUES (v_new_day_id, v_block.name, v_block.type, v_block."order")
        RETURNING id INTO v_new_block_id;

        -- Copiar ejercicios
        FOR v_ex IN
          SELECT * FROM public.training_exercises
          WHERE block_id = v_block.id
          ORDER BY "order"
        LOOP
          INSERT INTO public.training_exercises (
            block_id, exercise_id, variant_id,
            sets, reps, weight_target, percentage_1rm,
            rpe_target, rest_seconds, notes, "order",
            complex_id, complex_order
          ) VALUES (
            v_new_block_id,
            v_ex.exercise_id,
            v_ex.variant_id,
            v_ex.sets,
            v_ex.reps,
            v_ex.weight_target,
            v_ex.percentage_1rm,
            v_ex.rpe_target,
            v_ex.rest_seconds,
            v_ex.notes,
            v_ex."order",
            v_ex.complex_id,
            v_ex.complex_order
          );
        END LOOP;
      END LOOP;
    END LOOP;
  END LOOP;

  RETURN v_new_cycle_id;
END;
$$;

-- ─── 4. RPC para enrolar alumno ─────────────────────────────────
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
