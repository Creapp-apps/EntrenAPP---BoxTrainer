-- ============================================================
-- MIGRATION 028 — Box Branding, Estados de Alumno y Anuncios
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Extender tabla public.boxes con soporte para Branding
ALTER TABLE public.boxes
  ADD COLUMN IF NOT EXISTS branding_config jsonb DEFAULT '{
    "primary_color": "#EA580C",
    "secondary_color": "#1F2937",
    "welcome_message": "¡A entrenar fuerte hoy!",
    "logo_style": "rounded"
  }'::jsonb;

-- 2. Extender tabla public.users con soporte para suspensión
DO $$ 
BEGIN 
  -- Intentar agregar la columna status si no existe
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'status') THEN
    ALTER TABLE public.users ADD COLUMN status text NOT NULL DEFAULT 'active';
    -- Agregar Check Constraint de valores válidos
    ALTER TABLE public.users ADD CONSTRAINT users_status_check 
      CHECK (status IN ('active', 'paused', 'suspended'));
  END IF;
END $$;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS status_reason text;

-- 3. Crear Tabla de Anuncios / Comunicados del Gimnasio
CREATE TABLE IF NOT EXISTS public.box_announcements (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  box_id uuid REFERENCES public.boxes(id) ON DELETE CASCADE NOT NULL,
  author_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  content text NOT NULL,
  scope text NOT NULL DEFAULT 'general' CHECK (scope IN ('general', 'targeted')),
  target_user_ids uuid[] DEFAULT '{}'::uuid[], -- IDs de alumnos específicos si scope = targeted
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 4. Habilitar RLS
ALTER TABLE public.box_announcements ENABLE ROW LEVEL SECURITY;

-- 5. Políticas de Acceso (RLS) para Anuncios

-- El Staff del Box (trainers, co_trainers, professors, admins) puede gestionar TODOS sus anuncios
CREATE POLICY "box_staff_manages_announcements" ON public.box_announcements
  FOR ALL
  USING (
    box_id = public.get_my_box_id()
    AND public.get_my_role() IN ('trainer', 'professor', 'co_trainer', 'admin')
  );

-- Los Alumnos pueden LEER anuncios de SU Box si son generales o si el mensaje va dirigido a ellos
CREATE POLICY "box_students_reads_relevant_announcements" ON public.box_announcements
  FOR SELECT
  USING (
    box_id = public.get_my_box_id()
    AND (
      scope = 'general'
      OR (scope = 'targeted' AND auth.uid() = ANY(target_user_ids))
    )
  );

-- Super Admin ve y gestiona todo por diseño
CREATE POLICY "super_admin_announcements_all" ON public.box_announcements
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );

-- 6. Índices de Performance
CREATE INDEX IF NOT EXISTS idx_announcements_box ON public.box_announcements(box_id);
CREATE INDEX IF NOT EXISTS idx_announcements_pinned ON public.box_announcements(pinned) WHERE pinned = true;
CREATE INDEX IF NOT EXISTS idx_announcements_created ON public.box_announcements(created_at DESC);
