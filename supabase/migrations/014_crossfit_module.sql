-- ============================================================
-- MIGRATION 014 — Módulo CrossFit / Funcional
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- ─── 1. Extender training_blocks con tipos CrossFit ─────────

-- Dropeamos el constraint viejo y lo recreamos con los nuevos tipos
ALTER TABLE public.training_blocks
  DROP CONSTRAINT IF EXISTS training_blocks_type_check;

ALTER TABLE public.training_blocks
  ADD CONSTRAINT training_blocks_type_check
  CHECK (type IN ('fuerza','prep_fisica','custom','warm_up','skill','metcon'));

-- Columnas para WOD config (solo aplican a bloques tipo metcon)
ALTER TABLE public.training_blocks
  ADD COLUMN IF NOT EXISTS wod_type text
    CHECK (wod_type IS NULL OR wod_type IN ('emom','amrap','for_time','tabata','death_by','for_load','chipper'));

ALTER TABLE public.training_blocks
  ADD COLUMN IF NOT EXISTS wod_config jsonb DEFAULT '{}';

-- ─── 2. Nivel CrossFit por alumno ───────────────────────────

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS cf_level text DEFAULT 'scaled'
    CHECK (cf_level IN ('beginner','scaled','rx','athlete'));

-- ─── 3. Tipo de ciclo: fuerza vs crossfit ───────────────────

ALTER TABLE public.training_cycles
  ADD COLUMN IF NOT EXISTS cycle_type text DEFAULT 'strength'
    CHECK (cycle_type IN ('strength','crossfit'));

-- ─── 4. cf_exercises — Catálogo de movimientos CrossFit ─────

CREATE TABLE IF NOT EXISTS public.cf_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('gymnastics','weightlifting','monostructural','other')),
  default_unit text NOT NULL DEFAULT 'reps'
    CHECK (default_unit IN ('reps','cals','meters','kg','lbs','seconds','distance_m')),
  video_url text,
  archived boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cf_exercises_trainer
  ON public.cf_exercises(trainer_id);

-- ─── 5. cf_block_exercises — Ejercicios en bloques CF ───────

CREATE TABLE IF NOT EXISTS public.cf_block_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id uuid REFERENCES public.training_blocks(id) ON DELETE CASCADE NOT NULL,
  exercise_id uuid REFERENCES public.cf_exercises(id) NOT NULL,
  "order" int DEFAULT 0,
  reps text,              -- "21-15-9", "10", "Max", "30s"
  unit_override text,     -- sobreescribe default_unit si difiere
  notes text
);

CREATE INDEX IF NOT EXISTS idx_cf_block_exercises_block
  ON public.cf_block_exercises(block_id);

-- ─── 6. cf_wod_levels — Peso/Config por nivel ──────────────

CREATE TABLE IF NOT EXISTS public.cf_wod_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  block_exercise_id uuid REFERENCES public.cf_block_exercises(id) ON DELETE CASCADE NOT NULL,
  level text NOT NULL CHECK (level IN ('beginner','scaled','rx','athlete')),
  value text NOT NULL,     -- "60 kg", "Banded Pull Ups", "15 cals"
  notes text,
  UNIQUE(block_exercise_id, level)
);

-- ─── 7. cf_results — Resultados de alumnos ──────────────────

CREATE TABLE IF NOT EXISTS public.cf_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id uuid REFERENCES public.training_blocks(id) ON DELETE CASCADE NOT NULL,
  student_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  day_id uuid REFERENCES public.training_days(id) ON DELETE CASCADE NOT NULL,
  level_used text NOT NULL CHECK (level_used IN ('beginner','scaled','rx','athlete')),
  score_type text NOT NULL CHECK (score_type IN ('time','rounds_reps','weight','total_reps')),
  score_value text NOT NULL,           -- "12:45", "8+12", "95", "150"
  score_seconds int,                   -- Para ordenar tiempos
  score_total_reps int,                -- Para ordenar rounds+reps y total_reps
  rx_completed boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(block_id, student_id, day_id)
);

CREATE INDEX IF NOT EXISTS idx_cf_results_student
  ON public.cf_results(student_id);
CREATE INDEX IF NOT EXISTS idx_cf_results_block
  ON public.cf_results(block_id);

-- ─── 8. cf_block_templates — Plantillas de bloques ──────────

CREATE TABLE IF NOT EXISTS public.cf_block_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  block_type text NOT NULL CHECK (block_type IN ('warm_up','skill','metcon')),
  wod_type text CHECK (wod_type IS NULL OR wod_type IN ('emom','amrap','for_time','tabata','death_by','for_load','chipper')),
  wod_config jsonb DEFAULT '{}',
  exercises jsonb NOT NULL DEFAULT '[]',
  -- Formato: [{ exercise_id, order, reps, unit_override, notes, levels: [{level, value, notes}] }]
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cf_block_templates_trainer
  ON public.cf_block_templates(trainer_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.cf_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cf_block_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cf_wod_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cf_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cf_block_templates ENABLE ROW LEVEL SECURITY;

-- CF_EXERCISES: entrenador gestiona, alumnos del entrenador leen
DROP POLICY IF EXISTS "trainer_manages_cf_exercises" ON public.cf_exercises;
CREATE POLICY "trainer_manages_cf_exercises" ON public.cf_exercises FOR ALL
  USING (trainer_id = auth.uid());

DROP POLICY IF EXISTS "students_read_cf_exercises" ON public.cf_exercises;
CREATE POLICY "students_read_cf_exercises" ON public.cf_exercises FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'student' AND created_by = cf_exercises.trainer_id
    )
  );

-- CF_BLOCK_EXERCISES: heredan permisos del bloque → día → semana → ciclo
DROP POLICY IF EXISTS "access_cf_block_exercises" ON public.cf_block_exercises;
CREATE POLICY "access_cf_block_exercises" ON public.cf_block_exercises FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.training_blocks b
      JOIN public.training_days d ON d.id = b.day_id
      JOIN public.training_weeks w ON w.id = d.week_id
      JOIN public.training_cycles c ON c.id = w.cycle_id
      WHERE b.id = block_id AND (c.trainer_id = auth.uid() OR c.student_id = auth.uid())
    )
  );

-- CF_WOD_LEVELS: heredan permisos via block_exercise → block → ciclo
DROP POLICY IF EXISTS "access_cf_wod_levels" ON public.cf_wod_levels;
CREATE POLICY "access_cf_wod_levels" ON public.cf_wod_levels FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.cf_block_exercises be
      JOIN public.training_blocks b ON b.id = be.block_id
      JOIN public.training_days d ON d.id = b.day_id
      JOIN public.training_weeks w ON w.id = d.week_id
      JOIN public.training_cycles c ON c.id = w.cycle_id
      WHERE be.id = block_exercise_id AND (c.trainer_id = auth.uid() OR c.student_id = auth.uid())
    )
  );

-- CF_RESULTS: alumno gestiona los suyos, entrenador lee los de sus alumnos
DROP POLICY IF EXISTS "student_manages_cf_results" ON public.cf_results;
CREATE POLICY "student_manages_cf_results" ON public.cf_results FOR ALL
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "trainer_reads_cf_results" ON public.cf_results;
CREATE POLICY "trainer_reads_cf_results" ON public.cf_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = student_id AND u.created_by = auth.uid()
    )
  );

-- CF_BLOCK_TEMPLATES: solo el entrenador que la creó
DROP POLICY IF EXISTS "trainer_manages_cf_templates" ON public.cf_block_templates;
CREATE POLICY "trainer_manages_cf_templates" ON public.cf_block_templates FOR ALL
  USING (trainer_id = auth.uid());

-- ============================================================
-- VISTA ANALÍTICA: Ranking de un WOD
-- ============================================================

CREATE OR REPLACE VIEW public.cf_wod_leaderboard AS
SELECT
  r.id AS result_id,
  r.block_id,
  r.day_id,
  r.student_id,
  u.full_name AS student_name,
  r.level_used,
  r.score_type,
  r.score_value,
  r.score_seconds,
  r.score_total_reps,
  r.rx_completed,
  r.notes,
  r.created_at,
  RANK() OVER (
    PARTITION BY r.block_id, r.day_id
    ORDER BY
      CASE r.score_type
        WHEN 'time' THEN r.score_seconds
        ELSE NULL
      END ASC NULLS LAST,
      CASE r.score_type
        WHEN 'rounds_reps' THEN r.score_total_reps
        WHEN 'total_reps' THEN r.score_total_reps
        ELSE NULL
      END DESC NULLS LAST,
      CASE r.score_type
        WHEN 'weight' THEN r.score_value::numeric
        ELSE NULL
      END DESC NULLS LAST
  ) AS ranking
FROM public.cf_results r
JOIN public.users u ON u.id = r.student_id;

-- ============================================================
-- ACTUALIZAR copy_cycle PARA COPIAR CF DATA
-- ============================================================

DROP FUNCTION IF EXISTS public.copy_cycle(uuid, uuid, text, date, uuid, boolean);

CREATE OR REPLACE FUNCTION public.copy_cycle(
  p_source_cycle_id uuid,
  p_trainer_id       uuid,
  p_name             text,
  p_start_date       date,
  p_student_id       uuid DEFAULT NULL,
  p_is_template      boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_source         record;
  v_new_cycle_id   uuid;
  v_new_week_id    uuid;
  v_new_day_id     uuid;
  v_new_block_id   uuid;
  v_week           record;
  v_day            record;
  v_block          record;
  v_ex             record;
  v_cf_ex          record;
  v_cf_level       record;
  v_cs             record;
  v_new_cf_ex_id   uuid;
  v_complex_map    jsonb := '{}';
  v_old_complex_id uuid;
  v_new_complex_id uuid;
BEGIN
  -- Verificar que el origen pertenece al trainer
  SELECT * INTO v_source FROM public.training_cycles
  WHERE id = p_source_cycle_id AND trainer_id = p_trainer_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ciclo no encontrado o sin permisos';
  END IF;

  -- Crear ciclo nuevo
  INSERT INTO public.training_cycles (
    trainer_id, student_id, name, start_date,
    total_weeks, phase_structure, active,
    is_template, template_id, cycle_type
  ) VALUES (
    p_trainer_id,
    p_student_id,
    p_name,
    p_start_date,
    v_source.total_weeks,
    v_source.phase_structure,
    CASE WHEN p_is_template THEN false ELSE true END,
    p_is_template,
    CASE WHEN NOT p_is_template THEN p_source_cycle_id ELSE NULL END,
    v_source.cycle_type
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

      -- Resetear mapa de complexes por día
      v_complex_map := '{}';

      -- Copiar bloques
      FOR v_block IN
        SELECT * FROM public.training_blocks
        WHERE day_id = v_day.id
        ORDER BY "order"
      LOOP
        INSERT INTO public.training_blocks (day_id, name, type, "order", wod_type, wod_config)
        VALUES (v_new_day_id, v_block.name, v_block.type, v_block."order", v_block.wod_type, v_block.wod_config)
        RETURNING id INTO v_new_block_id;

        -- ═══ Copiar training_exercises (fuerza) ═══
        FOR v_ex IN
          SELECT * FROM public.training_exercises
          WHERE block_id = v_block.id
          ORDER BY "order"
        LOOP
          IF v_ex.complex_id IS NOT NULL THEN
            v_old_complex_id := v_ex.complex_id;
            IF v_complex_map ? v_old_complex_id::text THEN
              v_new_complex_id := (v_complex_map ->> v_old_complex_id::text)::uuid;
            ELSE
              v_new_complex_id := gen_random_uuid();
              v_complex_map := v_complex_map || jsonb_build_object(v_old_complex_id::text, v_new_complex_id::text);
            END IF;
          ELSE
            v_new_complex_id := NULL;
          END IF;

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
            v_new_complex_id,
            v_ex.complex_order
          );
        END LOOP;

        -- ═══ Copiar cf_block_exercises (crossfit) + sus niveles ═══
        FOR v_cf_ex IN
          SELECT * FROM public.cf_block_exercises
          WHERE block_id = v_block.id
          ORDER BY "order"
        LOOP
          v_new_cf_ex_id := gen_random_uuid();

          INSERT INTO public.cf_block_exercises (
            id, block_id, exercise_id, "order", reps, unit_override, notes
          ) VALUES (
            v_new_cf_ex_id,
            v_new_block_id,
            v_cf_ex.exercise_id,
            v_cf_ex."order",
            v_cf_ex.reps,
            v_cf_ex.unit_override,
            v_cf_ex.notes
          );

          -- Copiar niveles de cada ejercicio CF
          FOR v_cf_level IN
            SELECT * FROM public.cf_wod_levels
            WHERE block_exercise_id = v_cf_ex.id
          LOOP
            INSERT INTO public.cf_wod_levels (
              block_exercise_id, level, value, notes
            ) VALUES (
              v_new_cf_ex_id,
              v_cf_level.level,
              v_cf_level.value,
              v_cf_level.notes
            );
          END LOOP;
        END LOOP;
      END LOOP;

      -- ═══ Copiar training_complex_sets para este día ═══
      FOR v_cs IN
        SELECT * FROM public.training_complex_sets
        WHERE day_id = v_day.id
        ORDER BY set_number
      LOOP
        IF v_complex_map ? v_cs.complex_id::text THEN
          v_new_complex_id := (v_complex_map ->> v_cs.complex_id::text)::uuid;
        ELSE
          CONTINUE;
        END IF;

        INSERT INTO public.training_complex_sets (
          complex_id, day_id, set_number,
          percentage_1rm, reps_overrides
        ) VALUES (
          v_new_complex_id,
          v_new_day_id,
          v_cs.set_number,
          v_cs.percentage_1rm,
          v_cs.reps_overrides
        );
      END LOOP;

    END LOOP;
  END LOOP;

  RETURN v_new_cycle_id;
END;
$$;
