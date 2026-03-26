-- ============================================================
-- MIGRATION 017 — Profesores + Multi-Tenant (Super Admin)
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- ╔═══════════════════════════════════════════════════════════╗
-- ║  PARTE A — ROL PROFESOR                                   ║
-- ╚═══════════════════════════════════════════════════════════╝

-- 1. Quitar el constraint viejo de role y agregar los nuevos roles
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check
  CHECK (role IN ('trainer', 'co_trainer', 'professor', 'student', 'super_admin'));

-- ╔═══════════════════════════════════════════════════════════╗
-- ║  PARTE B — MULTI-TENANT: BOXES                            ║
-- ╚═══════════════════════════════════════════════════════════╝

-- 2. Tabla de centros de entrenamiento
CREATE TABLE IF NOT EXISTS public.boxes (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  slug text UNIQUE,
  owner_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  address text,
  city text,
  phone text,
  logo_url text,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'trial', 'past_due', 'suspended', 'cancelled')),
  max_students integer DEFAULT 50,
  max_professors integer DEFAULT 5,
  created_at timestamptz DEFAULT now()
);

-- 3. Suscripciones de cada box a la plataforma
CREATE TABLE IF NOT EXISTS public.box_subscriptions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  box_id uuid REFERENCES public.boxes(id) ON DELETE CASCADE NOT NULL,
  plan_name text NOT NULL DEFAULT 'starter'
    CHECK (plan_name IN ('starter', 'pro', 'enterprise')),
  price numeric(10,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'ARS',
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'past_due', 'suspended', 'cancelled', 'trial')),
  current_period_start date NOT NULL DEFAULT CURRENT_DATE,
  current_period_end date NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days')::date,
  payment_method text CHECK (payment_method IN ('mercadopago', 'stripe', 'transferencia', 'efectivo')),
  stripe_subscription_id text,
  mp_subscription_id text,
  next_payment_date date,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- 4. Agregar box_id a users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS box_id uuid REFERENCES public.boxes(id) ON DELETE SET NULL;

-- ╔═══════════════════════════════════════════════════════════╗
-- ║  BACKFILL — Crear un box por cada trainer existente       ║
-- ╚═══════════════════════════════════════════════════════════╝

-- 5. Auto-crear boxes para trainers existentes
INSERT INTO public.boxes (id, name, owner_id, status)
SELECT
  uuid_generate_v4(),
  COALESCE(u.full_name, u.email) || '''s Box',
  u.id,
  'active'
FROM public.users u
WHERE u.role = 'trainer'
  AND NOT EXISTS (SELECT 1 FROM public.boxes b WHERE b.owner_id = u.id);

-- 6. Asignar box_id al trainer
UPDATE public.users u
SET box_id = b.id
FROM public.boxes b
WHERE b.owner_id = u.id
  AND u.role = 'trainer'
  AND u.box_id IS NULL;

-- 7. Asignar box_id a alumnos del trainer
UPDATE public.users student
SET box_id = trainer.box_id
FROM public.users trainer
WHERE student.created_by = trainer.id
  AND student.role = 'student'
  AND student.box_id IS NULL
  AND trainer.box_id IS NOT NULL;

-- 8. Crear suscripción trial para cada box
INSERT INTO public.box_subscriptions (box_id, plan_name, price, status, current_period_end)
SELECT
  b.id,
  'starter',
  0,
  'trial',
  (CURRENT_DATE + INTERVAL '30 days')::date
FROM public.boxes b
WHERE NOT EXISTS (
  SELECT 1 FROM public.box_subscriptions bs WHERE bs.box_id = b.id
);

-- ╔═══════════════════════════════════════════════════════════╗
-- ║  RLS — Row Level Security                                 ║
-- ╚═══════════════════════════════════════════════════════════╝

ALTER TABLE public.boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.box_subscriptions ENABLE ROW LEVEL SECURITY;

-- BOXES: super_admin ve todo, trainer/professor ve su box
CREATE POLICY "super_admin_all_boxes" ON public.boxes FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "box_owner_reads_own" ON public.boxes FOR SELECT
  USING (
    owner_id = auth.uid()
    OR id = (SELECT box_id FROM public.users WHERE id = auth.uid())
  );

-- BOX_SUBSCRIPTIONS: super_admin gestiona, trainer lee su box
CREATE POLICY "super_admin_all_subscriptions" ON public.box_subscriptions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "box_owner_reads_subscription" ON public.box_subscriptions FOR SELECT
  USING (
    box_id = (SELECT box_id FROM public.users WHERE id = auth.uid())
  );

-- USERS: super_admin ve todos los usuarios
-- (las policies existentes ya cubren trainer→students)
CREATE POLICY "super_admin_all_users" ON public.users FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Profesor ve lo mismo que su trainer (via box_id)
CREATE POLICY "professor_reads_box_users" ON public.users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users prof
      WHERE prof.id = auth.uid()
        AND prof.role = 'professor'
        AND prof.box_id = users.box_id
    )
  );

-- Profesor puede gestionar ciclos/bloques del box
CREATE POLICY "professor_manages_cycles" ON public.training_cycles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users prof
      WHERE prof.id = auth.uid()
        AND prof.role = 'professor'
        AND prof.box_id = (
          SELECT box_id FROM public.users WHERE id = training_cycles.trainer_id
        )
    )
  );

-- ╔═══════════════════════════════════════════════════════════╗
-- ║  ÍNDICES                                                  ║
-- ╚═══════════════════════════════════════════════════════════╝

CREATE INDEX IF NOT EXISTS idx_users_box_id ON public.users(box_id);
CREATE INDEX IF NOT EXISTS idx_boxes_owner ON public.boxes(owner_id);
CREATE INDEX IF NOT EXISTS idx_box_subs_box ON public.box_subscriptions(box_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- ╔═══════════════════════════════════════════════════════════╗
-- ║  FUNCIÓN HELPER: Dashboard stats para Super Admin         ║
-- ╚═══════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION public.super_admin_dashboard_stats()
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'total_boxes', (SELECT COUNT(*) FROM public.boxes),
    'active_boxes', (SELECT COUNT(*) FROM public.boxes WHERE status = 'active'),
    'trial_boxes', (SELECT COUNT(*) FROM public.boxes WHERE status = 'trial'),
    'suspended_boxes', (SELECT COUNT(*) FROM public.boxes WHERE status = 'suspended'),
    'past_due_boxes', (SELECT COUNT(*) FROM public.boxes WHERE status = 'past_due'),
    'total_trainers', (SELECT COUNT(*) FROM public.users WHERE role = 'trainer'),
    'total_students', (SELECT COUNT(*) FROM public.users WHERE role = 'student' AND active = true),
    'total_professors', (SELECT COUNT(*) FROM public.users WHERE role = 'professor' AND active = true),
    'mrr', (
      SELECT COALESCE(SUM(price), 0) FROM public.box_subscriptions
      WHERE status IN ('active', 'past_due')
    ),
    'past_due_amount', (
      SELECT COALESCE(SUM(price), 0) FROM public.box_subscriptions
      WHERE status = 'past_due'
    )
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
