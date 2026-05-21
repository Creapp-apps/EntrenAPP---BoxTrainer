-- ============================================================
-- FIX 032 — Corregir RLS de exercises para alumnos
-- 
-- PROBLEMA: La policy "students_read_exercises" hace una subquery
-- a public.users que también está sujeta a RLS, causando dependencia
-- circular. El alumno no puede leer los ejercicios → el join
-- training_exercises → exercises retorna NULL → se muestra "undefined"
-- en la vista de entrenamiento del alumno.
--
-- SÍNTOMA: "3× undefined" en la vista /alumno/entrenar/[dayId]
--
-- SOLUCIÓN: Reemplazar la policy con una que use las funciones
-- SECURITY DEFINER (get_my_role, get_my_box_id) para evitar el
-- problema de RLS circular.
-- ============================================================

-- 1. Eliminar todas las policies existentes sobre exercises
DROP POLICY IF EXISTS "students_read_exercises" ON public.exercises;
DROP POLICY IF EXISTS "student_reads_exercises" ON public.exercises;
DROP POLICY IF EXISTS "students_read_box_exercises" ON public.exercises;
DROP POLICY IF EXISTS "trainer_manages_exercises" ON public.exercises;
DROP POLICY IF EXISTS "box_staff_manages_exercises" ON public.exercises;

-- 2. Policy para STAFF (trainer, professor, co_trainer): acceso completo
--    Usa can_access_trainer_data que ya es SECURITY DEFINER
CREATE POLICY "box_staff_manages_exercises" ON public.exercises FOR ALL
  USING (public.can_access_trainer_data(trainer_id))
  WITH CHECK (public.can_access_trainer_data(trainer_id));

-- 3. Policy para ALUMNOS: solo lectura, mismo box que el dueño del ejercicio
--    Usa get_my_role() y get_my_box_id() que son SECURITY DEFINER
--    → Evita la dependencia circular con public.users bajo RLS
CREATE POLICY "students_read_exercises" ON public.exercises FOR SELECT
  USING (
    public.get_my_role() = 'student'
    AND EXISTS (
      SELECT 1 FROM public.users trainer
      WHERE trainer.id = exercises.trainer_id
        AND trainer.box_id = public.get_my_box_id()
    )
  );

-- Verificación: mostrar policies activas sobre exercises
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'exercises' AND schemaname = 'public';
