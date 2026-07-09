-- ============================================================
-- MIGRATION 051 — Student Exercise Overrides
-- Pesos/porcentajes personalizados por alumno dentro de un ciclo compartido
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- ─── 1. Tabla principal de overrides ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.student_exercise_overrides (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  enrollment_id uuid REFERENCES public.training_cycle_enrollments(id) ON DELETE CASCADE NOT NULL,
  training_exercise_id uuid REFERENCES public.training_exercises(id) ON DELETE CASCADE NOT NULL,
  -- Campos de carga (solo se usa uno a la vez)
  weight_target numeric(6,2),      -- Peso absoluto personalizado (kg)
  percentage_1rm numeric(5,2),     -- % 1RM personalizado (alternativa)
  rpe_target numeric(3,1),         -- RPE personalizado
  -- Overrides de reps/series
  reps_override text,              -- Reps personalizadas (ej: "5", "3-5")
  sets_override integer,           -- Series personalizadas
  -- Notas específicas para este alumno en este ejercicio
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (enrollment_id, training_exercise_id)
);

-- ─── 2. Row Level Security ───────────────────────────────────────────────────
ALTER TABLE public.student_exercise_overrides ENABLE ROW LEVEL SECURITY;

-- Entrenador puede gestionar todos los overrides de sus ciclos
CREATE POLICY "trainer_manages_overrides" ON public.student_exercise_overrides FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.training_cycle_enrollments e
    JOIN public.training_cycles c ON c.id = e.cycle_id
    WHERE e.id = enrollment_id AND c.trainer_id = auth.uid()
  )
);

-- Alumno puede leer sus propios overrides
CREATE POLICY "student_reads_own_overrides" ON public.student_exercise_overrides FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.training_cycle_enrollments e
    WHERE e.id = enrollment_id AND e.student_id = auth.uid()
  )
);

-- ─── 3. Trigger para actualizar updated_at ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_student_override_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER student_exercise_overrides_updated_at
  BEFORE UPDATE ON public.student_exercise_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_student_override_timestamp();

-- ─── 4. RPC para upsert masivo (eficiente para guardar muchos overrides) ─────
CREATE OR REPLACE FUNCTION public.upsert_student_exercise_overrides(
  p_enrollment_id uuid,
  p_overrides jsonb
  -- p_overrides: array de objetos {training_exercise_id, weight_target?, percentage_1rm?, rpe_target?, reps_override?, sets_override?, notes?}
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_override jsonb;
BEGIN
  -- Verificar que el caller tiene acceso al enrollment
  IF NOT EXISTS (
    SELECT 1 FROM public.training_cycle_enrollments e
    JOIN public.training_cycles c ON c.id = e.cycle_id
    WHERE e.id = p_enrollment_id AND c.trainer_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Acceso denegado al enrollment %', p_enrollment_id;
  END IF;

  FOR v_override IN SELECT * FROM jsonb_array_elements(p_overrides)
  LOOP
    INSERT INTO public.student_exercise_overrides (
      enrollment_id,
      training_exercise_id,
      weight_target,
      percentage_1rm,
      rpe_target,
      reps_override,
      sets_override,
      notes
    ) VALUES (
      p_enrollment_id,
      (v_override->>'training_exercise_id')::uuid,
      CASE WHEN v_override->>'weight_target' IS NOT NULL THEN (v_override->>'weight_target')::numeric ELSE NULL END,
      CASE WHEN v_override->>'percentage_1rm' IS NOT NULL THEN (v_override->>'percentage_1rm')::numeric ELSE NULL END,
      CASE WHEN v_override->>'rpe_target' IS NOT NULL THEN (v_override->>'rpe_target')::numeric ELSE NULL END,
      v_override->>'reps_override',
      CASE WHEN v_override->>'sets_override' IS NOT NULL THEN (v_override->>'sets_override')::integer ELSE NULL END,
      v_override->>'notes'
    )
    ON CONFLICT (enrollment_id, training_exercise_id) DO UPDATE SET
      weight_target    = EXCLUDED.weight_target,
      percentage_1rm   = EXCLUDED.percentage_1rm,
      rpe_target       = EXCLUDED.rpe_target,
      reps_override    = EXCLUDED.reps_override,
      sets_override    = EXCLUDED.sets_override,
      notes            = EXCLUDED.notes,
      updated_at       = now();
  END LOOP;
END;
$$;

-- ─── 5. Índices para performance ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_student_exercise_overrides_enrollment
  ON public.student_exercise_overrides (enrollment_id);

CREATE INDEX IF NOT EXISTS idx_student_exercise_overrides_exercise
  ON public.student_exercise_overrides (training_exercise_id);

-- ─── 6. Comentarios ───────────────────────────────────────────────────────────
COMMENT ON TABLE public.student_exercise_overrides IS
  'Pesos/porcentajes personalizados por alumno (enrollment) para un ejercicio específico del plan. '
  'Actúa como una capa de override sobre training_exercises: si existe un override, se usa ese valor; '
  'si no existe, se usa el valor base del training_exercise (template del ciclo).';
