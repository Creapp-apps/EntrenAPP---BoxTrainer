import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StudentBottomNav from "@/components/layout/StudentBottomNav";
import NoBoxState from "@/components/NoBoxState";
import SuspendedState from "@/components/SuspendedState";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // 📡 1. Traer PERFIL PURO sin uniones pesadas que puedan colisionar con RLS recursivas
  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  let currentProfile = profile;

  if (!currentProfile) {
    console.log("[Student Layout] 🚨 Perfil no encontrado en renderización. Aplicando Auto-Sanación en caliente...");
    try {
      const { createClient: createPlainClient } = await import("@supabase/supabase-js");
      const adminSupabase = createPlainClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const fullName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Alumno";
      
      // Forzar la inserción desde el backend
      const { error: insertError } = await adminSupabase.from("users").insert({
        id: user.id,
        email: user.email,
        role: "student", // Si está entrando a /alumno asumimos student
        full_name: fullName,
      });

      if (!insertError) {
        console.log("[Student Layout] ✅ Perfil creado con éxito. Re-intentando lectura...");
        const { data: healedProfile } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .single();
        currentProfile = healedProfile;
      } else {
        console.error("[Student Layout] Falla crítica al insertar perfil:", insertError);
      }
    } catch (err) {
      console.error("[Student Layout] Excepción en auto-sanación:", err);
    }
  }

  if (!currentProfile) {
    // 🚨 Solo si falla todo el blindaje anterior, rebotar al login
    redirect("/auth/login?error=profile_not_found");
  }

  // Reemplazar accesos de 'profile' por 'currentProfile' a partir de aquí
  const finalProfile = currentProfile as any;

  if (finalProfile.role !== "student") redirect("/entrenador");

  // ✅ Si el alumno no tiene Box vinculado, bloquear con pantalla guía
  if (!finalProfile?.box_id) {
    return <NoBoxState fullName={finalProfile?.full_name || ""} />;
  }

  // 📡 2. Cargar datos del Box de forma desacoplada e independiente de RLS cruzadas
  const { data: boxData } = await supabase
    .from("boxes")
    .select("name, phone, theme, branding_config")
    .eq("id", finalProfile.box_id)
    .single();

  // 🛡️ GUARDIÁN DE SEGURIDAD: Bloquear si la cuenta está pausada o suspendida
  if (finalProfile.status === "paused" || finalProfile.status === "suspended") {
    return (
      <SuspendedState
        status={finalProfile.status}
        reason={finalProfile.status_reason}
        boxName={boxData?.name || "Tu Box"}
        boxPhone={boxData?.phone || null}
      />
    );
  }

  // 🎨 Convertidor de HEX a HSL nativo para compatibilidad con opacidades de Tailwind (/10, /90, etc.)
  function hexToHSLValues(hex: string): string {
    if (!hex || !hex.startsWith("#")) return "25 95% 53%"; // Naranja por defecto
    hex = hex.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s, l = (max + min) / 2;
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  }

  const branding = boxData?.branding_config || {};
  const primaryColor = branding.primary_color || "#EA580C"; 
  const hslString = hexToHSLValues(primaryColor);
  const activeTheme = boxData?.theme || "default";

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50 light-theme-forced" data-theme={activeTheme !== "default" ? activeTheme : undefined}>
      {/* Inyectar el color del Tenant directamente en las variables primarias de Tailwind */}
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --primary: ${hslString} !important;
          --sidebar-primary: ${hslString} !important;
          --ring: ${hslString} !important;
        }
        body {
          background-color: #f8fafc !important;
        }
      `}} />

      <main className="flex-1 pb-24">
        {children}
      </main>
      <StudentBottomNav />
    </div>
  );
}
