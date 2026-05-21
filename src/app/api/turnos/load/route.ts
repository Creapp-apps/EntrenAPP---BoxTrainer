import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const admin = await createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Usamos admin client para evitar los problemas de RLS (dependencias circulares en 'users' y 'plans')
    
    // 1. Obtener perfil del alumno
    const { data: profile } = await admin
      .from("users")
      .select("box_id, created_by, modality")
      .eq("id", user.id)
      .single();

    let trainerId = profile?.created_by;
    let deadlineMinutes = 1; // Default
    
    // Si no tiene created_by pero tiene box_id, usamos el owner_id del box
    if (profile?.box_id) {
      const { data: box } = await admin
        .from("boxes")
        .select("owner_id, branding_config")
        .eq("id", profile.box_id)
        .single();
      
      if (!trainerId && box?.owner_id) {
        trainerId = box.owner_id;
      }
      if (box?.branding_config) {
        deadlineMinutes = box.branding_config.booking_deadline_minutes ?? 1;
      }
    }

    if (!trainerId) {
      return NextResponse.json({ error: "Perfil incompleto: sin entrenador ni box asignado" }, { status: 400 });
    }

    // 2. Fetch de subscripción activa con su plan
    const { data: subsData } = await admin
      .from("student_plan_subscriptions")
      .select("*, plans(name, modality, sessions_per_week)")
      .eq("student_id", user.id)
      .eq("status", "activo")
      .order("period_start", { ascending: false })
      .limit(1);

    // 3. Obtener fecha de hoy
    const today = new Date().toISOString().split("T")[0];

    // 4. Fetch de reservas próximas
    const { data: bookingsData } = await admin
      .from("bookings")
      .select("*, box_schedule_slots(label, start_time, end_time, day_of_week)")
      .eq("student_id", user.id)
      .eq("status", "confirmada")
      .gte("booking_date", today)
      .order("booking_date");

    // 5. Fetch de historial
    const { data: pastData } = await admin
      .from("bookings")
      .select("*, box_schedule_slots(label, start_time, end_time, day_of_week)")
      .eq("student_id", user.id)
      .or(`booking_date.lt.${today},status.neq.confirmada`)
      .order("booking_date", { ascending: false })
      .limit(30);

    return NextResponse.json({
      trainerId: trainerId,
      subscription: subsData && subsData.length > 0 ? subsData[0] : null,
      myBookings: bookingsData || [],
      pastBookings: pastData || [],
      bookingDeadlineMinutes: deadlineMinutes,
    });

  } catch (err: any) {
    console.error("Error en /api/turnos/load:", err);
    return NextResponse.json({ error: err.message || "Error interno de servidor" }, { status: 500 });
  }
}
