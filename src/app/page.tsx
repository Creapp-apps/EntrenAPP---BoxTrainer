import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LandingClient from "@/components/landing/LandingClient";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    let dashboardUrl = "/auth/login";
    const role = user.app_metadata?.role;
    if (role === "super_admin") {
      dashboardUrl = "/super-admin";
    } else if (role === "student") {
      dashboardUrl = "/alumno";
    } else {
      dashboardUrl = "/entrenador";
    }
    // Redirigir automáticamente si el usuario ya está logueado
    redirect(dashboardUrl);
  }

  // Renderizar la majestuosa Landing Page interactiva 3D para el público
  return <LandingClient />;
}
