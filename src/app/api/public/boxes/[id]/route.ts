import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await adminSupabase
    .from("boxes")
    .select("id, name, branding_config, logo_url")
    .eq("id", params.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Box no encontrado" }, { status: 404 });
  }

  // Traemos los planes activos
  const { data: plans } = await adminSupabase
    .from("plans")
    .select("id, name, price, modality, sessions_per_week, active")
    .eq("box_id", params.id)
    .eq("active", true)
    .order("price", { ascending: true });

  return NextResponse.json({ box: data, plans: plans || [] });
}
