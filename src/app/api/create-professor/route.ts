import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient as createServerClient } from "@/lib/supabase/server";
import { resend, EMAIL_FROM } from "@/lib/resend";
import { escapeHtml } from "@/lib/utils/escapeHtml";
import { rateLimiter } from "@/lib/rateLimiter";

export async function POST(request: NextRequest) {
  try {
    // SECURITY FIX (H4): Rate limiting — máx 10 profesores por IP cada 30 minutos
    const rl = rateLimiter.check(request, {
      maxRequests: 10,
      windowMs: 30 * 60 * 1000,
      keyPrefix: "create-professor",
    });
    if (!rl.allowed) {
      return NextResponse.json({ error: rl.error }, { status: 429 });
    }

    const body = await request.json();
    const { name, email, password } = body;

    if (!name?.trim() || !email?.trim() || !password) {
      return NextResponse.json(
        { error: "Nombre, email y contraseña son obligatorios" },
        { status: 400 }
      );
    }

    // SECURITY FIX (C3): Validar complejidad de contraseña
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 8 caracteres, una letra y un número." },
        { status: 400 }
      );
    }

    // 1. Verificar que quien llama es un trainer autenticado
    const authClient = await createServerClient();
    const { data: { user: caller } } = await authClient.auth.getUser();
    if (!caller) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // 2. Obtener el box_id del trainer que está creando al profesor
    const adminSupabase = await createAdminClient();
    const { data: trainerProfile } = await adminSupabase
      .from("users")
      .select("role, box_id")
      .eq("id", caller.id)
      .single();

    if (!trainerProfile || !["trainer", "co_trainer"].includes(trainerProfile.role)) {
      return NextResponse.json({ error: "Solo entrenadores pueden crear profesores" }, { status: 403 });
    }

    const box_id = trainerProfile.box_id;
    if (!box_id) {
      return NextResponse.json({ error: "No tenés un centro asignado" }, { status: 400 });
    }

    // 3. Crear usuario en Auth con admin API (email_confirm: false para forzar verificación)
    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // 👈 Ahora requiere verificación por email antes de loguear
      app_metadata: { role: "professor" },
      user_metadata: {
        full_name: name.trim(),
        role: "professor",
        created_by: caller.id,
      },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // 4. Insertar perfil en public.users con el box_id del trainer
    const { error: profileError } = await adminSupabase.from("users").upsert({
      id: authData.user.id,
      email,
      full_name: name.trim(),
      role: "professor",
      active: true,
      created_by: caller.id,
      box_id: box_id,
    }, { onConflict: "id" });

    if (profileError) {
      // Rollback: eliminar el usuario de auth si falla el perfil
      await adminSupabase.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    // 5. Generar Link oficial de verificación (Signup confirmation)
    const origin = new URL(request.url).origin;
    const { data: linkData, error: linkError } = await adminSupabase.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

    if (linkError || !linkData?.properties?.action_link) {
      console.error("Error generando link de verificación:", linkError);
      // No hacemos rollback total porque el usuario existe, pero avisamos del éxito parcial
      return NextResponse.json({
        success: true,
        warning: "Profesor creado, pero no se pudo generar el enlace de activación automáticamente.",
        professor_id: authData.user.id,
      });
    }

    const verifyUrl = linkData.properties.action_link;

    // 6. Enviar Email de bienvenida con el link usando Resend
    // SECURITY FIX (H2): Escapar variables de usuario para prevenir HTML injection
    // SECURITY FIX (C1/C4): La contraseña NO se incluye en el email
    try {
      const safeName = escapeHtml(name.trim());
      const safeEmail = escapeHtml(email);
      const safeVerifyUrl = verifyUrl.replace(/"/g, "&quot;");
      const year = new Date().getFullYear();
      const emailHtml = `
        <div style="font-family: 'Segoe UI', -apple-system, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0b; color: #e4e4e7; border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.05);">
          <div style="padding: 32px 28px; border-bottom: 1px solid rgba(255,255,255,0.05);">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, #6366f1, #a855f7); display: flex; align-items: center; justify-content: center;">
                <span style="color: white; font-weight: 900; font-size: 14px;">CA</span>
              </div>
              <span style="color: white; font-weight: 700; font-size: 18px; margin-left: 8px;">EntrenAPP</span>
            </div>
          </div>
          <div style="padding: 32px 28px;">
            <h2 style="color: white; font-size: 22px; margin: 0 0 12px;">¡Bienvenido al Equipo! 🏋️</h2>
            <p style="color: #a1a1aa; font-size: 14px; line-height: 1.6;">
              Hola <strong style="color: white;">${safeName}</strong>, fuiste agregado como <strong>Profesor</strong> en la plataforma.
            </p>
            <p style="color: #a1a1aa; font-size: 14px; line-height: 1.6;">
              Hacé clic en el botón de abajo para activar tu cuenta:
            </p>

            <div style="text-align: center; margin: 32px 0;">
              <a href="${safeVerifyUrl}" style="display: inline-block; background: #6366f1; color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 15px; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);">
                Verificar y activar cuenta →
              </a>
            </div>

            <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 16px; margin-top: 20px;">
              <p style="color: #a1a1aa; font-size: 12px; margin: 0 0 6px;">Tu email de acceso:</p>
              <p style="color: #e4e4e7; font-size: 13px; margin: 0; font-weight: 600;">${safeEmail}</p>
            </div>
            <p style="color: #71717a; font-size: 12px; margin-top: 16px;">Podés cambiar tu contraseña desde tu perfil una vez que ingreses. Si no esperabas este mensaje, podés ignorarlo.</p>
          </div>
          <div style="padding: 20px 28px; border-top: 1px solid rgba(255,255,255,0.05); text-align: center;">
            <p style="color: rgba(255,255,255,0.3); font-size: 11px; margin: 0;">© ${year} EntrenAPP · Plataforma de gestión deportiva</p>
          </div>
        </div>
      `;

      await resend.emails.send({
        from: EMAIL_FROM,
        to: [email],
        subject: "Verificá tu cuenta de Profesor en EntrenAPP ⚡",
        html: emailHtml,
      });
    } catch (emailErr) {
      console.error("Error enviando email vía Resend:", emailErr);
    }

    return NextResponse.json({
      success: true,
      professor_id: authData.user.id,
    });
  } catch (error: any) {
    console.error("Create professor error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
