import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

const PLAN_LIMITS: Record<string, { max_students: number; max_professors: number }> = {
  starter: { max_students: 30, max_professors: 1 },
  pro: { max_students: 80, max_professors: 3 },
  elite: { max_students: 9999, max_professors: 9999 },
};

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getAuthUser() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

async function verifyAccess(requiredRole: "super_admin" | "box_owner", boxId?: string) {
  const user = await getAuthUser();
  if (!user) return { admin: null as any, error: "No auth" };

  const admin = getAdminClient();
  const { data: profile } = await admin.from("users").select("role, box_id").eq("id", user.id).single();

  if (requiredRole === "super_admin") {
    if (profile?.role !== "super_admin") return { admin: null as any, error: "Forbidden" };
  } else if (requiredRole === "box_owner") {
    // Allow super_admin OR box owner
    if (profile?.role === "super_admin") {
      // OK
    } else if (profile?.role === "trainer" && boxId) {
      const { data: box } = await admin.from("boxes").select("owner_id").eq("id", boxId).single();
      if (!box || box.owner_id !== user.id) return { admin: null as any, error: "Forbidden" };
    } else {
      return { admin: null as any, error: "Forbidden" };
    }
  }

  return { admin, error: null };
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { action, boxId, ...payload } = body;

  if (!boxId) return NextResponse.json({ error: "boxId required" }, { status: 400 });

  // Onboarding can be done by the box owner
  const role = action === "onboarding" ? "box_owner" : "super_admin";
  const { admin, error } = await verifyAccess(role as any, boxId);
  if (error) return NextResponse.json({ error }, { status: 403 });

  switch (action) {
    case "edit": {
      const { error: dbErr } = await admin.from("boxes").update({
        name: payload.name?.trim() || undefined,
        address: payload.address?.trim() || null,
        city: payload.city?.trim() || null,
        phone: payload.phone?.trim() || null,
      }).eq("id", boxId);
      if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    case "onboarding": {
      const { error: dbErr } = await admin.from("boxes").update({
        name: payload.name?.trim() || undefined,
        address: payload.address?.trim() || null,
        city: payload.city?.trim() || null,
        phone: payload.phone?.trim() || null,
        logo_url: payload.logo_url || null,
        theme: payload.theme || null,
        onboarding_completed: true,
      }).eq("id", boxId);
      if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
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
  const { admin, error } = await verifyAccess("super_admin");
  if (error) return NextResponse.json({ error }, { status: 403 });

  const { boxId } = await request.json();
  if (!boxId) return NextResponse.json({ error: "boxId required" }, { status: 400 });

  await admin.from("box_subscriptions").delete().eq("box_id", boxId);
  await admin.from("users").update({ box_id: null }).eq("box_id", boxId);
  await admin.from("boxes").delete().eq("id", boxId);

  return NextResponse.json({ success: true });
}
