import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Por defecto redirigir al raíz para que el middleware evalúe al usuario logueado
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    
    // Intercambiar el código de autorización de OAuth/OTP por una sesión
    const { data: authData, error: authError } = await supabase.auth.exchangeCodeForSession(code);

    if (!authError && authData?.user) {
      const user = authData.user;
      const cookieStore = await cookies();
      
      // Revisar si existía una invitación pendiente almacenada en las cookies
      const pendingBoxId = cookieStore.get("pending_invite_box_id")?.value;

      if (pendingBoxId && pendingBoxId.length > 10) {
        const adminSupabase = await createAdminClient();
        
        // 1. Buscar el perfil público del usuario recién logueado
        const { data: profile } = await adminSupabase
          .from("users")
          .select("box_id, role")
          .eq("id", user.id)
          .single();

        // 2. Si existe el perfil y es un alumno que aún no tiene Box asignado, vincularlo
        if (profile && !profile.box_id && profile.role === "student") {
          const { error: updateError } = await adminSupabase
            .from("users")
            .update({ box_id: pendingBoxId })
            .eq("id", user.id);
            
          if (!updateError) {
            console.log(`[Auth Callback] Se vinculó exitosamente al usuario ${user.email} al Box ${pendingBoxId}`);
          } else {
            console.error("[Auth Callback] Error vinculando Box:", updateError);
          }
        }

        // 3. Eliminar la cookie de invitación pendiente ya consumida
        try {
          cookieStore.delete("pending_invite_box_id");
        } catch {
          // Ignorar fallos menores limpiando la cookie
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Si el código no existe o falla la autenticación, enviar al login con un flag de error
  return NextResponse.redirect(`${origin}/auth/login?error=callback_error`);
}
