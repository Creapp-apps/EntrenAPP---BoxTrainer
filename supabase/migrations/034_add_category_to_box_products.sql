-- ============================================================
-- MIGRATION 034 — Add Category Column to Box Products Table
-- ============================================================

-- Add category column to public.box_products if it does not exist
ALTER TABLE public.box_products ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'other';

-- Comment on column for documentation
COMMENT ON COLUMN public.box_products.category IS 'Category of the product: drinks, supplements, clothing, other';
