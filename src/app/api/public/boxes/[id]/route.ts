import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await adminSupabase
    .from("boxes")
    .select("id, name, branding_config, logo_url, owner_id")
    .eq("id", params.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Box no encontrado" }, { status: 404 });
  }

  // Traemos los planes activos con graceful fallback si no existe la columna box_id
  let plans: any[] = [];
  const { data: plansData, error: plansError } = await adminSupabase
    .from("plans")
    .select("*")
    .eq("box_id", params.id)
    .eq("active", true)
    .order("price", { ascending: true });

  if (plansError && data.owner_id) {
    const { data: fallbackPlans } = await adminSupabase
      .from("plans")
      .select("*")
      .eq("trainer_id", data.owner_id)
      .eq("active", true)
      .order("price", { ascending: true });
    plans = fallbackPlans || [];
  } else {
    plans = plansData || [];
  }

  // Merge metadata from branding_config plans_landing_metadata
  const metadata = data.branding_config?.plans_landing_metadata || {};
  const plansWithMetadata = (plans || []).map(p => {
    const planMeta = metadata[p.id] || {};
    return {
      ...p,
      description: planMeta.description || p.description || "",
      show_on_landing: planMeta.show_on_landing !== undefined ? planMeta.show_on_landing : !!p.show_on_landing,
    };
  });

  return NextResponse.json({ box: data, plans: plansWithMetadata || [] });
}
