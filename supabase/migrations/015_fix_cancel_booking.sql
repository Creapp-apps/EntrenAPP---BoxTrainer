-- ============================================================
-- FIX: Crear función cancel_booking que falta en la BD
-- Ejecutar en Supabase SQL Editor
-- ============================================================

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
