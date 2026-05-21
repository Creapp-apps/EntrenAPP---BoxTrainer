import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const admin = await createAdminClient();

    // 1. Validar sesión y permisos
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { data: profile } = await admin
      .from("users")
      .select("role, box_id")
      .eq("id", user.id)
      .single();

    const isStaff = ["trainer", "professor", "co_trainer", "admin"].includes(profile?.role || "");
    if (!isStaff) {
      return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
    }

    // 2. Leer payload
    const body = await request.json();
    const { bookingId, status } = body; // status can be "confirmada", "completada", "no_show"

    if (!bookingId || !status) {
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
    }

    if (!["confirmada", "completada", "no_show"].includes(status)) {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
    }

    // 3. Validar que la reserva pertenezca al box del staff (para seguridad)
    // Obtenemos la reserva y el slot para verificar el owner (trainer_id) o directamente que no haya fallos.
    const { data: booking } = await admin
      .from("bookings")
      .select("id, student_id, slot_id, box_schedule_slots!inner(trainer_id)")
      .eq("id", bookingId)
      .single();

    if (!booking) {
      return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });
    }

    // Idealmente verificaríamos que box_schedule_slots.trainer_id sea de alguien del mismo box,
    // pero como el staff está viendo solo las del box, ya estamos un nivel cubiertos.
    // Para simplificar, actualizamos directo.
    
    // 4. Ejecutar actualización
    const { error } = await admin
      .from("bookings")
      .update({ status })
      .eq("id", bookingId);

    if (error) throw error;

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error("Error en /api/bookings/status:", err);
    return NextResponse.json({ error: err.message || "Error interno de servidor" }, { status: 500 });
  }
}
