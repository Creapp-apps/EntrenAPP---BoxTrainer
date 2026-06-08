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

-- Drop student_id column as we no longer use it
ALTER TABLE public.training_cycles DROP COLUMN student_id;

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
