-- ============================================================
-- FIX 021 — Agregar columnas onboarding_completed y theme a boxes
-- Ejecutar en Supabase SQL Editor
-- ============================================================

ALTER TABLE public.boxes ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;
ALTER TABLE public.boxes ADD COLUMN IF NOT EXISTS theme text;

-- Asegurar que los boxes existentes con logo ya completaron onboarding
UPDATE public.boxes SET onboarding_completed = true WHERE logo_url IS NOT NULL;

-- Permitir que trainers/owners puedan actualizar su propio box (para el onboarding)
DROP POLICY IF EXISTS "box_owner_updates_own" ON public.boxes;
CREATE POLICY "box_owner_updates_own" ON public.boxes FOR UPDATE
  USING (
    owner_id = auth.uid()
    OR id = public.get_my_box_id()
  );
