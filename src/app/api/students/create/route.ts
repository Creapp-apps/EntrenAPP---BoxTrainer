import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient as createServerClient } from "@/lib/supabase/server";
import { resend, EMAIL_FROM } from "@/lib/resend";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      full_name, email, password, phone, trainer_id: providedTrainerId,
      birth_date, weight_kg, height_cm, goals, injuries,
      monthly_price, payment_due_day, modality,
    } = body;

    // Get trainer_id from auth if not provided
    let trainer_id = providedTrainerId;
    let box_id: string | null = null;
    if (!trainer_id) {
      const authClient = await createServerClient();
      const { data: { user: authUser } } = await authClient.auth.getUser();
      if (authUser) {
        trainer_id = authUser.id;
        const { data: profile } = await authClient.from("users").select("box_id").eq("id", authUser.id).single();
        box_id = profile?.box_id || null;
      }
    } else {
      const adminSupa = await createAdminClient();
      const { data: profile } = await adminSupa.from("users").select("box_id").eq("id", trainer_id).single();
      box_id = profile?.box_id || null;
    }

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

    // 2. Upsert perfil en public.users (el trigger puede haberlo creado ya)
    const { error: profileError } = await supabase.from("users").upsert({
      id: authData.user.id,
      email,
      role: "student",
      full_name,
      phone: phone || null,
      active: true,
      created_by: trainer_id,
      box_id: box_id,
      birth_date: birth_date || null,
      weight_kg: weight_kg || null,
      height_cm: height_cm || null,
      goals: goals || null,
      injuries: injuries || null,
      monthly_price: monthly_price || null,
      payment_due_day: payment_due_day || 1,
      modality: modality || "presencial",
    }, { onConflict: "id" });

    if (profileError) {
      await supabase.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    // 3. Get box name for the email
    let boxName = "tu centro";
    if (box_id) {
      const { data: boxData } = await supabase.from("boxes").select("name").eq("id", box_id).single();
      if (boxData?.name) boxName = boxData.name;
    }

    // 4. Send welcome email
    let email_sent = false;
    try {
      await resend.emails.send({
        from: EMAIL_FROM,
        to: [email],
        subject: "Bienvenido a " + boxName + " - Tu cuenta esta lista",
        html: `
          <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0b; color: #e4e4e7; border-radius: 16px; overflow: hidden;">
            <div style="padding: 32px 28px; border-bottom: 1px solid rgba(255,255,255,0.05);">
              <div style="display: inline-flex; align-items: center; gap: 10px;">
                <div style="width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, #f97316, #ea580c); display: inline-flex; align-items: center; justify-content: center;">
                  <span style="color: white; font-weight: 900; font-size: 14px;">EA</span>
                </div>
                <span style="color: white; font-weight: 700; font-size: 18px;">EntrenAPP</span>
              </div>
            </div>
            <div style="padding: 32px 28px;">
              <h2 style="color: white; font-size: 22px; margin: 0 0 12px;">Hola ${full_name}!</h2>
              <p style="color: #a1a1aa; font-size: 14px; line-height: 1.6;">
                Tu entrenador te dio de alta en <strong style="color: #f97316;">${boxName}</strong>. Ya podes acceder a tu cuenta.
              </p>

              <div style="background: rgba(249,115,22,0.1); border: 1px solid rgba(249,115,22,0.2); border-radius: 12px; padding: 20px; margin: 24px 0;">
                <p style="color: #a1a1aa; font-size: 12px; margin: 0 0 8px;">Tus datos de acceso:</p>
                <p style="color: white; font-size: 14px; margin: 0 0 6px;">
                  <strong>Email:</strong> ${email}
                </p>
                <p style="color: white; font-size: 14px; margin: 0;">
                  <strong>Contrasena:</strong> <span style="font-size: 18px; letter-spacing: 1px; color: #f97316; font-weight: 700;">${password}</span>
                </p>
              </div>

              <p style="color: #71717a; font-size: 12px; line-height: 1.5; margin: 16px 0;">
                Te recomendamos cambiar tu contrasena despues de iniciar sesion por primera vez desde tu perfil.
              </p>

              <div style="text-align: center; margin: 28px 0 0;">
                <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://entrenapp.com'}/login"
                  style="display: inline-block; background: linear-gradient(135deg, #f97316, #ea580c); color: white; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 14px;">
                  Iniciar sesion
                </a>
              </div>
            </div>
            <div style="padding: 20px 28px; border-top: 1px solid rgba(255,255,255,0.05); text-align: center;">
              <p style="color: rgba(255,255,255,0.3); font-size: 11px; margin: 0;">EntrenAPP - Plataforma de gestion deportiva</p>
            </div>
          </div>
        `,
      });
      email_sent = true;
    } catch (emailErr) {
      console.error("Welcome email error:", emailErr);
    }

    return NextResponse.json({ success: true, student_id: authData.user.id, email_sent });
  } catch (error) {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
