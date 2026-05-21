-- ============================================================
-- MIGRATION 022 — Agregar rondas a training_complex_sets
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- ─── 1. Agregar columna rounds a training_complex_sets ───────────
alter table public.training_complex_sets
  add column if not exists rounds integer default 1 check (rounds >= 1);

-- ─── 2. Actualizar copy_cycle para copiar rounds ───────────
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
          percentage_1rm, reps_overrides, rounds
        ) VALUES (
          v_new_complex_id,
          v_new_day_id,
          v_cs.set_number,
          v_cs.percentage_1rm,
          v_cs.reps_overrides,
          v_cs.rounds
        );
      END LOOP;

    END LOOP;
  END LOOP;

  RETURN v_new_cycle_id;
END;
$$;
