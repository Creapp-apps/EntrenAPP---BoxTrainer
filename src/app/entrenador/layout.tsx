import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TrainerLayoutClient from "@/components/layout/TrainerLayoutClient";

export default async function TrainerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // ✅ Leer el rol desde app_metadata (no requiere DB query)
  const role = user.app_metadata?.role;
  if (role === "student") redirect("/alumno");

  // Intentar obtener perfil del usuario — puede fallar si GRANTs no están configurados
  let profile = null;
  let boxData = null;
  let needsOnboarding = false;

  try {
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();
    profile = data;
  } catch {
    // Si falla la query, crear objeto mínimo para que el layout no crashee
    profile = { id: user.id, email: user.email, full_name: user.email, role: role || "trainer" };
  }

  // Si no hay perfil de la DB, usar datos de auth
  if (!profile) {
    profile = { id: user.id, email: user.email, full_name: user.email, role: role || "trainer" };
  }

  if (profile?.box_id) {
    try {
      const { data: box } = await supabase
        .from("boxes")
        .select("id, name, address, phone, logo_url, owner_id, theme, onboarding_completed")
        .eq("id", profile.box_id)
        .single();
      boxData = box;
      if (box && box.owner_id === user.id && !box.onboarding_completed) {
        needsOnboarding = true;
      }
    } catch {
      // Ignorar si boxes también falla
    }
  }

  return (
    <TrainerLayoutClient user={profile} needsOnboarding={needsOnboarding} boxData={boxData}>
      {children}
    </TrainerLayoutClient>
  );
}
