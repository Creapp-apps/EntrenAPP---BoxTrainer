const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.substring(1, value.length - 1);
    }
    env[key] = value.trim();
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function migrate() {
  console.log("Starting DB migration for shop features...");

  const sql = `
    -- 1. Add category column to box_products
    ALTER TABLE public.box_products ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'other';

    -- 2. Drop all check constraints on public.box_product_sales to allow flexible payment methods and statuses
    DO $$
    DECLARE
        r record;
    BEGIN
        FOR r IN 
            SELECT conname 
            FROM pg_constraint 
            WHERE conrelid = 'public.box_product_sales'::regclass AND contype = 'c'
        LOOP
            EXECUTE 'ALTER TABLE public.box_product_sales DROP CONSTRAINT ' || r.conname;
        END LOOP;
    END $$;

    -- 3. Add back some flexible constraints if needed, or just let text handle it. 
    -- Let's allow payment_method check constraint for: efectivo, mercadopago, transferencia, tarjeta, debito, deuda, otro
    ALTER TABLE public.box_product_sales ADD CONSTRAINT box_product_sales_payment_method_check 
      CHECK (payment_method IN ('efectivo', 'mercadopago', 'transferencia', 'tarjeta', 'debito', 'deuda', 'otro'));

    -- 4. Let's make sure status check constraint is flexible: pendiente, completado, cancelado
    ALTER TABLE public.box_product_sales ADD CONSTRAINT box_product_sales_status_check 
      CHECK (status IN ('pendiente', 'completado', 'cancelado'));
  `;

  const { data, error } = await supabase.rpc('exec_sql', { sql });
  if (error) {
    console.error("Migration failed:", error.message);
  } else {
    console.log("Migration succeeded! RPC Result:", data);
  }
}

migrate();
