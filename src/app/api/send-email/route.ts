import { resend, EMAIL_FROM } from "@/lib/resend";
import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { escapeHtml } from "@/lib/utils/escapeHtml";
import { rateLimiter } from "@/lib/rateLimiter";

// Tipos de email permitidos
const ALLOWED_EMAIL_TYPES = ["welcome", "new_box", "subscription_alert", "password_reset", "generic"] as const;
type EmailType = (typeof ALLOWED_EMAIL_TYPES)[number];

export async function POST(request: NextRequest) {
  // SECURITY FIX (H4): Rate limiting — máx 20 emails por IP cada hora
  const rl = rateLimiter.check(request, {
    maxRequests: 20,
    windowMs: 60 * 60 * 1000,
    keyPrefix: "send-email",
  });
  if (!rl.allowed) {
    return NextResponse.json({ error: rl.error }, { status: 429 });
  }

  // ── 1. Autenticación obligatoria ─────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  // ── 2. Verificar rol autorizado y obtener box_id ──────────────────────────
  const { data: profile } = await supabase
    .from("users")
    .select("role, box_id")
    .eq("id", user.id)
    .single();

  if (!profile || !["trainer", "super_admin"].includes(profile.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const callerBoxId = profile.box_id as string | null;

  const body = await request.json();
  const { to, subject, type, data: emailData } = body;

  if (!to || !subject || !type) {
    return NextResponse.json({ error: "Faltan campos: to, subject, type" }, { status: 400 });
  }

  // ── 3. Validar tipo de email contra lista de permitidos ───────────────────
  if (!ALLOWED_EMAIL_TYPES.includes(type as EmailType)) {
    return NextResponse.json({ error: "Tipo de email no permitido" }, { status: 400 });
  }

  // ── 4. SECURITY FIX (H1): Validar que los destinatarios pertenecen al box ─
  // super_admin puede enviar a cualquier dirección (interno y admin)
  if (profile.role !== "super_admin") {
    const recipients: string[] = Array.isArray(to) ? to : [to];

    if (!callerBoxId) {
      return NextResponse.json({ error: "No tenés un centro asignado" }, { status: 400 });
    }

    // Verificar que todos los destinatarios son miembros del mismo box
    const adminSupa = await createAdminClient();
    const { data: boxMembers } = await adminSupa
      .from("users")
      .select("email")
      .eq("box_id", callerBoxId)
      .in("email", recipients);

    const validEmails = new Set((boxMembers || []).map((m: { email: string }) => m.email.toLowerCase()));
    const invalidRecipients = recipients.filter(r => !validEmails.has(r.toLowerCase()));

    if (invalidRecipients.length > 0) {
      return NextResponse.json({
        error: "Solo podés enviar emails a miembros de tu centro deportivo.",
      }, { status: 403 });
    }
  }

  // ── 5. Generar HTML con datos escapados ───────────────────────────────────
  try {
    const recipients = Array.isArray(to) ? to : [to];
    let html = "";

    switch (type as EmailType) {
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
      to: recipients,
      subject: escapeHtml(subject),
      html,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data?.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── Email Templates (con escapeHtml aplicado a todas las variables de usuario) ─

function baseWrapper(content: string) {
  const year = new Date().getFullYear();
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
        <p style="color: rgba(255,255,255,0.3); font-size: 11px; margin: 0;">© ${year} CreAPP · Plataforma de gestión deportiva</p>
      </div>
    </div>
  `;
}

// SECURITY FIX (H2): todas las variables de usuario se escapan con escapeHtml()
function welcomeTemplate(data: Record<string, unknown>) {
  const safeName = escapeHtml(String(data?.name || "Entrenador"));
  const safeLoginUrl = String(data?.loginUrl || "#").replace(/"/g, "&quot;");
  return baseWrapper(`
    <h2 style="color: white; font-size: 22px; margin: 0 0 12px;">¡Bienvenido a CreAPP! 🎉</h2>
    <p style="color: #a1a1aa; font-size: 14px; line-height: 1.6;">
      Hola <strong style="color: white;">${safeName}</strong>, tu cuenta fue creada exitosamente.
    </p>
    <a href="${safeLoginUrl}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 14px; margin-top: 16px;">
      Ingresar a CreAPP →
    </a>
  `);
}

function newBoxTemplate(data: Record<string, unknown>) {
  const safeBoxName = escapeHtml(String(data?.boxName || "—"));
  const safePlan = escapeHtml(String(data?.plan || "starter"));
  const safeOwnerName = escapeHtml(String(data?.ownerName || "—"));
  const safeOwnerEmail = escapeHtml(String(data?.ownerEmail || "—"));
  return baseWrapper(`
    <h2 style="color: white; font-size: 22px; margin: 0 0 12px;">🏋️ Nuevo Box creado</h2>
    <p style="color: #a1a1aa; font-size: 14px; line-height: 1.6;">
      Se creó el centro <strong style="color: white;">${safeBoxName}</strong> con el plan <strong style="color: #818cf8;">${safePlan}</strong>.
    </p>
    <div style="background: rgba(255,255,255,0.03); border-radius: 12px; padding: 16px; margin: 20px 0;">
      <p style="color: #71717a; font-size: 12px; margin: 0;">Administrador: <strong style="color: white;">${safeOwnerName}</strong></p>
      <p style="color: #71717a; font-size: 12px; margin: 6px 0 0;">Email: <strong style="color: white;">${safeOwnerEmail}</strong></p>
    </div>
  `);
}

function subscriptionAlertTemplate(data: Record<string, unknown>) {
  const safeBoxName = escapeHtml(String(data?.boxName || "—"));
  const safeMessage = escapeHtml(String(data?.message || "requiere atención"));
  const safeStatus = escapeHtml(String(data?.status || "Pendiente"));
  const safeDueDate = data?.dueDate ? escapeHtml(String(data.dueDate)) : null;
  return baseWrapper(`
    <h2 style="color: white; font-size: 22px; margin: 0 0 12px;">⚠️ Alerta de suscripción</h2>
    <p style="color: #a1a1aa; font-size: 14px; line-height: 1.6;">
      La suscripción de <strong style="color: white;">${safeBoxName}</strong> ${safeMessage}.
    </p>
    <div style="background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.2); border-radius: 12px; padding: 16px; margin: 20px 0;">
      <p style="color: #fbbf24; font-size: 14px; font-weight: 600; margin: 0;">${safeStatus}</p>
      ${safeDueDate ? `<p style="color: #71717a; font-size: 12px; margin: 6px 0 0;">Vencimiento: ${safeDueDate}</p>` : ""}
    </div>
  `);
}

function passwordResetTemplate(data: Record<string, unknown>) {
  const safeLoginUrl = String(data?.loginUrl || "#").replace(/"/g, "&quot;");
  // SECURITY FIX (C1): No se expone la contraseña en texto plano; se envía link de acceso
  return baseWrapper(`
    <h2 style="color: white; font-size: 22px; margin: 0 0 12px;">🔐 Recuperá tu acceso</h2>
    <p style="color: #a1a1aa; font-size: 14px; line-height: 1.6;">
      Hacé clic en el botón de abajo para ingresar y cambiar tu contraseña desde tu perfil.
    </p>
    <div style="text-align: center; margin: 24px 0;">
      <a href="${safeLoginUrl}" style="display: inline-block; background: #6366f1; color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 14px;">
        Ingresar y cambiar contraseña →
      </a>
    </div>
    <p style="color: #52525b; font-size: 11px; text-align: center;">
      Si no solicitaste esto, podés ignorar este mensaje.
    </p>
  `);
}

function genericTemplate(data: Record<string, unknown>) {
  const safeTitle = escapeHtml(String(data?.title || "Notificación"));
  const safeMessage = escapeHtml(String(data?.message || ""));
  return baseWrapper(`
    <h2 style="color: white; font-size: 22px; margin: 0 0 12px;">${safeTitle}</h2>
    <p style="color: #a1a1aa; font-size: 14px; line-height: 1.6;">${safeMessage}</p>
  `);
}
