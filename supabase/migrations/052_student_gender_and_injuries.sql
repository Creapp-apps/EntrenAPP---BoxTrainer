-- ============================================================
-- MIGRATION 052 — Add gender and injured_parts to users table
-- ============================================================

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS gender text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS injured_parts text;
