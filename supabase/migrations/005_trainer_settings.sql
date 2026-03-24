-- ============================================================
-- MIGRATION 005 — Trainer Settings (variantes comunes)
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Tabla de configuración por entrenador
create table if not exists public.trainer_settings (
  trainer_id      uuid primary key references auth.users(id) on delete cascade,
  common_variants text[] default array[
    'S1', 'S2', 'S3', 'S4',
    'Colgado', '2do Tiempo', 'Fuerza', 'Pausa',
    'Jerk', 'Dip', 'Box', 'Isométrico', 'Excéntrico'
  ],
  updated_at      timestamptz default now()
);

-- RLS
alter table public.trainer_settings enable row level security;

drop policy if exists "trainer_owns_settings" on public.trainer_settings;
create policy "trainer_owns_settings" on public.trainer_settings for all
  using (trainer_id = auth.uid());

-- Función helper: obtener o crear settings con defaults
create or replace function public.get_or_create_trainer_settings(p_trainer_id uuid)
returns public.trainer_settings
language plpgsql
security definer
as $$
declare
  v_settings public.trainer_settings;
begin
  select * into v_settings from public.trainer_settings where trainer_id = p_trainer_id;
  if not found then
    insert into public.trainer_settings (trainer_id)
    values (p_trainer_id)
    returning * into v_settings;
  end if;
  return v_settings;
end;
$$;
