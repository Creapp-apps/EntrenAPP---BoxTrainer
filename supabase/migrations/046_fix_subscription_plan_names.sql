-- ============================================================
-- MIGRATION 046 — Actualizar nombres de planes en suscripciones
-- Ejecutar en Supabase SQL Editor para permitir planes nuevos
-- ============================================================

ALTER TABLE public.box_subscriptions DROP CONSTRAINT IF EXISTS box_subscriptions_plan_name_check;
ALTER TABLE public.box_subscriptions ADD CONSTRAINT box_subscriptions_plan_name_check
  CHECK (plan_name IN ('starter', 'pro', 'enterprise', 'elite', 'plan_50', 'plan_100', 'plan_150', 'premium'));
