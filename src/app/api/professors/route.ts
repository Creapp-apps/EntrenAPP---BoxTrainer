import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

// Edit Professor
export async function PUT(request: NextRequest) {
  try {
    const { professor_id, name, email, active } = await request.json();

    if (!professor_id) {
      return NextResponse.json({ error: "professor_id requerido" }, { status: 400 });
    }

    // 1. Verificar caller
    const supabaseUser = await createClient();
    const { data: { user: trainer } } = await supabaseUser.auth.getUser();

    if (!trainer) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const adminSupabase = await createAdminClient();

    // 2. Obtener perfil del caller y del profesor
    const [{ data: trainerProfile }, { data: professorProfile }] = await Promise.all([
      adminSupabase.from("users").select("role, box_id").eq("id", trainer.id).single(),
      adminSupabase.from("users").select("role, box_id").eq("id", professor_id).single()
    ]);

    if (!trainerProfile || !["trainer", "co_trainer"].includes(trainerProfile.role)) {
      return NextResponse.json({ error: "Solo entrenadores pueden gestionar profesores" }, { status: 403 });
    }

    if (!professorProfile || professorProfile.role !== "professor" || professorProfile.box_id !== trainerProfile.box_id) {
      return NextResponse.json({ error: "No tenés permiso para editar este profesor" }, { status: 403 });
    }

    // 3. Actualizar en Auth
    const authUpdates: any = {};
    if (email) authUpdates.email = email.trim();
    if (name) authUpdates.user_metadata = { full_name: name.trim() };

    if (Object.keys(authUpdates).length > 0) {
      const { error: authError } = await adminSupabase.auth.admin.updateUserById(professor_id, authUpdates);
      if (authError) {
        return NextResponse.json({ error: authError.message }, { status: 400 });
      }
    }

    // 4. Actualizar en public.users
    const dbUpdates: any = {};
    if (email) dbUpdates.email = email.trim();
    if (name) dbUpdates.full_name = name.trim();
    if (active !== undefined) dbUpdates.active = active;

    const { error: dbError } = await adminSupabase
      .from("users")
      .update(dbUpdates)
      .eq("id", professor_id);

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error al editar profesor:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// Delete Professor
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const professor_id = searchParams.get("professor_id");

    if (!professor_id) {
      return NextResponse.json({ error: "professor_id requerido" }, { status: 400 });
    }

    // 1. Verificar caller
    const supabaseUser = await createClient();
    const { data: { user: trainer } } = await supabaseUser.auth.getUser();

    if (!trainer) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const adminSupabase = await createAdminClient();

    // 2. Obtener perfil del caller y del profesor
    const [{ data: trainerProfile }, { data: professorProfile }] = await Promise.all([
      adminSupabase.from("users").select("role, box_id").eq("id", trainer.id).single(),
      adminSupabase.from("users").select("role, box_id").eq("id", professor_id).single()
    ]);

    if (!trainerProfile || !["trainer", "co_trainer"].includes(trainerProfile.role)) {
      return NextResponse.json({ error: "Solo entrenadores pueden gestionar profesores" }, { status: 403 });
    }

    if (!professorProfile || professorProfile.role !== "professor" || professorProfile.box_id !== trainerProfile.box_id) {
      return NextResponse.json({ error: "No tenés permiso para eliminar este profesor" }, { status: 403 });
    }

    // 3. Eliminar de Auth (esto cascada a public.users)
    const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(professor_id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error al eliminar profesor:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
