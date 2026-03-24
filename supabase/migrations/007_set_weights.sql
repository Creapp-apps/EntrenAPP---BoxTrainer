-- ============================================================
-- MIGRATION 007 — Per-set weight logging in exercise_logs
-- Ejecutar en Supabase SQL Editor
-- ============================================================

alter table public.exercise_logs
  add column if not exists set_weights numeric[] default null;
