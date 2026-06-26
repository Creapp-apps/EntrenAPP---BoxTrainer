-- ============================================================
-- MIGRATION 042 — Rediseño de Planes, POS, Sedes y Finanzas (PyL)
-- Ejecutar para establecer esquemas, RLS y triggers de sincronización
-- ============================================================

-- ─── 1. EXTENDER TABLAS EXISTENTES ────────────────────────────

-- Agregar campos de costos y alertas de stock a box_products (POS)
ALTER TABLE public.box_products
  ADD COLUMN IF NOT EXISTS cost numeric(10,2) NOT NULL DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS min_stock integer NOT NULL DEFAULT 5;

-- ─── 2. TABLA: SEDES / SUCURSALES (Multi-Sucursal) ─────────────

CREATE TABLE IF NOT EXISTS public.box_branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  box_id uuid REFERENCES public.boxes(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  address text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Agregar sucursal_id a los slots de reservas/horarios del Box
ALTER TABLE public.box_schedule_slots
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.box_branches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS professor_id uuid REFERENCES public.users(id) ON DELETE SET NULL;

-- ─── 3. TABLA: CONFIGURACIÓN DE PAGO DE PROFESOR ───────────────

CREATE TABLE IF NOT EXISTS public.professor_payment_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  payment_type text NOT NULL CHECK (payment_type IN ('fixed', 'per_class', 'per_hour')),
  rate numeric NOT NULL DEFAULT 0.0,
  created_at timestamptz DEFAULT now()
);

-- ─── 4. TABLAS DE MÓDULO FINANCIERO (PyL / Cashflow) ───────────

-- Libro Diario (Historial de ingresos/egresos)
CREATE TABLE IF NOT EXISTS public.finance_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  box_id uuid REFERENCES public.boxes(id) ON DELETE CASCADE NOT NULL,
  branch_id uuid REFERENCES public.box_branches(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  category text NOT NULL CHECK (category IN (
    'membership',         -- Cuotas de alumnos
    'pos_sale',           -- Ventas POS
    'provider_payment',   -- Pagos a proveedores
    'salary',             -- Sueldo de profesores / personal
    'rent',               -- Alquileres
    'services',           -- Servicios públicos
    'other'
  )),
  amount numeric NOT NULL DEFAULT 0.0,
  description text,
  reference_id uuid,      -- Vinculo a box_product_sales, student_payments, etc.
  transaction_date date NOT NULL DEFAULT current_date,
  created_at timestamptz DEFAULT now()
);

-- Pagos a Proveedores
CREATE TABLE IF NOT EXISTS public.finance_provider_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  box_id uuid REFERENCES public.boxes(id) ON DELETE CASCADE NOT NULL,
  provider_name text NOT NULL,
  amount numeric NOT NULL DEFAULT 0.0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('paid', 'pending')),
  due_date date NOT NULL,
  payment_date date,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Historial de Sueldos Pagados
CREATE TABLE IF NOT EXISTS public.finance_salaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  box_id uuid REFERENCES public.boxes(id) ON DELETE CASCADE NOT NULL,
  professor_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  employee_name text NOT NULL,
  amount numeric NOT NULL DEFAULT 0.0,
  payment_date date NOT NULL DEFAULT current_date,
  period text NOT NULL, -- Ej: "Junio 2026"
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Activos / Pasivos (Patrimonio Neto)
CREATE TABLE IF NOT EXISTS public.finance_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  box_id uuid REFERENCES public.boxes(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('asset', 'liability')),
  value numeric NOT NULL DEFAULT 0.0,
  purchase_date date,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- ─── 5. ÍNDICES ───────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_box_branches_box ON public.box_branches(box_id);
CREATE INDEX IF NOT EXISTS idx_finance_txs_box ON public.finance_transactions(box_id);
CREATE INDEX IF NOT EXISTS idx_finance_txs_date ON public.finance_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_finance_assets_box ON public.finance_assets(box_id);

-- ─── 6. HABILITAR ROW LEVEL SECURITY (RLS) ────────────────────

ALTER TABLE public.box_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professor_payment_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_provider_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_salaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_assets ENABLE ROW LEVEL SECURITY;

-- ─── 7. POLÍTICAS DE RLS ──────────────────────────────────────

-- SEDES/BRANCHES: Entrenadores y personal gestionan, alumnos leen
CREATE POLICY "staff_manages_branches" ON public.box_branches
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('trainer', 'co_trainer', 'professor', 'admin') AND u.box_id = box_branches.box_id
    )
  );

CREATE POLICY "students_read_branches" ON public.box_branches
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'student' AND u.box_id = box_branches.box_id
    )
  );

-- CONFIGURACIONES DE SUELDO DE PROFESORES: Solo entrenadores/dueños ven/gestionan
CREATE POLICY "trainers_manage_professor_salaries" ON public.professor_payment_configs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'trainer' AND u.box_id = (SELECT box_id FROM public.users WHERE id = professor_id)
    )
  );

-- TRANSACCIONES FINANCIERAS (PyL): Solo el entrenador dueño puede ver y gestionar
CREATE POLICY "trainers_manage_finance_txs" ON public.finance_transactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.boxes b
      WHERE b.owner_id = auth.uid() AND b.id = box_id
    )
  );

-- PROVEEDORES: Solo entrenadores gestionan
CREATE POLICY "trainers_manage_providers" ON public.finance_provider_payments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.boxes b
      WHERE b.owner_id = auth.uid() AND b.id = box_id
    )
  );

-- SUELDOS: Solo entrenadores gestionan
CREATE POLICY "trainers_manage_salaries" ON public.finance_salaries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.boxes b
      WHERE b.owner_id = auth.uid() AND b.id = box_id
    )
  );

-- PATRIMONIO: Solo entrenadores gestionan
CREATE POLICY "trainers_manage_assets" ON public.finance_assets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.boxes b
      WHERE b.owner_id = auth.uid() AND b.id = box_id
    )
  );

-- ─── 8. TRIGGERS DE SINCRONIZACIÓN AUTOMÁTICA AL PyL ───────────

-- A. Sincronizar cuotas cobradas (student_payments) al PyL
CREATE OR REPLACE FUNCTION public.sync_student_payment_to_finance()
RETURNS TRIGGER AS $$
DECLARE
  v_box_id uuid;
BEGIN
  SELECT box_id INTO v_box_id FROM public.users WHERE id = NEW.trainer_id;
  
  IF (NEW.status = 'pagado' AND (OLD IS NULL OR OLD.status <> 'pagado')) THEN
    INSERT INTO public.finance_transactions (
      box_id,
      type,
      category,
      amount,
      description,
      reference_id,
      transaction_date
    ) VALUES (
      v_box_id,
      'income',
      'membership',
      NEW.amount,
      'Cuota alumno: ' || (SELECT COALESCE(full_name, email) FROM public.users WHERE id = NEW.student_id) || ' (' || NEW.period_label || ')',
      NEW.id,
      COALESCE(NEW.paid_at::date, current_date)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_sync_student_payment_to_finance
AFTER INSERT OR UPDATE ON public.student_payments
FOR EACH ROW EXECUTE FUNCTION public.sync_student_payment_to_finance();

-- Limpieza de cuotas anuladas/eliminadas
CREATE OR REPLACE FUNCTION public.sync_student_payment_to_finance_cleanup()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    DELETE FROM public.finance_transactions WHERE reference_id = OLD.id AND category = 'membership';
  ELSIF (TG_OP = 'UPDATE' AND OLD.status = 'pagado' AND NEW.status <> 'pagado') THEN
    DELETE FROM public.finance_transactions WHERE reference_id = NEW.id AND category = 'membership';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_sync_student_payment_to_finance_cleanup
AFTER UPDATE OR DELETE ON public.student_payments
FOR EACH ROW EXECUTE FUNCTION public.sync_student_payment_to_finance_cleanup();

-- B. Sincronizar ventas del POS (box_product_sales) al PyL
CREATE OR REPLACE FUNCTION public.sync_pos_sale_to_finance()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.status = 'completado' AND (OLD IS NULL OR OLD.status <> 'completado')) THEN
    INSERT INTO public.finance_transactions (
      box_id,
      type,
      category,
      amount,
      description,
      reference_id,
      transaction_date
    ) VALUES (
      NEW.box_id,
      'income',
      'pos_sale',
      NEW.total_price,
      'Venta POS: ' || (SELECT name FROM public.box_products WHERE id = NEW.product_id) || ' (Cant: ' || NEW.quantity || ')',
      NEW.id,
      NEW.created_at::date
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_sync_pos_sale_to_finance
AFTER INSERT OR UPDATE ON public.box_product_sales
FOR EACH ROW EXECUTE FUNCTION public.sync_pos_sale_to_finance();

-- Limpieza de ventas canceladas/eliminadas del POS
CREATE OR REPLACE FUNCTION public.sync_pos_sale_to_finance_cleanup()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    DELETE FROM public.finance_transactions WHERE reference_id = OLD.id AND category = 'pos_sale';
  ELSIF (TG_OP = 'UPDATE' AND OLD.status = 'completado' AND NEW.status <> 'completado') THEN
    DELETE FROM public.finance_transactions WHERE reference_id = NEW.id AND category = 'pos_sale';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_sync_pos_sale_to_finance_cleanup
AFTER UPDATE OR DELETE ON public.box_product_sales
FOR EACH ROW EXECUTE FUNCTION public.sync_pos_sale_to_finance_cleanup();
