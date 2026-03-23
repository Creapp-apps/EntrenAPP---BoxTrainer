import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      full_name, email, password, phone, trainer_id,
      birth_date, weight_kg, height_cm, goals, injuries,
      monthly_price, payment_due_day,
    } = body;

    const supabase = await createAdminClient();

    // 1. Crear usuario en Auth con service role
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        role: "student",
        created_by: trainer_id,
      },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // 2. Insertar perfil en public.users
    const { error: profileError } = await supabase.from("users").insert({
      id: authData.user.id,
      email,
      role: "student",
      full_name,
      phone: phone || null,
      active: true,
      created_by: trainer_id,
      birth_date: birth_date || null,
      weight_kg: weight_kg || null,
      height_cm: height_cm || null,
      goals: goals || null,
      injuries: injuries || null,
      monthly_price: monthly_price || null,
      payment_due_day: payment_due_day || 1,
    });

    if (profileError) {
      // Si falla el perfil, eliminar el usuario de auth para no dejar inconsistencia
      await supabase.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, student_id: authData.user.id });
  } catch (error) {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
