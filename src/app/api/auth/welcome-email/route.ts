import { NextRequest, NextResponse } from "next/server";
import { resend, EMAIL_FROM } from "@/lib/resend";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, fullName } = body;

    if (!email || !fullName) {
      return NextResponse.json({ error: "Email y Nombre son obligatorios" }, { status: 400 });
    }

    const firstName = fullName.split(" ")[0];

    const emailHtml = `
      <div style="font-family: 'Segoe UI', -apple-system, sans-serif; max-width: 600px; margin: 0 auto; background: #050508; color: #ffffff; border-radius: 24px; overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.05); box-shadow: 0 20px 50px rgba(0,0,0,0.3);">
        
        <!-- Encabezado Premium -->
        <div style="padding: 32px; background: linear-gradient(to right, #050508, #0f0e14); border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
          <div style="display: flex; align-items: center;">
            <div style="width: 40px; height: 40px; border-radius: 12px; background: linear-gradient(135deg, #ea580c, #f97316); display: inline-block; text-align: center; line-height: 40px; font-weight: bold; color: white; font-size: 20px; vertical-align: middle;">
              E
            </div>
            <span style="color: #ffffff; font-weight: 800; font-size: 20px; margin-left: 12px; letter-spacing: -0.5px; vertical-align: middle;">EntrenAPP</span>
          </div>
        </div>

        <!-- Contenido Principal -->
        <div style="padding: 40px 32px; background-color: #08080c;">
          <div style="width: 64px; height: 64px; border-radius: 20px; background: rgba(234, 88, 12, 0.1); display: flex; align-items: center; justify-content: center; margin-bottom: 24px; text-align: center; line-height: 64px; font-size: 32px;">
            🎉
          </div>

          <h2 style="color: #ffffff; font-size: 26px; font-weight: 800; margin: 0 0 12px; letter-spacing: -0.5px;">
            ¡Bienvenido a la elite, ${firstName}! 🏋️‍♂️
          </h2>
          
          <p style="color: #a1a1aa; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
            Tu cuenta en <strong>EntrenAPP</strong> ha sido creada de forma totalmente exitosa. Estamos listos para ayudarte a llevar tu rendimiento físico al siguiente nivel.
          </p>

          <!-- Caja de Información Útil -->
          <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 20px; margin-bottom: 32px;">
            <h3 style="color: #f97316; font-size: 13px; font-weight: 700; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 1px;">Detalles de tu cuenta:</h3>
            <p style="color: #e4e4e7; font-size: 14px; margin: 4px 0;"><strong>📧 Usuario:</strong> ${email}</p>
            <p style="color: #e4e4e7; font-size: 14px; margin: 4px 0;"><strong>✅ Estado:</strong> Activo</p>
          </div>

          <p style="color: #a1a1aa; font-size: 14px; line-height: 1.6; margin-bottom: 32px;">
            Si fuiste invitado por un coach o box específico, asegúrate de iniciar sesión en tu dispositivo y presionar el botón de <strong>Confirmar Invitación</strong> dentro del panel para sincronizar tu planificación semanal.
          </p>

          <!-- Botón de Acción -->
          <div style="text-align: center; margin-top: 20px;">
            <a href="https://box-trainer-app.vercel.app/auth/login" style="display: inline-block; background: linear-gradient(to right, #ea580c, #f97316); color: #ffffff; font-weight: 700; font-size: 15px; padding: 16px 40px; border-radius: 14px; text-decoration: none; box-shadow: 0 10px 25px rgba(234, 88, 12, 0.25);">
              Ir a mi Panel de Atleta →
            </a>
          </div>
        </div>

        <!-- Footer del Email -->
        <div style="padding: 24px 32px; background: #050508; border-top: 1px solid rgba(255, 255, 255, 0.05); text-align: center;">
          <p style="color: #52525b; font-size: 12px; margin: 0;">
            Este es un correo automatizado de confirmación de registro.
          </p>
          <p style="color: #52525b; font-size: 11px; margin: 6px 0 0;">
            © ${new Date().getFullYear()} EntrenAPP Inc. Todos los derechos reservados.
          </p>
        </div>
      </div>
    `;

    // Enviar Email usando Resend
    await resend.emails.send({
      from: EMAIL_FROM,
      to: [email],
      subject: "¡Te damos la bienvenida a EntrenAPP! ⚡🏋️‍♂️",
      html: emailHtml,
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Error enviando mail de bienvenida:", error);
    // No queremos colapsar el flujo del cliente si solo falla el correo secundario, devolvemos 200 con false para no bloquear
    return NextResponse.json({ success: false, message: "Error de correo secundario" });
  }
}
