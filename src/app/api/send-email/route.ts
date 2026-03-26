import { resend, EMAIL_FROM } from "@/lib/resend";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No auth" }, { status: 401 });

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["trainer", "super_admin"].includes(profile.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await request.json();
  const { to, subject, type, data: emailData } = body;

  if (!to || !subject || !type) {
    return NextResponse.json({ error: "Faltan campos: to, subject, type" }, { status: 400 });
  }

  try {
    let html = "";

    switch (type) {
      case "welcome":
        html = welcomeTemplate(emailData);
        break;
      case "new_box":
        html = newBoxTemplate(emailData);
        break;
      case "subscription_alert":
        html = subscriptionAlertTemplate(emailData);
        break;
      case "password_reset":
        html = passwordResetTemplate(emailData);
        break;
      default:
        html = genericTemplate(emailData);
    }

    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data?.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── Email Templates ───────────────────────────────────────

function baseWrapper(content: string) {
  return `
    <div style="font-family: 'Segoe UI', -apple-system, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0b; color: #e4e4e7; border-radius: 16px; overflow: hidden;">
      <div style="padding: 32px 28px; border-bottom: 1px solid rgba(255,255,255,0.05);">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, #6366f1, #a855f7); display: flex; align-items: center; justify-content: center;">
            <span style="color: white; font-weight: 900; font-size: 14px;">CA</span>
          </div>
          <span style="color: white; font-weight: 700; font-size: 18px;">CreAPP</span>
        </div>
      </div>
      <div style="padding: 32px 28px;">
        ${content}
      </div>
      <div style="padding: 20px 28px; border-top: 1px solid rgba(255,255,255,0.05); text-align: center;">
        <p style="color: rgba(255,255,255,0.3); font-size: 11px; margin: 0;">© ${new Date().getFullYear()} CreAPP · Plataforma de gestión deportiva</p>
      </div>
    </div>
  `;
}

function welcomeTemplate(data: any) {
  return baseWrapper(`
    <h2 style="color: white; font-size: 22px; margin: 0 0 12px;">¡Bienvenido a CreAPP! 🎉</h2>
    <p style="color: #a1a1aa; font-size: 14px; line-height: 1.6;">
      Hola <strong style="color: white;">${data?.name || "Entrenador"}</strong>, tu cuenta fue creada exitosamente.
    </p>
    ${data?.tempPassword ? `
      <div style="background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.2); border-radius: 12px; padding: 16px; margin: 20px 0;">
        <p style="color: #a1a1aa; font-size: 12px; margin: 0 0 6px;">Tu contraseña temporal:</p>
        <p style="color: white; font-size: 20px; font-weight: 700; margin: 0; letter-spacing: 2px;">${data.tempPassword}</p>
      </div>
      <p style="color: #71717a; font-size: 12px;">Cambiala después de tu primer inicio de sesión.</p>
    ` : ""}
    <a href="${data?.loginUrl || "#"}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 14px; margin-top: 16px;">
      Ingresar a CreAPP →
    </a>
  `);
}

function newBoxTemplate(data: any) {
  return baseWrapper(`
    <h2 style="color: white; font-size: 22px; margin: 0 0 12px;">🏋️ Nuevo Box creado</h2>
    <p style="color: #a1a1aa; font-size: 14px; line-height: 1.6;">
      Se creó el centro <strong style="color: white;">${data?.boxName || "—"}</strong> con el plan <strong style="color: #818cf8;">${data?.plan || "starter"}</strong>.
    </p>
    <div style="background: rgba(255,255,255,0.03); border-radius: 12px; padding: 16px; margin: 20px 0;">
      <p style="color: #71717a; font-size: 12px; margin: 0;">Administrador: <strong style="color: white;">${data?.ownerName || "—"}</strong></p>
      <p style="color: #71717a; font-size: 12px; margin: 6px 0 0;">Email: <strong style="color: white;">${data?.ownerEmail || "—"}</strong></p>
    </div>
  `);
}

function subscriptionAlertTemplate(data: any) {
  return baseWrapper(`
    <h2 style="color: white; font-size: 22px; margin: 0 0 12px;">⚠️ Alerta de suscripción</h2>
    <p style="color: #a1a1aa; font-size: 14px; line-height: 1.6;">
      La suscripción de <strong style="color: white;">${data?.boxName || "—"}</strong> ${data?.message || "requiere atención"}.
    </p>
    <div style="background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.2); border-radius: 12px; padding: 16px; margin: 20px 0;">
      <p style="color: #fbbf24; font-size: 14px; font-weight: 600; margin: 0;">${data?.status || "Pendiente"}</p>
      ${data?.dueDate ? `<p style="color: #71717a; font-size: 12px; margin: 6px 0 0;">Vencimiento: ${data.dueDate}</p>` : ""}
    </div>
  `);
}

function passwordResetTemplate(data: any) {
  return baseWrapper(`
    <h2 style="color: white; font-size: 22px; margin: 0 0 12px;">🔐 Reset de contraseña</h2>
    <p style="color: #a1a1aa; font-size: 14px; line-height: 1.6;">
      Tu nueva contraseña temporal es:
    </p>
    <div style="background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.2); border-radius: 12px; padding: 16px; margin: 20px 0; text-align: center;">
      <p style="color: white; font-size: 24px; font-weight: 700; margin: 0; letter-spacing: 3px;">${data?.tempPassword || "—"}</p>
    </div>
    <a href="${data?.loginUrl || "#"}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 14px;">
      Ingresar →
    </a>
  `);
}

function genericTemplate(data: any) {
  return baseWrapper(`
    <h2 style="color: white; font-size: 22px; margin: 0 0 12px;">${data?.title || "Notificación"}</h2>
    <p style="color: #a1a1aa; font-size: 14px; line-height: 1.6;">${data?.message || ""}</p>
  `);
}
