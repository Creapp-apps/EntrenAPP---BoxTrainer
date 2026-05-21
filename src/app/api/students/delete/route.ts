import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { student_id } = await request.json();

    if (!student_id) {
      return NextResponse.json({ error: "student_id requerido" }, { status: 400 });
    }

    // Verificar que el trainer autenticado es dueño del alumno
    const supabaseUser = await createClient();
    const { data: { user: trainer } } = await supabaseUser.auth.getUser();

    if (!trainer) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { data: trainerProfile } = await supabaseUser
      .from("users")
      .select("id, role, box_id")
      .eq("id", trainer.id)
      .single();

    if (!trainerProfile || !["trainer", "co_trainer", "professor"].includes(trainerProfile.role)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { data: student } = await supabaseUser
      .from("users")
      .select("id, box_id")
      .eq("id", student_id)
      .single();

    if (!student || student.box_id !== trainerProfile.box_id) {
      return NextResponse.json({ error: "No tenés permiso para eliminar este alumno" }, { status: 403 });
    }

    // Eliminar el usuario de Supabase Auth con service role
    // (esto también elimina la fila de public.users por CASCADE)
    const adminClient = await createAdminClient();
    const { error } = await adminClient.auth.admin.deleteUser(student_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error al eliminar alumno:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
