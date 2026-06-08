-- ============================================================
-- MIGRATION 039 — Fix RLS Circular Dependency
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- ─── 1. Crear función SECURITY DEFINER para verificar entrenador ───
-- Bypassea RLS en la tabla training_cycles para evitar dependencias circulares
CREATE OR REPLACE FUNCTION public.is_cycle_trainer(p_cycle_id uuid, p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.training_cycles
    WHERE id = p_cycle_id AND trainer_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ─── 2. Recrear política de seguridad en training_cycle_enrollments ───
DROP POLICY IF EXISTS "trainers_manage_enrollments" ON public.training_cycle_enrollments;

CREATE POLICY "trainers_manage_enrollments" ON public.training_cycle_enrollments FOR ALL
USING (
  public.is_cycle_trainer(cycle_id, auth.uid())
);
