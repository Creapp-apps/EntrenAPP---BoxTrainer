import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LandingClient from "@/components/landing/LandingClient";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    // Intentar leer el rol definitivo desde la base de datos para máxima precisión
    const { data: dbProfile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = dbProfile?.role || user.app_metadata?.role;
    
    let dashboardUrl = "/entrenador";
    if (role === "super_admin") {
      dashboardUrl = "/super-admin";
    } else if (role === "student") {
      dashboardUrl = "/alumno";
    }
    
    // Redirigir automáticamente al dashboard correcto
    redirect(dashboardUrl);
  }

  // Renderizar la majestuosa Landing Page interactiva 3D para el público
  return <LandingClient />;
}
