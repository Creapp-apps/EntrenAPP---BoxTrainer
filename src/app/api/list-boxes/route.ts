import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function GET() {
  // Verify caller is super_admin
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No auth" }, { status: 401 });

  // Use service role to bypass RLS
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Verify role
  const { data: profile } = await adminSupabase.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Fetch all data
  const [boxesRes, subsRes, studentsRes] = await Promise.all([
    adminSupabase.from("boxes").select("*, users!boxes_owner_id_fkey(full_name, email)").order("created_at", { ascending: false }),
    adminSupabase.from("box_subscriptions").select("*").order("created_at", { ascending: false }),
    adminSupabase.from("users").select("box_id").eq("role", "student").eq("active", true),
  ]);

  const countMap: Record<string, number> = {};
  (studentsRes.data || []).forEach((s: any) => {
    if (s.box_id) countMap[s.box_id] = (countMap[s.box_id] || 0) + 1;
  });

  const subsMap: Record<string, any> = {};
  (subsRes.data || []).forEach((s: any) => { subsMap[s.box_id] = s; });

  const boxes = (boxesRes.data || []).map((b: any) => ({
    ...b,
    owner: b.users,
    subscription: subsMap[b.id],
    _student_count: countMap[b.id] || 0,
  }));

  return NextResponse.json({ boxes });
}
