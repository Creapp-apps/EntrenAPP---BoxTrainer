-- ============================================================
-- FIX 024b — Corrección de firma de la función.
-- Y asegurar que las vistas de métricas usen security_invoker = true
-- ============================================================

-- IMPORTANTE: Dropeamos la función para que Postgre nos deje recrearla 
-- con las nuevas columnas de actividad sin tirar el error "cannot change return type"
DROP FUNCTION IF EXISTS public.get_available_slots(uuid, date);

CREATE OR REPLACE FUNCTION public.get_available_slots(
  p_trainer_id uuid,
  p_date date
)
RETURNS TABLE (
  slot_id uuid,
  day_of_week integer,
  start_time time without time zone,
  end_time time without time zone,
  max_capacity integer,
  label text,
  current_bookings bigint,
  spots_available bigint,
  activity_id uuid,
  activity_name text,
  activity_color text
) AS $$
DECLARE
  v_actual_trainer_id uuid;
BEGIN
  -- Usamos la función de multitenancy
  v_actual_trainer_id := public.get_box_owner_id(p_trainer_id);

  RETURN QUERY
  SELECT
    s.id AS slot_id,
    s.day_of_week,
    s.start_time,
    s.end_time,
    s.max_capacity,
    s.label,
    COUNT(b.id) AS current_bookings,
    (s.max_capacity - COUNT(b.id))::bigint AS spots_available,
    s.activity_id,
    a.name AS activity_name,
    a.color AS activity_color
  FROM public.box_schedule_slots s
  LEFT JOIN public.bookings b 
    ON b.slot_id = s.id 
    AND b.booking_date = p_date 
    AND b.status = 'confirmada'
  LEFT JOIN public.box_activities a 
    ON a.id = s.activity_id
  WHERE s.trainer_id = v_actual_trainer_id
    AND s.active = true
    AND s.day_of_week = CASE EXTRACT(dow FROM p_date)
      WHEN 0 THEN 7
      ELSE EXTRACT(dow FROM p_date)::integer
    END
    AND NOT EXISTS (
      SELECT 1 FROM public.box_blocked_dates bd
      WHERE bd.trainer_id = v_actual_trainer_id AND bd.blocked_date = p_date
    )
  GROUP BY 
    s.id, s.day_of_week, s.start_time, s.end_time, 
    s.max_capacity, s.label, s.activity_id, a.name, a.color
  ORDER BY s.start_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- SOLUCIÓN a "Security Definer View (CRITICAL)" de Supabase
-- Por defecto PostgreSQL asume que las Vistas (Views) ignoran el RLS de quien la llama (Definer).
-- Con (security_invoker = true) le forzamos a que verifique las reglas RLS del usuario web actual.
-- ============================================================

-- Si tenés adherence_by_cycle_type y cf_wod_leaderboard marcadas como críticas:
ALTER VIEW public.adherence_by_cycle_type SET (security_invoker = true);
ALTER VIEW public.cf_wod_leaderboard SET (security_invoker = true);

-- Otras vistas analíticas que pueden ser flaggadas luego (aseguramos también):
ALTER VIEW public.user_metrics_overview SET (security_invoker = true);
ALTER VIEW public.exercise_usage_stats SET (security_invoker = true);
