-- ============================================================
-- MIGRATION 031 — E-commerce & Counter Sales System
-- Crea las tablas box_products y box_product_sales con RLS y box_id.
-- ============================================================

-- 1. Crear tabla de productos de la tienda del Box
CREATE TABLE IF NOT EXISTS public.box_products (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  box_id uuid NOT NULL REFERENCES public.boxes(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image_url text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Crear tabla de registros de ventas y pedidos de la tienda
CREATE TABLE IF NOT EXISTS public.box_product_sales (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  box_id uuid NOT NULL REFERENCES public.boxes(id) ON DELETE CASCADE,
  student_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.box_products(id) ON DELETE SET NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  total_price numeric(10,2) NOT NULL CHECK (total_price >= 0),
  payment_method text NOT NULL CHECK (payment_method IN ('efectivo', 'mercadopago', 'transferencia', 'otro')),
  status text NOT NULL DEFAULT 'completado' CHECK (status IN ('pendiente', 'completado', 'cancelado')),
  buyer_name text, -- Para pedidos de visitantes anónimos
  buyer_contact text, -- Para pedidos de visitantes anónimos
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Crear índices para optimizar búsquedas por box y por alumno
CREATE INDEX IF NOT EXISTS idx_box_products_box ON public.box_products(box_id);
CREATE INDEX IF NOT EXISTS idx_box_product_sales_box ON public.box_product_sales(box_id);
CREATE INDEX IF NOT EXISTS idx_box_product_sales_student ON public.box_product_sales(student_id);

-- 4. Habilitar RLS (Row Level Security)
ALTER TABLE public.box_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.box_product_sales ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS para box_products
-- Cualquiera puede leer productos activos (necesario para el catálogo público e invitaciones)
CREATE POLICY "anyone_reads_active_products" ON public.box_products
  FOR SELECT
  USING (active = true);

-- Entrenadores, co-entrenadores y profesores del Box pueden gestionar (all) productos de su Box
CREATE POLICY "staff_manages_products" ON public.box_products
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role IN ('trainer', 'co_trainer', 'professor')
        AND u.box_id = box_products.box_id
    )
  );

-- 6. Políticas RLS para box_product_sales
-- Alumnos logueados pueden ver sus propios registros de compras
CREATE POLICY "students_read_own_sales" ON public.box_product_sales
  FOR SELECT
  USING (student_id = auth.uid());

-- Alumnos logueados pueden insertar pedidos/compras para su box
CREATE POLICY "students_insert_own_orders" ON public.box_product_sales
  FOR INSERT
  WITH CHECK (
    student_id = auth.uid()
    AND box_id = (SELECT box_id FROM public.users WHERE id = auth.uid())
  );

-- Público anónimo puede crear un pedido (Insert)
CREATE POLICY "anonymous_insert_orders" ON public.box_product_sales
  FOR INSERT
  WITH CHECK (auth.role() = 'anon' OR auth.uid() IS NULL);

-- Personal del Box (entrenadores, co-entrenadores y profesores) puede gestionar (all) ventas del Box
CREATE POLICY "staff_manages_sales" ON public.box_product_sales
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role IN ('trainer', 'co_trainer', 'professor')
        AND u.box_id = box_product_sales.box_id
    )
  );
