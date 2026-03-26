-- ============================================================
-- FIX 020 — Resolver dependencia circular en RLS
-- El problema: las policies de boxes/users/subscriptions usan
-- subqueries a la tabla users para verificar el rol, pero esas
-- subqueries también están sujetas a RLS → circular.
-- Solución: función SECURITY DEFINER que bypasea RLS.
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Función helper que devuelve el rol del usuario autenticado
--    SECURITY DEFINER = se ejecuta con permisos del creador (bypasea RLS)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text AS $$
  SELECT role FROM public.users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 2. Función helper que devuelve el box_id del usuario autenticado
CREATE OR REPLACE FUNCTION public.get_my_box_id()
RETURNS uuid AS $$
  SELECT box_id FROM public.users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- 3. RECREAR TODAS LAS POLICIES usando las funciones helper
-- ============================================================

-- ── USERS ──
DROP POLICY IF EXISTS "users_read_own" ON public.users;
DROP POLICY IF EXISTS "super_admin_all_users" ON public.users;
DROP POLICY IF EXISTS "professor_reads_box_users" ON public.users;

CREATE POLICY "users_read_own" ON public.users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "super_admin_all_users" ON public.users FOR ALL
  USING (public.get_my_role() = 'super_admin');

CREATE POLICY "professor_reads_box_users" ON public.users FOR SELECT
  USING (
    box_id = public.get_my_box_id()
    AND public.get_my_role() = 'professor'
  );

-- ── BOXES ──
DROP POLICY IF EXISTS "super_admin_all_boxes" ON public.boxes;
DROP POLICY IF EXISTS "box_owner_reads_own" ON public.boxes;

CREATE POLICY "super_admin_all_boxes" ON public.boxes FOR ALL
  USING (public.get_my_role() = 'super_admin');

CREATE POLICY "box_owner_reads_own" ON public.boxes FOR SELECT
  USING (
    owner_id = auth.uid()
    OR id = public.get_my_box_id()
  );

-- ── BOX_SUBSCRIPTIONS ──
DROP POLICY IF EXISTS "super_admin_all_subscriptions" ON public.box_subscriptions;
DROP POLICY IF EXISTS "box_owner_reads_subscription" ON public.box_subscriptions;

CREATE POLICY "super_admin_all_subscriptions" ON public.box_subscriptions FOR ALL
  USING (public.get_my_role() = 'super_admin');

CREATE POLICY "box_owner_reads_subscription" ON public.box_subscriptions FOR SELECT
  USING (box_id = public.get_my_box_id());

-- ── TRAINING_CYCLES (profesor) ──
DROP POLICY IF EXISTS "professor_manages_cycles" ON public.training_cycles;

CREATE POLICY "professor_manages_cycles" ON public.training_cycles FOR ALL
  USING (
    public.get_my_role() = 'professor'
    AND public.get_my_box_id() = (
      SELECT box_id FROM public.users WHERE id = training_cycles.trainer_id
    )
  );

-- 4. Verificación
SELECT public.get_my_role() AS my_role;
