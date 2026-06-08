-- ============================================================
-- MIGRATION 040 — Fix Student Read Policy
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- ─── 1. Corregir ambigüedad de columna id en la política de lectura de alumnos ───
-- Se cambia "e.cycle_id = id" por "e.cycle_id = training_cycles.id" para que PostgreSQL
-- no resuelva "id" localmente a la columna de la tabla de inscripciones "e.id".
DROP POLICY IF EXISTS "student_reads_own_cycle" ON public.training_cycles;

CREATE POLICY "student_reads_own_cycle" ON public.training_cycles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.training_cycle_enrollments e
    WHERE e.cycle_id = training_cycles.id AND e.student_id = auth.uid()
  )
);
