-- ============================================================
-- MIGRATION 008 — Video URL por variante de ejercicio
-- Ejecutar en Supabase SQL Editor
-- ============================================================

alter table public.exercise_variants
  add column if not exists video_url text default null;
