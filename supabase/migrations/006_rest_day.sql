-- ============================================================
-- MIGRATION 006 — Día de descanso en training_days
-- Ejecutar en Supabase SQL Editor
-- ============================================================

alter table public.training_days
  add column if not exists is_rest boolean not null default false;
