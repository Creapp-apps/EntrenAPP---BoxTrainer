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
      const adminSupabase = await createAdminClient();
      
      // 1. AUTO-SANACIÓN: Buscar si el perfil público existe
      let { data: profile } = await adminSupabase
        .from("users")
        .select("box_id, role")
        .eq("id", user.id)
        .single();

      // Revisar si existía una invitación pendiente almacenada en las cookies
      const pendingBoxId = cookieStore.get("pending_invite_box_id")?.value;
      const hasPendingBox = pendingBoxId && pendingBoxId.length > 10;

      // 2. Si el perfil NO existe (el trigger de la BD falló o se eliminó), lo creamos nosotros:
      if (!profile) {
        console.log(`[Auth Callback] Perfil público no encontrado para ${user.email}. Aplicando Auto-Sanación...`);
        
        const role = user.app_metadata?.role || user.user_metadata?.role || (hasPendingBox ? "student" : "trainer");
        const fullName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Usuario";
        
        const { error: insertError } = await adminSupabase.from("users").insert({
          id: user.id,
          email: user.email,
          role: role,
          full_name: fullName,
          box_id: hasPendingBox && role === "student" ? pendingBoxId : null
        });

        if (insertError) {
          console.error("[Auth Callback] Falla fatal al auto-sanar perfil:", insertError);
        } else {
          profile = { role, box_id: hasPendingBox && role === "student" ? pendingBoxId : null };
          console.log(`[Auth Callback] Auto-Sanación exitosa para ${user.email}`);
        }
      } else {
        // 3. Si el perfil YA existía pero hay una invitación pendiente y es alumno sin box
        if (hasPendingBox && !profile.box_id && profile.role === "student") {
          const { error: updateError } = await adminSupabase
            .from("users")
            .update({ box_id: pendingBoxId })
            .eq("id", user.id);
            
          if (!updateError) {
            console.log(`[Auth Callback] Se vinculó exitosamente al usuario ${user.email} al Box ${pendingBoxId}`);
          }
        }
      }

      // 4. Limpiar cookie residual de invitación
      if (hasPendingBox) {
        try { cookieStore.delete("pending_invite_box_id"); } catch {}
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Si el código no existe o falla la autenticación, enviar al login con un flag de error
  return NextResponse.redirect(`${origin}/auth/login?error=callback_error`);
}
