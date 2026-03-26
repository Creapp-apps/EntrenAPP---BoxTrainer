import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

const PLAN_LIMITS: Record<string, { max_students: number; max_professors: number }> = {
  starter: { max_students: 30, max_professors: 1 },
  pro: { max_students: 80, max_professors: 3 },
  elite: { max_students: 9999, max_professors: 9999 },
};

async function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function verifySuperAdmin() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = await getAdminClient();
  const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "super_admin") return null;

  return admin;
}

export async function PUT(request: NextRequest) {
  const admin = await verifySuperAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { action, boxId, ...payload } = body;

  if (!boxId) return NextResponse.json({ error: "boxId required" }, { status: 400 });

  switch (action) {
    case "edit": {
      const { error } = await admin.from("boxes").update({
        name: payload.name?.trim() || undefined,
        address: payload.address?.trim() || null,
        city: payload.city?.trim() || null,
        phone: payload.phone?.trim() || null,
      }).eq("id", boxId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    case "changePlan": {
      const limits = PLAN_LIMITS[payload.plan] || PLAN_LIMITS.starter;
      await admin.from("boxes").update({
        max_students: limits.max_students,
        max_professors: limits.max_professors,
      }).eq("id", boxId);
      if (payload.subscriptionId) {
        await admin.from("box_subscriptions").update({ plan_name: payload.plan }).eq("id", payload.subscriptionId);
      }
      return NextResponse.json({ success: true });
    }

    case "toggleStatus": {
      const newStatus = payload.currentStatus === "suspended" ? "active" : "suspended";
      await admin.from("boxes").update({ status: newStatus }).eq("id", boxId);
      await admin.from("box_subscriptions").update({ status: newStatus }).eq("box_id", boxId);
      return NextResponse.json({ success: true, newStatus });
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const admin = await verifySuperAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { boxId } = await request.json();
  if (!boxId) return NextResponse.json({ error: "boxId required" }, { status: 400 });

  await admin.from("box_subscriptions").delete().eq("box_id", boxId);
  await admin.from("users").update({ box_id: null }).eq("box_id", boxId);
  await admin.from("boxes").delete().eq("id", boxId);

  return NextResponse.json({ success: true });
}
