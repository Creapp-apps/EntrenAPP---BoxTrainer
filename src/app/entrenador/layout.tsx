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

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profile?.role === "student") redirect("/alumno");

  return (
    <TrainerLayoutClient user={profile}>
      {children}
    </TrainerLayoutClient>
  );
}
