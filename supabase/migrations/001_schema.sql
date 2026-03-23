-- ============================================================
-- BOX TRAINER APP — Schema completo
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Habilitar extensiones
create extension if not exists "uuid-ossp";

-- ─── USUARIOS ────────────────────────────────────────────────
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  role text not null check (role in ('trainer', 'co_trainer', 'student')),
  full_name text not null,
  phone text,
  avatar_url text,
  active boolean default true,
  created_by uuid references public.users(id),
  -- Campos extra para alumnos
  birth_date date,
  weight_kg numeric(5,2),
  height_cm numeric(5,1),
  goals text,
  injuries text,
  monthly_price numeric(10,2),
  payment_due_day integer default 1 check (payment_due_day between 1 and 31),
  created_at timestamptz default now()
);

-- ─── EJERCICIOS ──────────────────────────────────────────────
create table public.exercises (
  id uuid default uuid_generate_v4() primary key,
  trainer_id uuid references public.users(id) on delete cascade not null,
  name text not null,
  category text not null check (category in ('fuerza', 'prep_fisica', 'accesorio')),
  muscle_group text not null check (muscle_group in ('olimpico','piernas','espalda','pecho','hombros','brazos','core','full_body','otro')),
  video_url text,
  thumbnail_url text,
  notes text,
  archived boolean default false,
  created_at timestamptz default now()
);

-- ─── 1RM POR ALUMNO ──────────────────────────────────────────
create table public.student_one_rm (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references public.users(id) on delete cascade not null,
  exercise_id uuid references public.exercises(id) on delete cascade not null,
  weight_kg numeric(6,2) not null,
  date date default current_date,
  notes text,
  created_at timestamptz default now(),
  unique(student_id, exercise_id) -- solo 1 1RM vigente por ejercicio (se actualiza)
);

-- ─── CICLOS DE ENTRENAMIENTO ─────────────────────────────────
create table public.training_cycles (
  id uuid default uuid_generate_v4() primary key,
  trainer_id uuid references public.users(id) on delete cascade not null,
  student_id uuid references public.users(id) on delete cascade not null,
  name text not null,
  start_date date not null,
  end_date date,
  total_weeks integer not null default 4,
  phase_structure jsonb not null default '[]',
  active boolean default true,
  created_at timestamptz default now()
);

-- ─── SEMANAS DE ENTRENAMIENTO ────────────────────────────────
create table public.training_weeks (
  id uuid default uuid_generate_v4() primary key,
  cycle_id uuid references public.training_cycles(id) on delete cascade not null,
  week_number integer not null,
  type text not null check (type in ('carga','descarga','intensificacion','acumulacion','test')),
  unique(cycle_id, week_number)
);

-- ─── DÍAS DE ENTRENAMIENTO ───────────────────────────────────
create table public.training_days (
  id uuid default uuid_generate_v4() primary key,
  week_id uuid references public.training_weeks(id) on delete cascade not null,
  day_of_week integer not null check (day_of_week between 1 and 7),
  label text not null default 'Entrenamiento',
  "order" integer default 0,
  unique(week_id, day_of_week)
);

-- ─── BLOQUES DE ENTRENAMIENTO ────────────────────────────────
create table public.training_blocks (
  id uuid default uuid_generate_v4() primary key,
  day_id uuid references public.training_days(id) on delete cascade not null,
  name text not null,
  type text not null check (type in ('fuerza','prep_fisica','custom')),
  "order" integer default 0
);

-- ─── EJERCICIOS DEL PLAN ─────────────────────────────────────
create table public.training_exercises (
  id uuid default uuid_generate_v4() primary key,
  block_id uuid references public.training_blocks(id) on delete cascade not null,
  exercise_id uuid references public.exercises(id) not null,
  sets integer not null default 3,
  reps text not null default '5',        -- puede ser "5", "3-5", "AMRAP"
  weight_target numeric(6,2),            -- kg absolutos
  percentage_1rm numeric(5,2),           -- % del 1RM (alternativa)
  rpe_target numeric(3,1),
  tempo text,                            -- ej: "3-1-2-0"
  rest_seconds integer,
  notes text,
  "order" integer default 0
);

-- ─── LOGS DE SESIÓN ──────────────────────────────────────────
create table public.session_logs (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references public.users(id) on delete cascade not null,
  training_day_id uuid references public.training_days(id) not null,
  date date default current_date,
  completed boolean default false,
  overall_notes text,
  rpe_average numeric(3,1),
  created_at timestamptz default now(),
  unique(student_id, training_day_id, date)
);

-- ─── LOGS DE EJERCICIOS ──────────────────────────────────────
create table public.exercise_logs (
  id uuid default uuid_generate_v4() primary key,
  session_log_id uuid references public.session_logs(id) on delete cascade not null,
  training_exercise_id uuid references public.training_exercises(id) not null,
  sets_done integer,
  reps_done text,
  weight_used numeric(6,2),
  rpe numeric(3,1),
  notes text
);

-- ─── RÉCORDS PERSONALES ──────────────────────────────────────
create table public.personal_records (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references public.users(id) on delete cascade not null,
  exercise_id uuid references public.exercises(id) not null,
  weight_kg numeric(6,2) not null,
  reps integer not null default 1,
  date date default current_date,
  verified_by_trainer boolean default false,
  created_at timestamptz default now()
);

-- ─── PAGOS ───────────────────────────────────────────────────
create table public.student_payments (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references public.users(id) on delete cascade not null,
  trainer_id uuid references public.users(id) not null,
  amount numeric(10,2) not null,
  currency text default 'ARS',
  status text not null check (status in ('pagado','pendiente','vencido','cancelado')) default 'pendiente',
  due_date date not null,
  paid_at timestamptz,
  period_label text not null,           -- ej: "Marzo 2026"
  mercadopago_payment_id text,
  mercadopago_preference_id text,
  payment_method text check (payment_method in ('mercadopago','efectivo','transferencia','otro')),
  notes text,
  created_at timestamptz default now()
);

-- ─── NOTIFICACIONES ──────────────────────────────────────────
create table public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  type text not null,
  title text not null,
  message text not null,
  read boolean default false,
  link text,
  created_at timestamptz default now()
);

-- ─── COMENTARIOS DE SESIÓN ───────────────────────────────────
create table public.session_comments (
  id uuid default uuid_generate_v4() primary key,
  session_log_id uuid references public.session_logs(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  message text not null,
  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

alter table public.users enable row level security;
alter table public.exercises enable row level security;
alter table public.student_one_rm enable row level security;
alter table public.training_cycles enable row level security;
alter table public.training_weeks enable row level security;
alter table public.training_days enable row level security;
alter table public.training_blocks enable row level security;
alter table public.training_exercises enable row level security;
alter table public.session_logs enable row level security;
alter table public.exercise_logs enable row level security;
alter table public.personal_records enable row level security;
alter table public.student_payments enable row level security;
alter table public.notifications enable row level security;
alter table public.session_comments enable row level security;

-- USERS: cada uno ve su propio perfil; entrenador ve a sus alumnos
create policy "users_self_read" on public.users for select
  using (auth.uid() = id);

create policy "trainer_reads_students" on public.users for select
  using (
    created_by = auth.uid() or
    auth.uid() = id
  );

create policy "trainer_creates_students" on public.users for insert
  with check (
    exists (select 1 from public.users where id = auth.uid() and role in ('trainer','co_trainer'))
  );

create policy "trainer_updates_students" on public.users for update
  using (
    created_by = auth.uid() or auth.uid() = id
  );

-- EXERCISES: el entrenador gestiona; alumnos del entrenador pueden leer
create policy "trainer_manages_exercises" on public.exercises for all
  using (trainer_id = auth.uid());

create policy "students_read_exercises" on public.exercises for select
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'student' and created_by = exercises.trainer_id
    )
  );

-- TRAINING (ciclos, semanas, días, bloques, ejercicios del plan)
-- El entrenador gestiona todo; el alumno puede leer su propio ciclo
create policy "trainer_manages_cycles" on public.training_cycles for all
  using (trainer_id = auth.uid());

create policy "student_reads_own_cycle" on public.training_cycles for select
  using (student_id = auth.uid());

-- Semanas, días, bloques y ejercicios del plan: heredan lógica del ciclo
create policy "access_training_weeks" on public.training_weeks for all
  using (
    exists (
      select 1 from public.training_cycles c
      where c.id = cycle_id and (c.trainer_id = auth.uid() or c.student_id = auth.uid())
    )
  );

create policy "access_training_days" on public.training_days for all
  using (
    exists (
      select 1 from public.training_weeks w
      join public.training_cycles c on c.id = w.cycle_id
      where w.id = week_id and (c.trainer_id = auth.uid() or c.student_id = auth.uid())
    )
  );

create policy "access_training_blocks" on public.training_blocks for all
  using (
    exists (
      select 1 from public.training_days d
      join public.training_weeks w on w.id = d.week_id
      join public.training_cycles c on c.id = w.cycle_id
      where d.id = day_id and (c.trainer_id = auth.uid() or c.student_id = auth.uid())
    )
  );

create policy "access_training_exercises" on public.training_exercises for all
  using (
    exists (
      select 1 from public.training_blocks b
      join public.training_days d on d.id = b.day_id
      join public.training_weeks w on w.id = d.week_id
      join public.training_cycles c on c.id = w.cycle_id
      where b.id = block_id and (c.trainer_id = auth.uid() or c.student_id = auth.uid())
    )
  );

-- SESSION LOGS: el alumno gestiona los suyos; el entrenador puede leer
create policy "student_manages_sessions" on public.session_logs for all
  using (student_id = auth.uid());

create policy "trainer_reads_sessions" on public.session_logs for select
  using (
    exists (
      select 1 from public.users u
      where u.id = student_id and u.created_by = auth.uid()
    )
  );

-- EXERCISE LOGS
create policy "access_exercise_logs" on public.exercise_logs for all
  using (
    exists (
      select 1 from public.session_logs s
      where s.id = session_log_id and (
        s.student_id = auth.uid() or
        exists (select 1 from public.users u where u.id = s.student_id and u.created_by = auth.uid())
      )
    )
  );

-- PERSONAL RECORDS
create policy "access_personal_records" on public.personal_records for all
  using (
    student_id = auth.uid() or
    exists (select 1 from public.users u where u.id = student_id and u.created_by = auth.uid())
  );

-- PAGOS
create policy "trainer_manages_payments" on public.student_payments for all
  using (trainer_id = auth.uid());

create policy "student_reads_own_payments" on public.student_payments for select
  using (student_id = auth.uid());

-- NOTIFICACIONES
create policy "user_reads_own_notifications" on public.notifications for all
  using (user_id = auth.uid());

-- COMENTARIOS
create policy "access_comments" on public.session_comments for all
  using (
    user_id = auth.uid() or
    exists (
      select 1 from public.session_logs s
      join public.users u on u.id = s.student_id
      where s.id = session_log_id and u.created_by = auth.uid()
    )
  );

-- ============================================================
-- TRIGGER: auto-crear perfil en users cuando se registra en auth
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  -- Solo aplica si el metadata tiene rol (para alumnos creados por el entrenador)
  if new.raw_user_meta_data->>'role' is not null then
    insert into public.users (id, email, role, full_name, created_by)
    values (
      new.id,
      new.email,
      new.raw_user_meta_data->>'role',
      coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
      (new.raw_user_meta_data->>'created_by')::uuid
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- FUNCIÓN: obtener el día de entrenamiento actual de un alumno
-- ============================================================
create or replace function public.get_today_training(p_student_id uuid)
returns table (
  day_id uuid,
  day_label text,
  week_number integer,
  week_type text,
  cycle_name text
) as $$
declare
  v_dow integer;
begin
  -- Día de la semana: 1=Lunes, 7=Domingo
  v_dow := case extract(dow from current_date)
    when 0 then 7  -- Domingo
    else extract(dow from current_date)::integer
  end;

  return query
  select
    td.id,
    td.label,
    tw.week_number,
    tw.type,
    tc.name
  from public.training_cycles tc
  join public.training_weeks tw on tw.cycle_id = tc.id
  join public.training_days td on td.week_id = tw.id
  where tc.student_id = p_student_id
    and tc.active = true
    and td.day_of_week = v_dow
    and current_date between tc.start_date and coalesce(tc.end_date, current_date + interval '1 year')
  limit 1;
end;
$$ language plpgsql security definer;
