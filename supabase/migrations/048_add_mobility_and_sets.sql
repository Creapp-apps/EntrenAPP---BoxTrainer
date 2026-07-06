-- MIGRACIÓN 048 — Agregar tipo de bloque 'mobility' y columna 'sets' a cf_block_exercises

-- 1. Actualizar la restricción de tipo de bloque en training_blocks
ALTER TABLE public.training_blocks
  DROP CONSTRAINT IF EXISTS training_blocks_type_check;

ALTER TABLE public.training_blocks
  ADD CONSTRAINT training_blocks_type_check
  CHECK (type IN ('fuerza', 'prep_fisica', 'custom', 'warm_up', 'skill', 'metcon', 'mobility'));

-- 2. Agregar la columna 'sets' a cf_block_exercises
ALTER TABLE public.cf_block_exercises
  ADD COLUMN IF NOT EXISTS sets integer NOT NULL DEFAULT 3;

-- 3. Actualizar la restricción de categoría en cf_exercises para incluir 'mobility'
ALTER TABLE public.cf_exercises
  DROP CONSTRAINT IF EXISTS cf_exercises_category_check;

ALTER TABLE public.cf_exercises
  ADD CONSTRAINT cf_exercises_category_check
  CHECK (category IN ('gymnastics', 'weightlifting', 'monostructural', 'other', 'mobility'));

-- 4. Actualizar la categoría de los ejercicios de movilidad existentes en cf_exercises
UPDATE public.cf_exercises
  SET category = 'mobility'
  WHERE name ILIKE '%Stretch%' 
     OR name ILIKE '%pigeon%' 
     OR name ILIKE '%puppy pose%' 
     OR name ILIKE '%Cat cow%' 
     OR name ILIKE '%WINDMILL%' 
     OR name ILIKE '%Halo%' 
     OR name ILIKE '%espinales nado%';
