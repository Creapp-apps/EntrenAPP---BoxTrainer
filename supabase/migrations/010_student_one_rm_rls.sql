-- ============================================================
-- MIGRATION 010 — RLS policies para student_one_rm
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- ─── Limpiar políticas previas (si existieran) ────────────────
drop policy if exists "student_manages_own_rm"   on public.student_one_rm;
drop policy if exists "trainer_manages_student_rm" on public.student_one_rm;

-- ─── Alumno: gestiona sus propios RMs ────────────────────────
create policy "student_manages_own_rm"
  on public.student_one_rm
  for all
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

-- ─── Entrenador: acceso completo a los RMs de sus alumnos ────
create policy "trainer_manages_student_rm"
  on public.student_one_rm
  for all
  using (
    exists (
      select 1 from public.users u
      where u.id = student_one_rm.student_id
        and u.created_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.users u
      where u.id = student_one_rm.student_id
        and u.created_by = auth.uid()
    )
  );
