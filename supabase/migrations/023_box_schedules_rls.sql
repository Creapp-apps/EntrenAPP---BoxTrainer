-- ============================================================
-- FIX 023 — Permitir a los profesores ver/editar horarios,
-- planes y bookings de su box.
-- ============================================================

-- Function auxiliar similar a can_access_cycle para otras tablas de staff
CREATE OR REPLACE FUNCTION public.can_access_trainer_data(target_trainer_id uuid)
RETURNS boolean AS $$
BEGIN
  IF target_trainer_id = auth.uid() THEN RETURN true; END IF;
  IF public.get_my_role() = 'super_admin' THEN RETURN true; END IF;
  
  -- Si el admin/trainer/professor es del mismo box
  IF public.get_my_role() IN ('trainer', 'professor', 'co_trainer', 'admin') THEN
    IF public.get_my_box_id() = (SELECT box_id FROM public.users WHERE id = target_trainer_id) THEN
      RETURN true;
    END IF;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;


-- ── 1. PLANS ──
DROP POLICY IF EXISTS "trainer_manages_plans" ON public.plans;
CREATE POLICY "box_staff_manages_plans" ON public.plans FOR ALL
  USING (public.can_access_trainer_data(trainer_id));

-- ── 2. BOX SCHEDULE SLOTS ──
DROP POLICY IF EXISTS "trainer_manages_slots" ON public.box_schedule_slots;
CREATE POLICY "box_staff_manages_slots" ON public.box_schedule_slots FOR ALL
  USING (public.can_access_trainer_data(trainer_id));

-- ── 3. BOX BLOCKED DATES ──
DROP POLICY IF EXISTS "trainer_manages_blocked" ON public.box_blocked_dates;
CREATE POLICY "box_staff_manages_blocked" ON public.box_blocked_dates FOR ALL
  USING (public.can_access_trainer_data(trainer_id));

-- ── 4. SUBSCRIPTIONS ──
-- La policy actual: exists(select 1 from public.users where id=student_id and created_by=auth.uid())
-- La cambiamos para que cualquier staff del box del alumno pueda gestionarlas.
CREATE OR REPLACE FUNCTION public.can_access_student_data(target_student_id uuid)
RETURNS boolean AS $$
DECLARE
  v_student_box_id uuid;
BEGIN
  IF public.get_my_role() = 'super_admin' THEN RETURN true; END IF;
  
  SELECT box_id INTO v_student_box_id FROM public.users WHERE id = target_student_id;
  
  -- Si ambos comparten el mismo box
  IF public.get_my_role() IN ('trainer', 'professor', 'co_trainer', 'admin') THEN
    IF public.get_my_box_id() = v_student_box_id THEN
      RETURN true;
    END IF;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

DROP POLICY IF EXISTS "trainer_manages_subscriptions" ON public.student_plan_subscriptions;
CREATE POLICY "box_staff_manages_subscriptions" ON public.student_plan_subscriptions FOR ALL
  USING (public.can_access_student_data(student_id));

-- ── 5. BOOKINGS ──
-- trainer_manages_bookings usaba "select 1 from users where id=bookings.student_id and created_by=auth.uid()"
DROP POLICY IF EXISTS "trainer_manages_bookings" ON public.bookings;
CREATE POLICY "box_staff_manages_bookings" ON public.bookings FOR ALL
  USING (public.can_access_student_data(student_id));

-- ── 6. STUDENT_PAYMENTS ──
-- Usa trainer_id
DROP POLICY IF EXISTS "access_student_payments" ON public.student_payments;
CREATE POLICY "box_staff_manages_payments" ON public.student_payments FOR ALL
  USING (public.can_access_trainer_data(trainer_id));

-- ── 7. PERSONAL_RECORDS ──
-- Usa student_id
DROP POLICY IF EXISTS "access_personal_records" ON public.personal_records;
CREATE POLICY "box_staff_reads_records" ON public.personal_records FOR SELECT
  USING (public.can_access_student_data(student_id));

-- ── 8. SESSION_LOGS ──
-- Usa student_id
DROP POLICY IF EXISTS "access_session_logs" ON public.session_logs;
CREATE POLICY "box_staff_reads_logs" ON public.session_logs FOR SELECT
  USING (public.can_access_student_data(student_id));
