import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import StudentTiendaClient from "@/components/StudentTiendaClient";

export const dynamic = "force-dynamic";

export default async function StudentTiendaPage() {
  const supabase = await createClient();
  
  // 1. Get user session
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/login");
  }

  // 2. Fetch student profile
  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "student") {
    redirect("/auth/login");
  }

  if (!profile.box_id) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-xl font-bold text-white mb-2">No estás asociado a ningún Box</h2>
        <p className="text-sm text-slate-400 max-w-xs mb-6">
          Por favor vinculate a un Box oficial para ver los productos disponibles en la tienda.
        </p>
      </div>
    );
  }

  // 3. Fetch Box Details
  const { data: box } = await supabase
    .from("boxes")
    .select("id, name, phone")
    .eq("id", profile.box_id)
    .single();

  if (!box) {
    notFound();
  }

  // 4. Fetch catalog products
  const { data: products } = await supabase
    .from("box_products")
    .select("*")
    .eq("box_id", profile.box_id)
    .eq("active", true)
    .order("name", { ascending: true });

  // 5. Fetch past purchases
  const { data: purchases } = await supabase
    .from("box_product_sales")
    .select("*, box_products(name, image_url)")
    .eq("student_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <StudentTiendaClient 
      products={products || []} 
      purchases={purchases || []} 
      box={box}
      profile={profile}
    />
  );
}
