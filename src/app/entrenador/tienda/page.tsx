import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import TrainerTiendaClient from "@/components/TrainerTiendaClient";

export const dynamic = "force-dynamic";

export default async function TiendaEntrenadorPage() {
  const supabase = await createClient();

  // 1. Get user session
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/login");
  }

  // 2. Fetch trainer/coach profile
  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  const isStaff = ["trainer", "professor", "co_trainer", "admin"].includes(profile?.role || "");
  if (!profile || !isStaff) {
    redirect("/auth/login");
  }

  if (!profile.box_id) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-xl font-bold text-white mb-2">No estás asociado a ningún Box</h2>
        <p className="text-sm text-slate-400 max-w-xs mb-6">
          Por favor configura tu Box para poder habilitar el Punto de Venta e Inventario.
        </p>
      </div>
    );
  }

  // 3. Fetch box products
  const { data: products } = await supabase
    .from("box_products")
    .select("*")
    .eq("box_id", profile.box_id)
    .order("created_at", { ascending: false });

  // 4. Fetch students of the box
  const { data: students } = await supabase
    .from("users")
    .select("id, name, email")
    .eq("box_id", profile.box_id)
    .eq("role", "student")
    .eq("active", true)
    .order("name", { ascending: true });

  // 5. Fetch sales log
  const { data: sales } = await supabase
    .from("box_product_sales")
    .select("*, box_products(name, price, image_url), users(name, email)")
    .eq("box_id", profile.box_id)
    .order("created_at", { ascending: false });

  return (
    <TrainerTiendaClient 
      products={products || []} 
      students={students || []} 
      sales={sales || []} 
      boxId={profile.box_id}
    />
  );
}
