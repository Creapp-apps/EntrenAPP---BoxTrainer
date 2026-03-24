-- ============================================================
-- MIGRATION 003 — Ciclos Plantilla
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- ─── 1. Agregar columnas a training_cycles ───────────────────
alter table public.training_cycles
  add column if not exists is_template boolean default false,
  add column if not exists template_id uuid references public.training_cycles(id) on delete set null;

-- Un ciclo plantilla NO tiene student_id (puede ser null)
-- Hacer student_id nullable para soportar plantillas
alter table public.training_cycles
  alter column student_id drop not null;

-- ─── 2. Índice para plantillas ────────────────────────────────
create index if not exists idx_cycles_is_template on public.training_cycles(trainer_id, is_template);

-- ─── 3. Actualizar RLS de training_cycles ────────────────────
-- El trainer puede ver sus ciclos normales Y sus plantillas
drop policy if exists "trainer_manages_cycles" on public.training_cycles;
create policy "trainer_manages_cycles" on public.training_cycles for all
  using (trainer_id = auth.uid());

-- ─── 4. Función copy_cycle — copia profunda de un ciclo ──────
-- Copia ciclo + semanas + días + bloques + ejercicios
-- Usada tanto para "guardar como plantilla" como para "crear desde plantilla"
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
  v_source        record;
  v_new_cycle_id  uuid;
  v_new_week_id   uuid;
  v_new_day_id    uuid;
  v_new_block_id  uuid;
  v_week          record;
  v_day           record;
  v_block         record;
  v_ex            record;
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
          insert into public.training_exercises (
            block_id, exercise_id, variant_id,
            sets, reps, weight_target, percentage_1rm,
            rpe_target, rest_seconds, notes, "order"
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
            v_ex."order"
          );
        end loop;
      end loop;
    end loop;
  end loop;

  return v_new_cycle_id;
end;
$$;
