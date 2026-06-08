import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabaseClient = await createServerClient();
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "No auth" }, { status: 401 });

    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: profile } = await adminSupabase.from("users").select("role").eq("id", user.id).single();
    if (profile?.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 1. Usuarios activos (Logins) en la ultima hora
    // Supabase admin api to list users:
    const { data: { users } } = await adminSupabase.auth.admin.listUsers();
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    let loginsLastHour = 0;
    let loginsLastDay = 0;
    
    users.forEach(u => {
      if (u.last_sign_in_at) {
        const signInDate = new Date(u.last_sign_in_at);
        if (signInDate >= oneHourAgo) loginsLastHour++;
        if (signInDate >= oneDayAgo) loginsLastDay++;
      }
    });

    // 2. Nuevas reservas (turnos tomados) en las ultimas 24 hs
    const { count: bookingsLastDay } = await adminSupabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .gte("created_at", oneDayAgo.toISOString());
      
    // 3. Nuevas reservas en la ultima hora
    const { count: bookingsLastHour } = await adminSupabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .gte("created_at", oneHourAgo.toISOString());

    return NextResponse.json({
      loginsLastHour,
      loginsLastDay,
      bookingsLastHour: bookingsLastHour || 0,
      bookingsLastDay: bookingsLastDay || 0,
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
