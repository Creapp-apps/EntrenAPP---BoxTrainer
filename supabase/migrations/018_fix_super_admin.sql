-- ============================================================
-- FIX 018 — Arreglar acceso Super Admin
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Arreglar constraint de roles
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check
  CHECK (role IN ('trainer', 'co_trainer', 'professor', 'student', 'super_admin'));

-- 2. Limpiar TODAS las policies conflictivas
DROP POLICY IF EXISTS "super_admin_all_boxes" ON public.boxes;
DROP POLICY IF EXISTS "box_owner_reads_own" ON public.boxes;
DROP POLICY IF EXISTS "super_admin_all_subscriptions" ON public.box_subscriptions;
DROP POLICY IF EXISTS "box_owner_reads_subscription" ON public.box_subscriptions;
DROP POLICY IF EXISTS "super_admin_all_users" ON public.users;
DROP POLICY IF EXISTS "professor_reads_box_users" ON public.users;
DROP POLICY IF EXISTS "professor_manages_cycles" ON public.training_cycles;

-- 3. Policy critica: TODOS los usuarios pueden leer su propio row
CREATE POLICY "users_read_own" ON public.users FOR SELECT
  USING (id = auth.uid());

-- 4. Super admin ve TODOS los usuarios
CREATE POLICY "super_admin_all_users" ON public.users FOR ALL
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
  );

-- 5. Profesores ven usuarios del mismo box
CREATE POLICY "professor_reads_box_users" ON public.users FOR SELECT
  USING (
    box_id = (SELECT box_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'professor'
  );

-- 6. Boxes RLS
ALTER TABLE public.boxes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_all_boxes" ON public.boxes FOR ALL
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
  );

CREATE POLICY "box_owner_reads_own" ON public.boxes FOR SELECT
  USING (
    owner_id = auth.uid()
    OR id = (SELECT box_id FROM public.users WHERE id = auth.uid())
  );

-- 7. Box Subscriptions RLS
ALTER TABLE public.box_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_all_subscriptions" ON public.box_subscriptions FOR ALL
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
  );

CREATE POLICY "box_owner_reads_subscription" ON public.box_subscriptions FOR SELECT
  USING (
    box_id = (SELECT box_id FROM public.users WHERE id = auth.uid())
  );

-- 8. Asegurar que creapp.ar@gmail.com sea super_admin
UPDATE public.users SET role = 'super_admin' WHERE email = 'creapp.ar@gmail.com';

-- 9. Verificar
SELECT email, role, box_id FROM public.users WHERE email = 'creapp.ar@gmail.com';
