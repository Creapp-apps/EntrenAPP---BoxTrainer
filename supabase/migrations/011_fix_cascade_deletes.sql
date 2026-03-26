-- ============================================================
-- MIGRATION 011 — Fix FK constraints para permitir borrar ciclos
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- ─── session_logs.training_day_id: cambiar a ON DELETE SET NULL ──
-- (necesitamos dropear y recrear el constraint)
alter table public.session_logs
  drop constraint if exists session_logs_training_day_id_fkey;

alter table public.session_logs
  add constraint session_logs_training_day_id_fkey
    foreign key (training_day_id)
    references public.training_days(id)
    on delete set null;

-- ─── exercise_logs.training_exercise_id: cambiar a ON DELETE SET NULL ──
alter table public.exercise_logs
  drop constraint if exists exercise_logs_training_exercise_id_fkey;

alter table public.exercise_logs
  add constraint exercise_logs_training_exercise_id_fkey
    foreign key (training_exercise_id)
    references public.training_exercises(id)
    on delete set null;

-- ─── training_complex_sets: ya tiene ON DELETE CASCADE via day_id ─
-- (verificar que también cascade desde training_exercises)
-- No action needed si ya está configurado en migration 009
