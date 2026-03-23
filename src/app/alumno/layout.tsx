import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StudentBottomNav from "@/components/layout/StudentBottomNav";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("users").select("*").eq("id", user.id).single();

  if (profile?.role !== "student") redirect("/entrenador");

  return (
    <div className="flex flex-col min-h-screen bg-muted/30">
      <main className="flex-1 pb-20">
        {children}
      </main>
      <StudentBottomNav />
    </div>
  );
}
