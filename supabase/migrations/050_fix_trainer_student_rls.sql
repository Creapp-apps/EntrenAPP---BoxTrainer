-- ============================================================
-- MIGRATION 050 — Fix Trainer Student RLS Policies
-- ============================================================

-- ─── 1. Crear función SECURITY DEFINER para obtener el box_id del usuario ───
-- Bypassea RLS en la tabla users para evitar dependencias circulares / recursión infinita
CREATE OR REPLACE FUNCTION public.get_user_box_id(p_user_id uuid)
RETURNS uuid AS $$
BEGIN
  RETURN (SELECT box_id FROM public.users WHERE id = p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 2. Recrear políticas de lectura y actualización en public.users ───
DROP POLICY IF EXISTS "trainer_reads_students" ON public.users;
CREATE POLICY "trainer_reads_students" ON public.users FOR SELECT
USING (
  created_by = auth.uid() OR
  auth.uid() = id OR
  (
    role = 'student' AND 
    box_id = public.get_user_box_id(auth.uid())
  )
);

DROP POLICY IF EXISTS "trainer_updates_students" ON public.users;
CREATE POLICY "trainer_updates_students" ON public.users FOR UPDATE
USING (
  created_by = auth.uid() OR
  auth.uid() = id OR
  (
    role = 'student' AND 
    box_id = public.get_user_box_id(auth.uid())
  )
);
