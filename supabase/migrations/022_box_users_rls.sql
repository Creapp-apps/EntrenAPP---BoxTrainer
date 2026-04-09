-- ============================================================
-- FIX 022 — Unificar acceso de lectura a usuarios por Box
-- y asegurar que profesores y trainers vean a TODOS sus alumnos
-- ============================================================

-- Eliminar políticas viejas divisivas
DROP POLICY IF EXISTS "trainer_reads_students" ON public.users;
DROP POLICY IF EXISTS "professor_reads_box_users" ON public.users;
DROP POLICY IF EXISTS "trainer_updates_students" ON public.users;

-- Nueva política única para leer a todos los integrantes del mismo box
-- (siempre y cuando seas staff)
CREATE POLICY "box_staff_reads_users" ON public.users FOR SELECT
  USING (
    box_id = public.get_my_box_id()
    AND public.get_my_role() IN ('trainer', 'professor', 'co_trainer', 'admin')
  );

-- Nueva política única para que todo el staff del box pueda editar
-- perfiles de los usuarios de SU box (alumnos, etc). El owner
-- no se ve afectado porque él es el owner.
CREATE POLICY "box_staff_updates_users" ON public.users FOR UPDATE
  USING (
    box_id = public.get_my_box_id()
    AND public.get_my_role() IN ('trainer', 'professor', 'co_trainer', 'admin')
  );

-- Asegurarse también de que cuando el trainer/profesor traiga
-- pagos, entrenamientos y ciclos, la política RLS cubra el "box completo"
-- en las tablas que tenían "trainer_id = auth.uid()".

-- (Nota: Para pagos se recomendaba en el futuro cambiar trainer_id por box_id,
-- pero por ahora RLS hace match por trainer_id o box_id equivalente).
