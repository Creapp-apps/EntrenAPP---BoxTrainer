-- ============================================================
-- FIX 019 — Agregar 'elite' al constraint de plan_name
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- El frontend usa 'elite' pero el constraint solo permitía 'starter', 'pro', 'enterprise'
ALTER TABLE public.box_subscriptions DROP CONSTRAINT IF EXISTS box_subscriptions_plan_name_check;
ALTER TABLE public.box_subscriptions ADD CONSTRAINT box_subscriptions_plan_name_check
  CHECK (plan_name IN ('starter', 'pro', 'enterprise', 'elite'));

-- Asegurar que la policy users_read_own exista (necesaria para que el super_admin
-- pueda leer su propio perfil a través del anon client)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'users_read_own' AND tablename = 'users'
  ) THEN
    CREATE POLICY "users_read_own" ON public.users FOR SELECT
      USING (id = auth.uid());
  END IF;
END $$;
