-- ============================================================
-- MIGRATION 012 — Sistema de Turnos, Créditos y "Tu Box"
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- ─── 1. AGREGAR MODALIDAD A USUARIOS ─────────────────────────
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS modality text 
  CHECK (modality IN ('presencial', 'a_distancia', 'mixto'));

-- ─── 2. PLANES DE ENTRENAMIENTO ──────────────────────────────
create table if not exists public.plans (
  id uuid default uuid_generate_v4() primary key,
  trainer_id uuid references public.users(id) on delete cascade not null,
  name text not null,
  modality text not null check (modality in ('presencial', 'a_distancia', 'mixto')),
  sessions_per_week integer not null default 2,
  billing_weeks integer not null default 5,
  total_credits integer generated always as (sessions_per_week * billing_weeks) stored,
  price numeric(10,2) not null default 0,
  active boolean default true,
  created_at timestamptz default now()
);

-- ─── 3. SUSCRIPCIONES DEL ALUMNO A PLANES ───────────────────
create table if not exists public.student_plan_subscriptions (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references public.users(id) on delete cascade not null,
  plan_id uuid references public.plans(id) on delete cascade not null,
  period_start date not null default current_date,
  period_end date not null,
  credits_total integer not null,
  credits_used integer not null default 0,
  status text not null check (status in ('activo', 'vencido', 'pausado')) default 'activo',
  created_at timestamptz default now()
);

-- ─── 4. SLOTS DE HORARIOS DEL BOX ───────────────────────────
create table if not exists public.box_schedule_slots (
  id uuid default uuid_generate_v4() primary key,
  trainer_id uuid references public.users(id) on delete cascade not null,
  day_of_week integer not null check (day_of_week between 1 and 7),
  start_time time not null,
  end_time time not null,
  max_capacity integer not null default 8,
  label text not null default 'Turno',
  active boolean default true,
  created_at timestamptz default now(),
  constraint valid_time_range check (start_time < end_time)
);

-- ─── 5. FECHAS BLOQUEADAS ───────────────────────────────────
create table if not exists public.box_blocked_dates (
  id uuid default uuid_generate_v4() primary key,
  trainer_id uuid references public.users(id) on delete cascade not null,
  blocked_date date not null,
  reason text,
  created_at timestamptz default now(),
  unique(trainer_id, blocked_date)
);

-- ─── 6. RESERVAS (BOOKINGS) ────────────────────────────────
create table if not exists public.bookings (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references public.users(id) on delete cascade not null,
  slot_id uuid references public.box_schedule_slots(id) on delete cascade not null,
  subscription_id uuid references public.student_plan_subscriptions(id) on delete set null,
  booking_date date not null,
  status text not null check (status in ('confirmada', 'cancelada', 'completada', 'no_show')) default 'confirmada',
  cancelled_at timestamptz,
  cancel_reason text,
  created_at timestamptz default now(),
  unique(student_id, slot_id, booking_date)
);

-- ─── 7. CONFIGURACIÓN DE CANCELACIÓN ────────────────────────
-- Agregar a trainer_settings la política de cancelación
ALTER TABLE public.trainer_settings 
  ADD COLUMN IF NOT EXISTS cancel_hours_before integer default 12,
  ADD COLUMN IF NOT EXISTS allow_waitlist boolean default true,
  ADD COLUMN IF NOT EXISTS allow_credit_rollover boolean default false,
  ADD COLUMN IF NOT EXISTS booking_window_days integer default 14;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.plans enable row level security;
alter table public.student_plan_subscriptions enable row level security;
alter table public.box_schedule_slots enable row level security;
alter table public.box_blocked_dates enable row level security;
alter table public.bookings enable row level security;

-- PLANS: entrenador gestiona; alumnos del entrenador pueden leer
create policy "trainer_manages_plans" on public.plans for all
  using (trainer_id = auth.uid());

create policy "students_read_plans" on public.plans for select
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'student' and created_by = plans.trainer_id
    )
  );

-- SUBSCRIPTIONS: entrenador gestiona; alumno lee las suyas
create policy "trainer_manages_subscriptions" on public.student_plan_subscriptions for all
  using (
    exists (
      select 1 from public.users
      where id = student_plan_subscriptions.student_id and created_by = auth.uid()
    )
  );

create policy "student_reads_own_subscription" on public.student_plan_subscriptions for select
  using (student_id = auth.uid());

-- BOX SCHEDULE SLOTS: entrenador gestiona; alumnos presenciales/mixtos pueden leer
create policy "trainer_manages_slots" on public.box_schedule_slots for all
  using (trainer_id = auth.uid());

create policy "students_read_slots" on public.box_schedule_slots for select
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() 
        and role = 'student' 
        and created_by = box_schedule_slots.trainer_id
        and modality in ('presencial', 'mixto')
    )
  );

-- BLOCKED DATES: entrenador gestiona; alumnos presenciales leen
create policy "trainer_manages_blocked" on public.box_blocked_dates for all
  using (trainer_id = auth.uid());

create policy "students_read_blocked" on public.box_blocked_dates for select
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() 
        and role = 'student' 
        and created_by = box_blocked_dates.trainer_id
    )
  );

-- BOOKINGS: alumno gestiona las suyas; entrenador lee todas las de sus alumnos
create policy "student_manages_own_bookings" on public.bookings for all
  using (student_id = auth.uid());

create policy "trainer_manages_bookings" on public.bookings for all
  using (
    exists (
      select 1 from public.users
      where id = bookings.student_id and created_by = auth.uid()
    )
  );

-- ============================================================
-- FUNCIONES HELPER
-- ============================================================

-- Obtener slots disponibles para un día específico
create or replace function public.get_available_slots(
  p_trainer_id uuid,
  p_date date
)
returns table (
  slot_id uuid,
  day_of_week integer,
  start_time time,
  end_time time,
  max_capacity integer,
  label text,
  current_bookings bigint,
  spots_available bigint
) as $$
begin
  return query
  select
    s.id as slot_id,
    s.day_of_week,
    s.start_time,
    s.end_time,
    s.max_capacity,
    s.label,
    count(b.id) as current_bookings,
    (s.max_capacity - count(b.id))::bigint as spots_available
  from public.box_schedule_slots s
  left join public.bookings b 
    on b.slot_id = s.id 
    and b.booking_date = p_date 
    and b.status = 'confirmada'
  where s.trainer_id = p_trainer_id
    and s.active = true
    and s.day_of_week = case extract(dow from p_date)
      when 0 then 7
      else extract(dow from p_date)::integer
    end
    and not exists (
      select 1 from public.box_blocked_dates bd
      where bd.trainer_id = p_trainer_id and bd.blocked_date = p_date
    )
  group by s.id, s.day_of_week, s.start_time, s.end_time, s.max_capacity, s.label
  order by s.start_time;
end;
$$ language plpgsql security definer;

-- Realizar una reserva (con validaciones)
create or replace function public.make_booking(
  p_student_id uuid,
  p_slot_id uuid,
  p_date date
)
returns uuid as $$
declare
  v_booking_id uuid;
  v_subscription_id uuid;
  v_trainer_id uuid;
  v_max_capacity integer;
  v_current_count integer;
  v_credits_remaining integer;
  v_student_modality text;
begin
  -- Verificar modalidad del alumno
  select modality into v_student_modality
  from public.users where id = p_student_id;
  
  if v_student_modality = 'a_distancia' then
    raise exception 'Los alumnos a distancia no pueden reservar turnos presenciales';
  end if;

  -- Obtener trainer_id y capacidad del slot
  select trainer_id, max_capacity into v_trainer_id, v_max_capacity
  from public.box_schedule_slots where id = p_slot_id and active = true;
  
  if not found then
    raise exception 'El horario seleccionado no existe o no está activo';
  end if;

  -- Verificar que no es fecha bloqueada
  if exists (
    select 1 from public.box_blocked_dates 
    where trainer_id = v_trainer_id and blocked_date = p_date
  ) then
    raise exception 'Esta fecha está bloqueada por el entrenador';
  end if;

  -- Verificar capacidad
  select count(*) into v_current_count
  from public.bookings
  where slot_id = p_slot_id and booking_date = p_date and status = 'confirmada';
  
  if v_current_count >= v_max_capacity then
    raise exception 'No hay cupo disponible en este horario';
  end if;

  -- Verificar reserva duplicada
  if exists (
    select 1 from public.bookings
    where student_id = p_student_id and slot_id = p_slot_id 
      and booking_date = p_date and status = 'confirmada'
  ) then
    raise exception 'Ya tenés una reserva en este horario';
  end if;

  -- Buscar suscripción activa con créditos
  select id into v_subscription_id
  from public.student_plan_subscriptions
  where student_id = p_student_id
    and status = 'activo'
    and p_date between period_start and period_end
    and credits_used < credits_total
  order by period_start desc
  limit 1;
  
  if v_subscription_id is null then
    raise exception 'No tenés créditos disponibles. Contactá a tu entrenador.';
  end if;

  -- Crear la reserva
  insert into public.bookings (student_id, slot_id, subscription_id, booking_date)
  values (p_student_id, p_slot_id, v_subscription_id, p_date)
  returning id into v_booking_id;

  -- Consumir 1 crédito
  update public.student_plan_subscriptions
  set credits_used = credits_used + 1
  where id = v_subscription_id;

  return v_booking_id;
end;
$$ language plpgsql security definer;

-- Cancelar una reserva (devuelve crédito si está a tiempo)
create or replace function public.cancel_booking(
  p_booking_id uuid,
  p_reason text default null
)
returns boolean as $$
declare
  v_booking record;
  v_cancel_hours integer;
  v_trainer_id uuid;
  v_hours_until numeric;
begin
  -- Obtener la reserva
  select b.*, s.trainer_id, s.start_time
  into v_booking
  from public.bookings b
  join public.box_schedule_slots s on s.id = b.slot_id
  where b.id = p_booking_id and b.status = 'confirmada';
  
  if not found then
    raise exception 'Reserva no encontrada o ya cancelada';
  end if;

  v_trainer_id := v_booking.trainer_id;

  -- Obtener política de cancelación
  select coalesce(cancel_hours_before, 12) into v_cancel_hours
  from public.trainer_settings where trainer_id = v_trainer_id;
  
  if v_cancel_hours is null then v_cancel_hours := 12; end if;

  -- Calcular horas hasta la clase
  v_hours_until := extract(epoch from (
    (v_booking.booking_date + v_booking.start_time) - now()
  )) / 3600;

  -- Cancelar la reserva
  update public.bookings
  set status = 'cancelada',
      cancelled_at = now(),
      cancel_reason = p_reason
  where id = p_booking_id;

  -- Devolver crédito si cancela a tiempo
  if v_hours_until >= v_cancel_hours and v_booking.subscription_id is not null then
    update public.student_plan_subscriptions
    set credits_used = greatest(0, credits_used - 1)
    where id = v_booking.subscription_id;
  end if;

  return true;
end;
$$ language plpgsql security definer;

-- ============================================================
-- ÍNDICES para performance
-- ============================================================
create index if not exists idx_bookings_date on public.bookings(booking_date);
create index if not exists idx_bookings_student on public.bookings(student_id);
create index if not exists idx_bookings_slot_date on public.bookings(slot_id, booking_date);
create index if not exists idx_subscriptions_student on public.student_plan_subscriptions(student_id);
create index if not exists idx_slots_trainer on public.box_schedule_slots(trainer_id);
create index if not exists idx_plans_trainer on public.plans(trainer_id);
