-- ============================================================
-- MIGRATION 002 — Correcciones de schema + Multi-tenant
-- Ejecutar en Supabase SQL Editor
-- Es seguro correr aunque algunas columnas ya existan
-- ============================================================

-- ─── 1. EXERCISE_VARIANTS ────────────────────────────────────
-- Tabla de variantes (puede ya existir)
create table if not exists public.exercise_variants (
  id uuid default uuid_generate_v4() primary key,
  exercise_id uuid references public.exercises(id) on delete cascade not null,
  name text not null,
  "order" integer default 0,
  created_at timestamptz default now()
);

alter table public.exercise_variants enable row level security;

-- Política: misma lógica que exercises (va del lado del trainer)
drop policy if exists "access_exercise_variants" on public.exercise_variants;
create policy "access_exercise_variants" on public.exercise_variants for all
  using (
    exists (
      select 1 from public.exercises e
      where e.id = exercise_id and (
        e.trainer_id = auth.uid() or
        exists (
          select 1 from public.users u
          where u.id = auth.uid() and u.role = 'student' and u.created_by = e.trainer_id
        )
      )
    )
  );

-- ─── 2. TRAINING_EXERCISES — agregar variant_id ──────────────
alter table public.training_exercises
  add column if not exists variant_id uuid references public.exercise_variants(id) on delete set null;

-- ─── 3. SESSION_LOGS — alinear columnas con el frontend ──────
-- El frontend usa: day_id, cycle_id, started_at, completed_at, rpe_overall, comments
-- El schema original tenía: training_day_id, date, overall_notes, rpe_average

-- Agregar columnas nuevas (las antiguas quedan por retrocompatibilidad)
alter table public.session_logs
  add column if not exists day_id uuid references public.training_days(id) on delete set null,
  add column if not exists cycle_id uuid references public.training_cycles(id) on delete set null,
  add column if not exists started_at timestamptz default now(),
  add column if not exists completed_at timestamptz,
  add column if not exists rpe_overall numeric(3,1),
  add column if not exists comments text;

-- ─── 4. EXERCISE_LOGS — alinear columnas con el frontend ─────
-- El frontend usa: exercise_id, variant_id, sets_completed, reps_completed, weight_used_kg
-- El schema original tenía: training_exercise_id, sets_done, reps_done, weight_used

alter table public.exercise_logs
  add column if not exists exercise_id uuid references public.exercises(id) on delete set null,
  add column if not exists variant_id uuid references public.exercise_variants(id) on delete set null,
  add column if not exists sets_completed integer,
  add column if not exists reps_completed text,
  add column if not exists weight_used_kg numeric(6,2);

-- ─── 5. STUDENT_ONE_RM — agregar recorded_at ─────────────────
alter table public.student_one_rm
  add column if not exists recorded_at date default current_date;

-- ─── 6. NOTIFICATIONS — agregar columna data (jsonb) ─────────
alter table public.notifications
  add column if not exists data jsonb;

-- ─── 7. VERIFICAR: exercises.trainer_id existe ───────────────
-- (ya debería existir del schema original, esto es solo por seguridad)
-- Si tira error "column already exists" se puede ignorar

-- ─── 8. ÍNDICES para performance multi-tenant ────────────────
create index if not exists idx_exercises_trainer_id on public.exercises(trainer_id);
create index if not exists idx_training_cycles_trainer_id on public.training_cycles(trainer_id);
create index if not exists idx_student_payments_trainer_id on public.student_payments(trainer_id);
create index if not exists idx_users_created_by on public.users(created_by);
create index if not exists idx_session_logs_student_id on public.session_logs(student_id);
create index if not exists idx_session_logs_day_id on public.session_logs(day_id);

-- ─── 9. FUNCIÓN get_today_training — versión mejorada ────────
-- Reemplaza la función original con soporte para múltiples ciclos activos
create or replace function public.get_today_training(p_student_id uuid)
returns table (
  day_id uuid,
  day_label text,
  week_number integer,
  week_type text,
  cycle_name text,
  cycle_id uuid
) as $$
declare
  v_dow integer;
begin
  v_dow := case extract(dow from current_date)
    when 0 then 7
    else extract(dow from current_date)::integer
  end;

  return query
  select
    td.id,
    td.label,
    tw.week_number,
    tw.type,
    tc.name,
    tc.id
  from public.training_cycles tc
  join public.training_weeks tw on tw.cycle_id = tc.id
  join public.training_days td on td.week_id = tw.id
  where tc.student_id = p_student_id
    and tc.active = true
    and td.day_of_week = v_dow
    and current_date between tc.start_date and coalesce(tc.end_date, current_date + interval '1 year')
  order by tc.created_at desc
  limit 1;
end;
$$ language plpgsql security definer;

-- ─── 10. VERIFICACIÓN FINAL ──────────────────────────────────
-- Correr este SELECT para confirmar que todo está bien:
-- select table_name, column_name, data_type
-- from information_schema.columns
-- where table_schema = 'public'
--   and table_name in ('session_logs','exercise_logs','student_one_rm','notifications','exercise_variants')
-- order by table_name, ordinal_position;
