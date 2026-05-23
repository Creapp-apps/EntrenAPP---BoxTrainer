import { createAdminClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import InviteClientHandler from "./InviteClientHandler";
import PortalClient from "./PortalClient";

export default async function InvitePage({ params }: { params: { box_id: string } }) {
  const supabase = await createAdminClient(); // 👈 Usamos Admin Client para bypassear RLS en modo anónimo
  
  // 1. Obtener datos del Box
  const { data: box, error } = await supabase
    .from("boxes")
    .select("name, owner_id, logo_url, theme, branding_config")
    .eq("id", params.box_id)
    .single();

  // Si el Box no existe, mostramos una UI amigable indicando el error
  if (error || !box) {
    return (
      <div className="min-h-screen bg-[#070709] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-zinc-950 rounded-3xl shadow-2xl p-8 text-center border border-zinc-900">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-red-500/10 flex items-center justify-center mb-6">
            <ShieldAlert className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Invitación Inválida
          </h1>
          <p className="text-zinc-400 mt-4 text-sm leading-relaxed">
            El código de invitación es incorrecto o ha expirado. Por favor, solicita a tu entrenador que te envíe un nuevo enlace.
          </p>
          <div className="mt-8">
            <Link href="/auth/login" className="inline-flex items-center justify-center w-full bg-red-600 text-white py-3.5 px-4 rounded-2xl font-semibold hover:bg-red-500 transition">
              Ir al Inicio de Sesión
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. Intentar buscar el ID de entrenador
  let ownerId = box.owner_id;
  if (!ownerId) {
    const { data: trainer } = await supabase
      .from("users")
      .select("id")
      .eq("box_id", params.box_id)
      .eq("role", "trainer")
      .limit(1)
      .single();
    ownerId = trainer?.id;
  }

  // 3. Obtener productos activos de la tienda del Box
  const { data: productsRes } = await supabase
    .from("box_products")
    .select("*")
    .eq("box_id", params.box_id)
    .eq("active", true)
    .order("name");
  
  const products = (productsRes || []).map(p => ({
    ...p,
    price: Number(p.price)
  }));

  // 4. Obtener planes de precios activos del Box
  let plans: any[] = [];
  if (ownerId) {
    const { data: plansRes } = await supabase
      .from("plans")
      .select("*")
      .eq("trainer_id", ownerId)
      .eq("active", true)
      .order("price");
    
    const metadata = (box as any)?.branding_config?.plans_landing_metadata || {};
    plans = (plansRes || []).map(p => ({
      ...p,
      price: Number(p.price),
      description: metadata[p.id]?.description || p.description || ""
    }));
  }

  // 5. Obtener horarios de clases activas del Box
  let slots: any[] = [];
  if (ownerId) {
    const { data: slotsRes } = await supabase
      .from("box_schedule_slots")
      .select("*, activity:box_activities(name, color)")
      .eq("trainer_id", ownerId)
      .eq("active", true);
    slots = slotsRes || [];
  }

  return (
    <>
      {/* Capturador cliente del Box ID para el flujo de autenticación */}
      <InviteClientHandler boxId={params.box_id} />
      
      {/* Portal Interactivo 3D Blueprint Client */}
      <PortalClient 
        boxId={params.box_id}
        boxName={box.name}
        products={products}
        plans={plans}
        slots={slots}
        logoUrl={box.logo_url}
        theme={box.theme || "default"}
      />
    </>
  );
}
