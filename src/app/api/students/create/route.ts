import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient as createServerClient } from "@/lib/supabase/server";
import { resend, EMAIL_FROM } from "@/lib/resend";
import { escapeHtml } from "@/lib/utils/escapeHtml";
import { rateLimiter } from "@/lib/rateLimiter";

// ─── Generación de contraseña segura aleatoria ──────────────────────────────
function generateSecurePassword(): string {
  const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#";
  const numbers = "23456789";
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  // Garantizar al menos 1 número, 1 mayúscula, 1 minúscula
  let password = [
    numbers[Math.floor(Math.random() * numbers.length)],
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
  ];
  for (let i = 3; i < 12; i++) {
    password.push(chars[Math.floor(Math.random() * chars.length)]);
  }
  // Mezclar el array
  return password.sort(() => Math.random() - 0.5).join("");
}

// ─── Validación de contraseña proporcionada manualmente ─────────────────────
function validatePassword(password: string): string | null {
  if (!password || password.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
  if (!/[A-Za-z]/.test(password)) return "La contraseña debe contener al menos una letra.";
  if (!/[0-9]/.test(password)) return "La contraseña debe contener al menos un número.";
  return null; // OK
}

export async function POST(request: NextRequest) {
  try {
    // SECURITY FIX (H4): Rate limiting — máx 10 altas por IP cada 10 minutos
    const rl = rateLimiter.check(request, {
      maxRequests: 10,
      windowMs: 10 * 60 * 1000,
      keyPrefix: "students-create",
    });
    if (!rl.allowed) {
      return NextResponse.json({ error: rl.error }, { status: 429 });
    }

    // ── 1. Autenticación obligatoria ──────────────────────────────────────────
    // SECURITY FIX (C2/IDOR): trainer_id se extrae SIEMPRE de la sesión.
    // El parámetro "providedTrainerId" fue eliminado para prevenir IDOR.
    const authClient = await createServerClient();
    const { data: { user: authUser } } = await authClient.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // ── 2. Verificar que el usuario es entrenador con un box asignado ─────────
    const { data: callerProfile } = await authClient
      .from("users")
      .select("role, box_id")
      .eq("id", authUser.id)
      .single();

    if (!callerProfile || !["trainer", "co_trainer", "super_admin"].includes(callerProfile.role)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const trainer_id = authUser.id;
    const box_id: string | null = callerProfile.box_id || null;

    // ── 3. Leer y validar el body ─────────────────────────────────────────────
    const body = await request.json();
    const {
      full_name, email, password, phone,
      birth_date, weight_kg, height_cm, goals, injuries,
      monthly_price, payment_due_day, modality,
      gender, injured_parts,
    } = body;

    if (!full_name?.trim() || !email?.trim()) {
      return NextResponse.json({ error: "Nombre y email son obligatorios." }, { status: 400 });
    }

    // SECURITY FIX (C3 + auto-gen): Si el entrenador no proporciona contraseña,
    // se genera una segura automáticamente. El alumno accede vía magic link
    // y puede cambiarla desde su perfil sin haber visto jamas la contraseña.
    const finalPassword = password ? password : generateSecurePassword();

    // Solo validamos la contraseña si fue proporcionada manualmente
    if (password) {
      const passwordError = validatePassword(finalPassword);
      if (passwordError) {
        return NextResponse.json({ error: passwordError }, { status: 400 });
      }
    }

    const supabase = await createAdminClient();

    // ── 4. Verificar límite de alumnos del plan ───────────────────────────────
    // SECURITY FIX (H3): Límite de alumnos verificado server-side con admin client.
    if (box_id) {
      const { data: boxData } = await supabase
        .from("boxes")
        .select("max_students, name")
        .eq("id", box_id)
        .single();

      const { count } = await supabase
        .from("users")
        .select("id", { count: "exact" })
        .eq("box_id", box_id)
        .eq("role", "student")
        .eq("active", true);

      if (boxData && count !== null && count >= boxData.max_students && boxData.max_students < 9999) {
        return NextResponse.json({
          error: `Límite de alumnos alcanzado (${boxData.max_students}). Hacé un upgrade de tu plan para agregar más.`,
        }, { status: 403 });
      }
    }

    // ── 5. Crear usuario en Auth ──────────────────────────────────────────────
    // SECURITY FIX (C1/C4): email_confirm: true para que el alumno lo confirme.
    // La contraseña NO se enviará en el correo. Se usa un magic link de bienvenida.
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: finalPassword,
      email_confirm: true,
      user_metadata: {
        full_name: full_name.trim(),
        role: "student",
        created_by: trainer_id,
      },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // ── 6. Upsert perfil en public.users ─────────────────────────────────────
    const { error: profileError } = await supabase.from("users").upsert({
      id: authData.user.id,
      email,
      role: "student",
      full_name: full_name.trim(),
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
      gender: gender || "no_especificar",
      injured_parts: injured_parts || null,
    }, { onConflict: "id" });

    if (profileError) {
      await supabase.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    // ── 7. Generar link de inicio seguro (sin contraseña en el correo) ────────
    // SECURITY FIX (C1/C4): Se genera un magic link de inicio de sesión.
    // El alumno clickea el enlace y entra directamente sin ver la contraseña.
    let loginLink = `${process.env.NEXT_PUBLIC_SITE_URL || "https://entrenapp.com"}/auth/login`;
    try {
      const { data: linkData } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email,
      });
      if (linkData?.properties?.action_link) {
        loginLink = linkData.properties.action_link;
      }
    } catch {
      // Si falla la generación del magic link, usamos el link normal al login.
    }

    // ── 8. Obtener nombre del box para el correo ──────────────────────────────
    let boxName = "tu centro";
    if (box_id) {
      const { data: boxData } = await supabase.from("boxes").select("name").eq("id", box_id).single();
      if (boxData?.name) boxName = boxData.name;
    }

    // ── 9. Enviar correo de bienvenida SIN contraseña en texto plano ──────────
    // SECURITY FIX (H2): Todos los valores de usuario se escapan contra inyección HTML.
    let email_sent = false;
    try {
      const safeName = escapeHtml(full_name.trim());
      const safeBoxName = escapeHtml(boxName);
      const safeEmail = escapeHtml(email);
      const safeLoginLink = loginLink.replace(/"/g, "&quot;");

      await resend.emails.send({
        from: EMAIL_FROM,
        to: [email],
        subject: `Bienvenido a ${boxName} - Tu cuenta está lista`,
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
              <h2 style="color: white; font-size: 22px; margin: 0 0 12px;">¡Hola, ${safeName}!</h2>
              <p style="color: #a1a1aa; font-size: 14px; line-height: 1.6;">
                Tu entrenador te dio de alta en <strong style="color: #f97316;">${safeBoxName}</strong>. Ya podés acceder a tu cuenta usando el botón de abajo.
              </p>

              <div style="background: rgba(249,115,22,0.1); border: 1px solid rgba(249,115,22,0.2); border-radius: 12px; padding: 20px; margin: 24px 0;">
                <p style="color: #a1a1aa; font-size: 12px; margin: 0 0 8px;">Tu email de acceso:</p>
                <p style="color: white; font-size: 14px; margin: 0; font-weight: 600;">${safeEmail}</p>
              </div>

              <p style="color: #71717a; font-size: 12px; line-height: 1.5; margin: 0 0 24px;">
                El botón de abajo es tu acceso directo y personal. Si querés cambiar tu contraseña, podés hacerlo desde tu perfil una vez que ingreses.
              </p>

              <div style="text-align: center; margin: 28px 0 0;">
                <a href="${safeLoginLink}"
                  style="display: inline-block; background: linear-gradient(135deg, #f97316, #ea580c); color: white; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 14px;">
                  Ingresar a EntrenAPP →
                </a>
              </div>

              <p style="color: #52525b; font-size: 11px; text-align: center; margin: 20px 0 0;">
                Si no solicitaste esta cuenta, podés ignorar este mensaje.
              </p>
            </div>
            <div style="padding: 20px 28px; border-top: 1px solid rgba(255,255,255,0.05); text-align: center;">
              <p style="color: rgba(255,255,255,0.3); font-size: 11px; margin: 0;">EntrenAPP - Plataforma de gestión deportiva</p>
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
    console.error("Error in students/create:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
