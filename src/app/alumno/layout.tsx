import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StudentBottomNav from "@/components/layout/StudentBottomNav";
import NoBoxState from "@/components/NoBoxState";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("users").select("*").eq("id", user.id).single();

  if (profile?.role !== "student") redirect("/entrenador");

  // ✅ Si el alumno no tiene Box vinculado, bloquear el layout completo con pantalla guía
  if (!profile?.box_id) {
    return <NoBoxState fullName={profile?.full_name || ""} />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-muted/30">
      <main className="flex-1 pb-24">
        {children}
      </main>
      <StudentBottomNav />
    </div>
  );
}
