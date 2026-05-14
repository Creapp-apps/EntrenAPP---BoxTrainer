import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StudentBottomNav from "@/components/layout/StudentBottomNav";
import NoBoxState from "@/components/NoBoxState";
import SuspendedState from "@/components/SuspendedState";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // 📡 Traer perfil ampliado incluyendo los datos estéticos y de contacto de su Box
  const { data: profile } = await supabase
    .from("users")
    .select("*, boxes(name, phone, branding_config)")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "student") redirect("/entrenador");

  // ✅ Si el alumno no tiene Box vinculado, bloquear con pantalla guía
  if (!profile?.box_id) {
    return <NoBoxState fullName={profile?.full_name || ""} />;
  }

  const boxData = profile.boxes as any;

  // 🛡️ GUARDIÁN DE SEGURIDAD: Bloquear si la cuenta está pausada o suspendida
  if (profile.status === "paused" || profile.status === "suspended") {
    return (
      <SuspendedState
        status={profile.status}
        reason={profile.status_reason}
        boxName={boxData?.name || "Tu Box"}
        boxPhone={boxData?.phone || null}
      />
    );
  }

  // 🎨 Configurar color primario dinámico configurado por el Administrador
  const branding = boxData?.branding_config || {};
  const primaryColor = branding.primary_color || "#EA580C"; // Orange por defecto

  return (
    <div className="flex flex-col min-h-screen bg-muted/30">
      {/* Inyectar paleta de colores de marca del Box dinámicamente en la raíz */}
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --box-primary: ${primaryColor};
        }
        .bg-primary { background-color: var(--box-primary) !important; }
        .text-primary { color: var(--box-primary) !important; }
        .border-primary { border-color: var(--box-primary) !important; }
        .hover\\:bg-primary\\/90:hover { background-color: var(--box-primary) !important; opacity: 0.9; }
        .bg-primary\\/10 { background-color: var(--box-primary) !important; opacity: 0.15; } /* Para badges */
        .text-white .text-primary { color: white !important; } /* Evitar romper contrastes en cabeceras oscuras */
      `}} />

      <main className="flex-1 pb-24">
        {children}
      </main>
      <StudentBottomNav />
    </div>
  );
}
