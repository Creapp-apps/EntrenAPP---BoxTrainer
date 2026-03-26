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

  // Check if box owner needs onboarding
  let needsOnboarding = false;
  let boxData = null;
  if (profile?.box_id) {
    const { data: box } = await supabase
      .from("boxes")
      .select("id, name, address, phone, logo_url, owner_id, theme, onboarding_completed")
      .eq("id", profile.box_id)
      .single();
    boxData = box;
    // Show onboarding only once — if this user is the box owner AND hasn't completed onboarding
    if (box && box.owner_id === user.id && !box.onboarding_completed) {
      needsOnboarding = true;
    }
  }

  return (
    <TrainerLayoutClient user={profile} needsOnboarding={needsOnboarding} boxData={boxData}>
      {children}
    </TrainerLayoutClient>
  );
}
