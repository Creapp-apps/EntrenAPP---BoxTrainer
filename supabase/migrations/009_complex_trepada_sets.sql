-- ============================================================
-- MIGRATION 009 — Complex / Trepada: configuración por serie
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- ─── 1. Tabla training_complex_sets ──────────────────────────
-- Una fila por serie de cada complex/trepada.
-- complex_id coincide con training_exercises.complex_id
-- (uuid compartido por todos los ejercicios de un mismo grupo).

create table if not exists public.training_complex_sets (
  id              uuid primary key default gen_random_uuid(),
  complex_id      uuid not null,
  day_id          uuid not null references public.training_days(id) on delete cascade,
  set_number      int  not null check (set_number >= 1),
  percentage_1rm  numeric check (percentage_1rm >= 0 and percentage_1rm <= 200),
  -- Override opcional de reps por ejercicio en esta serie.
  -- Formato: [{"training_exercise_id": "uuid", "reps": "2"}]
  reps_overrides  jsonb not null default '[]'::jsonb,
  created_at      timestamptz default now(),

  unique (complex_id, day_id, set_number)
);

-- ─── 2. Índices ────────────────────────────────────────────────
create index if not exists idx_tcs_complex_id
  on public.training_complex_sets(complex_id);

create index if not exists idx_tcs_day_id
  on public.training_complex_sets(day_id);

-- ─── 3. RLS ────────────────────────────────────────────────────
alter table public.training_complex_sets enable row level security;

-- Entrenador: acceso completo a los complejos de sus ciclos
create policy "trainer_all_complex_sets"
  on public.training_complex_sets
  for all
  using (
    exists (
      select 1
        from public.training_days  td
        join public.training_weeks tw on tw.id = td.week_id
        join public.training_cycles tc on tc.id = tw.cycle_id
       where td.id = training_complex_sets.day_id
         and tc.trainer_id = auth.uid()
    )
  );

-- Alumno: sólo lectura de sus propios ciclos
create policy "student_read_complex_sets"
  on public.training_complex_sets
  for select
  using (
    exists (
      select 1
        from public.training_days  td
        join public.training_weeks tw on tw.id = td.week_id
        join public.training_cycles tc on tc.id = tw.cycle_id
       where td.id = training_complex_sets.day_id
         and tc.student_id = auth.uid()
    )
  );
