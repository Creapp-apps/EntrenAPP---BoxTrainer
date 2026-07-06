import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json({ error: "Falta el parámetro de fecha (date)" }, { status: 400 });
    }

    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Fetch the box to find its owner_id (trainer_id)
    const { data: box, error: boxError } = await adminSupabase
      .from("boxes")
      .select("owner_id")
      .eq("id", params.id)
      .single();

    if (boxError || !box) {
      return NextResponse.json({ error: "Box no encontrado" }, { status: 404 });
    }

    if (!box.owner_id) {
      return NextResponse.json({ error: "El Box no tiene un administrador configurado" }, { status: 400 });
    }

    // 2. Fetch available slots for the box owner on that date
    const { data: slots, error: slotsError } = await adminSupabase.rpc("get_available_slots", {
      p_trainer_id: box.owner_id,
      p_date: date
    });

    if (slotsError) {
      console.error("Error fetching available slots from RPC:", slotsError);
      return NextResponse.json({ error: "Error al obtener los turnos del Box" }, { status: 500 });
    }

    return NextResponse.json({ slots: slots || [] });
  } catch (error: any) {
    console.error("Catastrophic error in GET public slots:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
