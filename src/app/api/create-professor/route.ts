import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient as createServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password } = body;

    if (!name?.trim() || !email?.trim() || !password || password.length < 6) {
      return NextResponse.json(
        { error: "Nombre, email y contraseña (mín 6 chars) son obligatorios" },
        { status: 400 }
      );
    }

    // 1. Verificar que quien llama es un trainer autenticado
    const authClient = await createServerClient();
    const { data: { user: caller } } = await authClient.auth.getUser();
    if (!caller) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // 2. Obtener el box_id del trainer que está creando al profesor
    const adminSupabase = await createAdminClient();
    const { data: trainerProfile } = await adminSupabase
      .from("users")
      .select("role, box_id")
      .eq("id", caller.id)
      .single();

    if (!trainerProfile || !["trainer", "co_trainer"].includes(trainerProfile.role)) {
      return NextResponse.json({ error: "Solo entrenadores pueden crear profesores" }, { status: 403 });
    }

    const box_id = trainerProfile.box_id;
    if (!box_id) {
      return NextResponse.json({ error: "No tenés un centro asignado" }, { status: 400 });
    }

    // 3. Crear usuario en Auth con admin API (no desloguea al caller)
    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: "professor" },
      user_metadata: {
        full_name: name.trim(),
        role: "professor",
        created_by: caller.id,
      },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // 4. Insertar perfil en public.users con el box_id del trainer
    const { error: profileError } = await adminSupabase.from("users").upsert({
      id: authData.user.id,
      email,
      full_name: name.trim(),
      role: "professor",
      active: true,
      created_by: caller.id,
      box_id: box_id,
    }, { onConflict: "id" });

    if (profileError) {
      // Rollback: eliminar el usuario de auth si falla el perfil
      await adminSupabase.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      professor_id: authData.user.id,
    });
  } catch (error: any) {
    console.error("Create professor error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
