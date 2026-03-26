import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json({ 
      step: "auth", 
      error: authError?.message || "No user session",
      user: null 
    });
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("id, email, role, box_id")
    .eq("id", user.id)
    .single();

  return NextResponse.json({
    step: "profile",
    auth_user_id: user.id,
    auth_email: user.email,
    profile: profile,
    profile_error: profileError?.message || null,
    role: profile?.role || "NOT_FOUND",
    would_redirect_to: profile?.role === "super_admin" ? "/super-admin" : profile?.role === "student" ? "/alumno" : "/entrenador"
  });
}
