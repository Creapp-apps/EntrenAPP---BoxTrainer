-- ============================================================
-- MIGRATION 004 — Complexes de ejercicios
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- ─── 1. Agregar columnas a training_exercises ─────────────────
alter table public.training_exercises
  add column if not exists complex_id uuid,
  add column if not exists complex_order integer default 0;

-- ─── 2. Índice para búsqueda por complex ──────────────────────
create index if not exists idx_training_exercises_complex_id
  on public.training_exercises(complex_id) where complex_id is not null;

-- ─── 3. Actualizar copy_cycle para preservar complexes ────────
-- Recrea la función incluyendo complex_id / complex_order
-- y mapeando los UUIDs de complex al nuevo ciclo

drop function if exists public.copy_cycle(uuid, uuid, text, date, uuid, boolean);

create or replace function public.copy_cycle(
  p_source_cycle_id uuid,
  p_trainer_id       uuid,
  p_name             text,
  p_start_date       date,
  p_student_id       uuid default null,
  p_is_template      boolean default false
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_source         record;
  v_new_cycle_id   uuid;
  v_new_week_id    uuid;
  v_new_day_id     uuid;
  v_new_block_id   uuid;
  v_week           record;
  v_day            record;
  v_block          record;
  v_ex             record;
  v_complex_map    jsonb := '{}';
  v_old_complex_id uuid;
  v_new_complex_id uuid;
begin
  -- Verificar que el origen pertenece al trainer
  select * into v_source from public.training_cycles
  where id = p_source_cycle_id and trainer_id = p_trainer_id;

  if not found then
    raise exception 'Ciclo no encontrado o sin permisos';
  end if;

  -- Crear ciclo nuevo
  insert into public.training_cycles (
    trainer_id, student_id, name, start_date,
    total_weeks, phase_structure, active,
    is_template, template_id
  ) values (
    p_trainer_id,
    p_student_id,
    p_name,
    p_start_date,
    v_source.total_weeks,
    v_source.phase_structure,
    case when p_is_template then false else true end,
    p_is_template,
    case when not p_is_template then p_source_cycle_id else null end
  )
  returning id into v_new_cycle_id;

  -- Copiar semanas
  for v_week in
    select * from public.training_weeks
    where cycle_id = p_source_cycle_id
    order by week_number
  loop
    insert into public.training_weeks (cycle_id, week_number, type)
    values (v_new_cycle_id, v_week.week_number, v_week.type)
    returning id into v_new_week_id;

    -- Copiar días
    for v_day in
      select * from public.training_days
      where week_id = v_week.id
      order by "order"
    loop
      insert into public.training_days (week_id, day_of_week, label, "order")
      values (v_new_week_id, v_day.day_of_week, v_day.label, v_day."order")
      returning id into v_new_day_id;

      -- Resetear mapa de complexes por día
      v_complex_map := '{}';

      -- Copiar bloques
      for v_block in
        select * from public.training_blocks
        where day_id = v_day.id
        order by "order"
      loop
        insert into public.training_blocks (day_id, name, type, "order")
        values (v_new_day_id, v_block.name, v_block.type, v_block."order")
        returning id into v_new_block_id;

        -- Copiar ejercicios
        for v_ex in
          select * from public.training_exercises
          where block_id = v_block.id
          order by "order"
        loop
          -- Mapear complex_id viejo → nuevo UUID único en el ciclo destino
          if v_ex.complex_id is not null then
            v_old_complex_id := v_ex.complex_id;
            if v_complex_map ? v_old_complex_id::text then
              v_new_complex_id := (v_complex_map ->> v_old_complex_id::text)::uuid;
            else
              v_new_complex_id := uuid_generate_v4();
              v_complex_map := v_complex_map || jsonb_build_object(v_old_complex_id::text, v_new_complex_id::text);
            end if;
          else
            v_new_complex_id := null;
          end if;

          insert into public.training_exercises (
            block_id, exercise_id, variant_id,
            sets, reps, weight_target, percentage_1rm,
            rpe_target, rest_seconds, notes, "order",
            complex_id, complex_order
          ) values (
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
        end loop;
      end loop;
    end loop;
  end loop;

  return v_new_cycle_id;
end;
$$;
