import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";

export default async function Home() {
  // Usamos createAdminClient (service role) para leer el rol bypasseando RLS
  const supabase = await createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("[Home] Error:", profileError.message, "| user:", user.email);
  }

  const role: string | undefined = profile?.role ?? undefined;

  console.log("[Home] user:", user.email, "| role:", role);

  if (role === "super_admin") {
    redirect("/super-admin");
  } else if (role === "student") {
    redirect("/alumno");
  } else {
    redirect("/entrenador");
  }
}
