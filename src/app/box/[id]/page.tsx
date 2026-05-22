import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import BoxLandingClient from "@/components/box-landing/BoxLandingClient";

interface BoxPageProps {
  params: {
    id: string;
  };
}

// Generate static params if we want to pre-render (optional)
export const revalidate = 60; // Revalidate every minute

export default async function BoxLandingPage({ params }: BoxPageProps) {
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: box } = await adminSupabase
    .from("boxes")
    .select("id, name, branding_config, phone, logo_url")
    .eq("id", params.id)
    .single();

  if (!box) {
    notFound();
  }

  const { data: plans } = await adminSupabase
    .from("plans")
    .select("*")
    .eq("box_id", params.id)
    .eq("active", true)
    .order("price", { ascending: true });

  return <BoxLandingClient box={box} plans={plans || []} />;
}
