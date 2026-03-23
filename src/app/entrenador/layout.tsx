import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TrainerSidebar from "@/components/layout/TrainerSidebar";

export default async function TrainerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profile?.role === "student") redirect("/alumno");

  return (
    <div className="flex h-screen bg-muted/30 overflow-hidden">
      <TrainerSidebar user={profile} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
