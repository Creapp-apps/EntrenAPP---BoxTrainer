import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // ✅ Leer el rol desde app_metadata (no requiere DB query)
  const role: string | undefined = user.app_metadata?.role ?? undefined;

  if (role === "super_admin") {
    redirect("/super-admin");
  } else if (role === "student") {
    redirect("/alumno");
  } else {
    redirect("/entrenador");
  }
}
