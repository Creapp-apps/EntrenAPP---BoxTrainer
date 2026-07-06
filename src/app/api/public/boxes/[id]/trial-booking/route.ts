import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const boxId = params.id;
    const body = await request.json();
    const { fullName, email, phone, date, slotId } = body;

    // 1. Basic validation
    if (!fullName || !email || !phone || !date || !slotId) {
      return NextResponse.json(
        { error: "Todos los campos (Nombre, Email, Teléfono, Fecha y Horario) son obligatorios" },
        { status: 400 }
      );
    }

    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 2. Fetch the box details & owner_id
    const { data: box, error: boxError } = await adminSupabase
      .from("boxes")
      .select("id, name, owner_id")
      .eq("id", boxId)
      .single();

    if (boxError || !box) {
      return NextResponse.json({ error: "Box no encontrado" }, { status: 404 });
    }

    if (!box.owner_id) {
      return NextResponse.json({ error: "El Box no tiene un administrador configurado" }, { status: 400 });
    }

    // 3. Check if user already exists in public.users
    const { data: existingUser, error: checkUserError } = await adminSupabase
      .from("users")
      .select("id, email")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        { error: "Este correo electrónico ya está registrado. Por favor, iniciá sesión para reservar tu turno." },
        { status: 400 }
      );
    }

    // 4. Validate slot availability (spots_available)
    const { data: slots, error: slotsError } = await adminSupabase.rpc("get_available_slots", {
      p_trainer_id: box.owner_id,
      p_date: date
    });

    if (slotsError) {
      console.error("Error checking slot availability:", slotsError);
      return NextResponse.json({ error: "Error al verificar la disponibilidad del turno" }, { status: 500 });
    }

    const selectedSlot = (slots || []).find((s: any) => s.slot_id === slotId);
    if (!selectedSlot) {
      return NextResponse.json({ error: "El horario seleccionado no existe o no está activo" }, { status: 400 });
    }

    if (selectedSlot.spots_available <= 0) {
      return NextResponse.json({ error: "No quedan cupos disponibles para el horario seleccionado" }, { status: 400 });
    }

    // 5. Generate random secure password for the new student
    const generatedPassword = `Prueba${Math.floor(100000 + Math.random() * 900000)}!`;

    // 6. Create the user in Supabase Auth
    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password: generatedPassword,
      email_confirm: true, // Auto-confirm so they don't get blocked
      user_metadata: {
        role: "student",
        full_name: fullName.trim(),
        box_id: boxId
      }
    });

    if (authError || !authData.user) {
      console.error("Error creating auth user:", authError);
      return NextResponse.json(
        { error: authError?.message || "Error al registrar la cuenta de usuario" },
        { status: 400 }
      );
    }

    const userId = authData.user.id;

    // 7. Upsert user profile to public.users to ensure phone and box_id are updated immediately
    const { error: profileError } = await adminSupabase
      .from("users")
      .upsert({
        id: userId,
        email: email.trim().toLowerCase(),
        role: "student",
        full_name: fullName.trim(),
        box_id: boxId,
        phone: phone.trim(),
        active: true
      });

    if (profileError) {
      console.error("Error upserting public profile:", profileError);
      // We continue since the auth user is created, but log the error
    }

    // 8. Create the trial booking in public.bookings directly bypassing subscription credits check
    const { data: booking, error: bookingError } = await adminSupabase
      .from("bookings")
      .insert({
        student_id: userId,
        slot_id: slotId,
        booking_date: date,
        status: "confirmada",
        subscription_id: null
      })
      .select()
      .single();

    if (bookingError) {
      console.error("Error inserting booking:", bookingError);
      return NextResponse.json(
        { error: "Se creó tu usuario pero falló la reserva de la clase. Por favor contactá al box." },
        { status: 500 }
      );
    }

    // 9. Send welcome/confirmation email in background
    try {
      fetch(`${new URL(request.url).origin}/api/auth/welcome-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), fullName: fullName.trim() })
      });
    } catch (emailErr) {
      console.error("Failed to send welcome email in background:", emailErr);
    }

    // 10. Return success response with generated password
    return NextResponse.json({
      success: true,
      booking,
      credentials: {
        email: email.trim().toLowerCase(),
        password: generatedPassword
      }
    });
  } catch (error: any) {
    console.error("Catastrophic error in trial booking:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
