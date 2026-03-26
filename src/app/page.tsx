import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Obtener rol del usuario desde la DB
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("[Home] Error al obtener perfil:", profileError.message, "| user:", user.email);
  }

  // Fallback: si la DB no devuelve rol (ej: RLS bloqueando), leer desde app_metadata
  const role: string | undefined = profile?.role ?? user.app_metadata?.role ?? undefined;

  console.log("[Home] user:", user.email, "| role from DB:", profile?.role, "| role from metadata:", user.app_metadata?.role, "| role final:", role);

  if (role === "super_admin") {
    redirect("/super-admin");
  } else if (role === "student") {
    redirect("/alumno");
  } else {
    redirect("/entrenador");
  }
}
