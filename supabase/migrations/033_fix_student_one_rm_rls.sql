-- ============================================================
-- MIGRATION 033 — Fix RLS para student_one_rm
-- Permite que los entrenadores gestionen el 1RM de estudiantes 
-- de su mismo box o estudiantes que hayan creado.
-- ============================================================

drop policy if exists "trainer_manages_student_rm" on public.student_one_rm;

create policy "trainer_manages_student_rm"
  on public.student_one_rm
  for all
  using (
    exists (
      select 1 from public.users student
      join public.users trainer on trainer.box_id = student.box_id
      where student.id = student_one_rm.student_id
        and trainer.id = auth.uid()
        and trainer.role in ('trainer', 'professor', 'co_trainer')
    )
    or
    exists (
      select 1 from public.users u
      where u.id = student_one_rm.student_id
        and u.created_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.users student
      join public.users trainer on trainer.box_id = student.box_id
      where student.id = student_one_rm.student_id
        and trainer.id = auth.uid()
        and trainer.role in ('trainer', 'professor', 'co_trainer')
    )
    or
    exists (
      select 1 from public.users u
      where u.id = student_one_rm.student_id
        and u.created_by = auth.uid()
    )
  );
