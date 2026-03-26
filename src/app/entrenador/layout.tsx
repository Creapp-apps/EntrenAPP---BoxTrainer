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

  // ✅ Leer el rol desde app_metadata (no requiere DB query)
  const role = user.app_metadata?.role;
  if (role === "student") redirect("/alumno");

  // Use plain supabase-js client with service role (NOT the cookie-based SSR client)
  // This truly bypasses RLS — the SSR client attaches cookies which can override service role
  const { createClient: createPlainClient } = await import("@supabase/supabase-js");
  const adminSupabase = createPlainClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Obtener perfil del usuario
  let profile = null;
  let boxData = null;
  let needsOnboarding = false;

  try {
    const { data, error } = await adminSupabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();
    if (error) console.error("[LAYOUT] Profile error:", error.message);
    profile = data;
    console.log("[LAYOUT] Profile:", profile?.email, "box_id:", profile?.box_id, "role:", profile?.role);
  } catch (e: any) {
    console.error("[LAYOUT] Profile catch:", e.message);
    profile = { id: user.id, email: user.email, full_name: user.email, role: role || "trainer" };
  }

  if (!profile) {
    profile = { id: user.id, email: user.email, full_name: user.email, role: role || "trainer" };
  }

  if (profile?.box_id) {
    try {
      const { data: box, error: boxError } = await adminSupabase
        .from("boxes")
        .select("*")
        .eq("id", profile.box_id)
        .single();

      if (boxError) {
        console.error("[LAYOUT] Box error:", boxError.message);
      } else {
        boxData = box;
        console.log("[LAYOUT] Box:", box?.name, "owner_id:", box?.owner_id, "user.id:", user.id, "onboarding_completed:", box?.onboarding_completed);
        if (box && box.owner_id === user.id && !box.onboarding_completed) {
          needsOnboarding = true;
          console.log("[LAYOUT] ✅ needsOnboarding = true");
        } else {
          console.log("[LAYOUT] ❌ needsOnboarding = false (owner match:", box?.owner_id === user.id, ", onboarding_completed:", box?.onboarding_completed, ")");
        }
      }
    } catch (e: any) {
      console.error("[LAYOUT] Box catch:", e.message);
    }
  } else {
    console.log("[LAYOUT] ❌ No box_id on profile");
  }

  return (
    <TrainerLayoutClient user={profile} needsOnboarding={needsOnboarding} boxData={boxData}>
      {children}
    </TrainerLayoutClient>
  );
}
