-- ============================================================
-- MIGRATION 027 — Actualizar Trigger de Nuevos Usuarios
-- Permite el registro libre (Google/Email) asignando rol por defecto 'student'
-- ============================================================

-- ─── 1. FUNCIÓN Y TRIGGER PARA INYECTAR ROL EN METADATA (BEFORE INSERT) ────
-- Esto asegura que el middleware y auth.getUser() tengan el rol disponible en app_metadata
CREATE OR REPLACE FUNCTION public.handle_new_user_metadata()
RETURNS trigger AS $$
BEGIN
  -- Si no viene un rol definido en raw_app_meta_data, le inyectamos 'student'
  IF new.raw_app_meta_data IS NULL OR NOT (new.raw_app_meta_data ? 'role') THEN
    new.raw_app_meta_data := jsonb_set(
      COALESCE(new.raw_app_meta_data, '{}'::jsonb),
      '{role}',
      to_jsonb(COALESCE(new.raw_user_meta_data->>'role', 'student'))
    );
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger que se ejecute antes de guardar en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_metadata ON auth.users;
CREATE TRIGGER on_auth_user_created_metadata
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_metadata();


-- ─── 2. FUNCIÓN ACTUALIZADA PARA EL PERFIL PÚBLICO (AFTER INSERT) ───────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_role text;
  v_box_id uuid;
BEGIN
  -- Extraer rol (usar lo inyectado arriba en app_metadata o metadata de usuario)
  v_role := COALESCE(
    new.raw_app_meta_data->>'role', 
    new.raw_user_meta_data->>'role', 
    'student'
  );

  -- Extraer box_id de la metadata si existe
  IF new.raw_user_meta_data->>'box_id' IS NOT NULL AND new.raw_user_meta_data->>'box_id' <> '' THEN
    BEGIN
      v_box_id := (new.raw_user_meta_data->>'box_id')::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_box_id := NULL;
    END;
  ELSE
    v_box_id := NULL;
  END IF;

  -- Insertar el perfil en la tabla pública
  INSERT INTO public.users (
    id,
    email,
    role,
    full_name,
    created_by,
    box_id
  )
  VALUES (
    new.id,
    new.email,
    v_role,
    COALESCE(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    CASE 
      WHEN new.raw_user_meta_data->>'created_by' IS NOT NULL AND new.raw_user_meta_data->>'created_by' <> '' THEN 
        (new.raw_user_meta_data->>'created_by')::uuid 
      ELSE NULL 
    END,
    v_box_id
  );

  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- Prevenir fallos fatales en el registro de usuario
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
