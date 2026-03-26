import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { resend, EMAIL_FROM } from "@/lib/resend";

// Plan limits configuration
const PLAN_LIMITS: Record<string, { max_students: number; max_professors: number; max_activities: number }> = {
  starter: { max_students: 30, max_professors: 1, max_activities: 2 },
  pro: { max_students: 80, max_professors: 3, max_activities: 5 },
  elite: { max_students: 9999, max_professors: 9999, max_activities: 9999 },
};

export async function POST(request: NextRequest) {
  // Verify caller is super_admin
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No auth" }, { status: 401 });

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { name, email, ownerName, password, plan, price, trialDays } = body;

  if (!name?.trim() || !email?.trim() || !ownerName?.trim() || !password?.trim()) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  const selectedPlan = plan || "starter";
  const limits = PLAN_LIMITS[selectedPlan] || PLAN_LIMITS.starter;

  // Use service role to create user without switching sessions
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Create auth user
  const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 });

  const newUserId = authData.user.id;

  // 2. Create user profile FIRST (FK on boxes requires it)
  const { error: profileError } = await adminSupabase.from("users").insert({
    id: newUserId,
    email,
    full_name: ownerName.trim(),
    role: "trainer",
    active: true,
  });
  if (profileError) {
    await adminSupabase.auth.admin.deleteUser(newUserId);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  // 3. Create box with plan limits
  const { data: boxData, error: boxError } = await adminSupabase
    .from("boxes")
    .insert({
      name: name.trim(),
      owner_id: newUserId,
      status: "trial",
      max_students: limits.max_students,
      max_professors: limits.max_professors,
    })
    .select()
    .single();
  if (boxError) {
    await adminSupabase.from("users").delete().eq("id", newUserId);
    await adminSupabase.auth.admin.deleteUser(newUserId);
    return NextResponse.json({ error: boxError.message }, { status: 500 });
  }

  // 4. Update user with box_id
  await adminSupabase.from("users").update({ box_id: boxData.id }).eq("id", newUserId);

  // 5. Create subscription with trial
  const days = trialDays || 14;
  const now = new Date();
  const trialEnd = new Date(now);
  trialEnd.setDate(trialEnd.getDate() + days);

  await adminSupabase.from("box_subscriptions").insert({
    box_id: boxData.id,
    plan_name: selectedPlan,
    price: price || 0,
    status: "trial",
    current_period_start: now.toISOString().split("T")[0],
    current_period_end: trialEnd.toISOString().split("T")[0],
  });

  // 6. Send welcome email via Resend
  const planLabel = selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1);
  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: [email],
      subject: `🎉 Bienvenido a EntrenAPP — ${name}`,
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
            <h2 style="color: white; font-size: 22px; margin: 0 0 12px;">¡Bienvenido a EntrenAPP! 🎉</h2>
            <p style="color: #a1a1aa; font-size: 14px; line-height: 1.6;">
              Hola <strong style="color: white;">${ownerName}</strong>, tu centro <strong style="color: #f97316;">${name}</strong> fue creado exitosamente.
            </p>
            <div style="background: rgba(249,115,22,0.1); border: 1px solid rgba(249,115,22,0.2); border-radius: 12px; padding: 16px; margin: 20px 0;">
              <p style="color: #a1a1aa; font-size: 12px; margin: 0 0 4px;">Email: <strong style="color: white;">${email}</strong></p>
              <p style="color: #a1a1aa; font-size: 12px; margin: 0 0 4px;">Contraseña: <strong style="color: white; font-size: 16px; letter-spacing: 1px;">${password}</strong></p>
              <p style="color: #71717a; font-size: 11px; margin: 8px 0 0;">Cambiala después de iniciar sesión.</p>
            </div>
            <p style="color: #a1a1aa; font-size: 14px;">Plan: <strong style="color: white;">${planLabel}</strong> · Trial ${days} días</p>
            <p style="color: #a1a1aa; font-size: 13px; margin-top: 4px;">Hasta ${limits.max_students === 9999 ? "∞" : limits.max_students} alumnos · ${limits.max_professors === 9999 ? "∞" : limits.max_professors} profesores · ${limits.max_activities === 9999 ? "∞" : limits.max_activities} actividades</p>
          </div>
          <div style="padding: 20px 28px; border-top: 1px solid rgba(255,255,255,0.05); text-align: center;">
            <p style="color: rgba(255,255,255,0.3); font-size: 11px; margin: 0;">© ${new Date().getFullYear()} EntrenAPP · Plataforma de gestión deportiva</p>
          </div>
        </div>
      `,
    });
  } catch (emailErr) {
    console.error("Email send error:", emailErr);
  }

  return NextResponse.json({
    success: true,
    box: boxData,
  });
}
