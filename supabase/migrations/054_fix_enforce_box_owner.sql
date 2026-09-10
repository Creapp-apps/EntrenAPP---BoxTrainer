-- MIGRATION 054 — Fix trg_enforce_box_owner to allow service role / script insertions
CREATE OR REPLACE FUNCTION public.trg_enforce_box_owner()
RETURNS trigger AS $$
DECLARE
  v_owner_id uuid;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    v_owner_id := public.get_box_owner_id(auth.uid());
    IF v_owner_id IS NOT NULL THEN
      NEW.trainer_id := v_owner_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
