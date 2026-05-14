import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminSupabase = await createAdminClient();

    // 1. Validar sesión y permisos del Entrenador
    const { data: { user: coachUser } } = await supabase.auth.getUser();
    if (!coachUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Verificar rol de staff
    const { data: coachProfile } = await adminSupabase
      .from("users")
      .select("role, box_id")
      .eq("id", coachUser.id)
      .single();

    const isStaff = ["trainer", "professor", "co_trainer", "admin"].includes(coachProfile?.role || "");
    if (!isStaff || !coachProfile?.box_id) {
      return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
    }

    // 2. Leer parámetros del request
    const body = await request.json();
    const { studentId, action, reason } = body;

    if (!studentId || !action) {
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
    }

    // 3. Verificar que el alumno pertenezca al mismo Box
    const { data: student } = await adminSupabase
      .from("users")
      .select("id, box_id, status")
      .eq("id", studentId)
      .single();

    if (!student) {
      return NextResponse.json({ error: "Alumno no encontrado" }, { status: 404 });
    }

    if (student.box_id !== coachProfile.box_id) {
      return NextResponse.json({ error: "El alumno no pertenece a tu Box" }, { status: 403 });
    }

    // 4. Ejecutar Acción
    if (action === "pause") {
      const { error } = await adminSupabase
        .from("users")
        .update({
          status: "paused",
          status_reason: reason || "Pausa solicitada por la administración.",
          active: false // Desactivar lógicamente también
        })
        .eq("id", studentId);

      if (error) throw error;
      return NextResponse.json({ success: true, message: "Cuenta pausada con éxito" });

    } else if (action === "activate") {
      const { error } = await adminSupabase
        .from("users")
        .update({
          status: "active",
          status_reason: null,
          active: true
        })
        .eq("id", studentId);

      if (error) throw error;
      return NextResponse.json({ success: true, message: "Cuenta reactivada con éxito" });

    } else if (action === "unlink") {
      // Desvincular quita el box_id y reinicia el estado a activo pero huérfano
      const { error } = await adminSupabase
        .from("users")
        .update({
          box_id: null,
          status: "active",
          status_reason: null,
          active: true
        })
        .eq("id", studentId);

      if (error) throw error;
      return NextResponse.json({ success: true, message: "Alumno desvinculado del Box" });

    } else {
      return NextResponse.json({ error: "Acción desconocida" }, { status: 400 });
    }

  } catch (err: any) {
    console.error("Error en /api/students/status:", err);
    return NextResponse.json({ error: err.message || "Error interno de servidor" }, { status: 500 });
  }
}
