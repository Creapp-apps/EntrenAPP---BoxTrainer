import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import BoxLandingClient from "@/components/box-landing/BoxLandingClient";

interface BoxPageProps {
  params: {
    id: string;
  };
}

// Always dynamic to reflect immediate changes from the dashboard
export const dynamic = "force-dynamic";

export default async function BoxLandingPage({ params }: BoxPageProps) {
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: box } = await adminSupabase
    .from("boxes")
    .select("id, name, branding_config, phone, logo_url, owner_id")
    .eq("id", params.id)
    .single();

  if (!box) {
    notFound();
  }

  // Fetch plans with graceful fallback if box_id is not in plans table yet
  let plans: any[] = [];
  const { data: plansData, error: plansError } = await adminSupabase
    .from("plans")
    .select("*")
    .eq("box_id", params.id)
    .eq("active", true)
    .order("price", { ascending: true });

  if (plansError && box.owner_id) {
    // Graceful fallback to trainer_id (owner of the box) if box_id doesn't exist
    const { data: fallbackPlans } = await adminSupabase
      .from("plans")
      .select("*")
      .eq("trainer_id", box.owner_id)
      .eq("active", true)
      .order("price", { ascending: true });
    plans = fallbackPlans || [];
  } else {
    plans = plansData || [];
  }

  const { data: products } = await adminSupabase
    .from("box_products")
    .select("*")
    .eq("box_id", params.id)
    .eq("active", true)
    .order("name", { ascending: true });

  // Fetch activities of the box to render on the plan badges
  let activities: any[] = [];
  if (box.owner_id) {
    const { data: actData } = await adminSupabase
      .from("box_activities")
      .select("id, name, color")
      .eq("trainer_id", box.owner_id)
      .eq("active", true);
    activities = actData || [];
  }

  return <BoxLandingClient box={box} plans={plans || []} products={products || []} activities={activities} />;
}
