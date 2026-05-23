-- Migration 035: Add landing fields and box_id to plans table
-- This allows trainers to customize plan descriptions and choose which plans appear on the landing page, filtered by activities.

-- 1. Add columns to public.plans
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS show_on_landing boolean DEFAULT false;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS box_id uuid REFERENCES public.boxes(id) ON DELETE CASCADE;

-- 2. Backfill box_id for existing plans based on the trainer's box_id
UPDATE public.plans p
SET box_id = u.box_id
FROM public.users u
WHERE p.trainer_id = u.id AND p.box_id IS NULL;

-- 3. Create helper trigger to automatically populate box_id on plan insertion
CREATE OR REPLACE FUNCTION public.trg_populate_plan_box_id()
RETURNS trigger AS $$
BEGIN
  IF NEW.box_id IS NULL THEN
    SELECT box_id INTO NEW.box_id FROM public.users WHERE id = NEW.trainer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_populate_plan_box_id ON public.plans;
CREATE TRIGGER trg_populate_plan_box_id BEFORE INSERT ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.trg_populate_plan_box_id();
