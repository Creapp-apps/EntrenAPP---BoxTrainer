import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { box_id, product_id, quantity, buyer_name, buyer_contact } = body;

    if (!box_id || !product_id || !quantity) {
      return NextResponse.json({ error: "Faltan parámetros obligatorios" }, { status: 400 });
    }

    // Intentar obtener usuario logueado (si lo hay)
    const userSupabase = await createClient();
    const { data: { user } } = await userSupabase.auth.getUser();

    // Si no está logueado, validar que envíe datos de contacto anónimos
    if (!user) {
      if (!buyer_name?.trim() || !buyer_contact?.trim()) {
        return NextResponse.json({ error: "Nombre y contacto son obligatorios para visitantes" }, { status: 400 });
      }
    }

    const adminSupabase = await createAdminClient();

    // 1. Obtener producto y validar stock
    const { data: product, error: prodError } = await adminSupabase
      .from("box_products")
      .select("*")
      .eq("id", product_id)
      .eq("active", true)
      .single();

    if (prodError || !product) {
      return NextResponse.json({ error: "El producto no existe o no está activo" }, { status: 404 });
    }

    const total_price = product.price * Number(quantity);

    // 2. Registrar el pedido pendiente en box_product_sales
    const { error: saleError } = await adminSupabase
      .from("box_product_sales")
      .insert({
        box_id,
        product_id,
        quantity: Number(quantity),
        total_price,
        payment_method: "otro",
        status: "pendiente",
        student_id: user ? user.id : null,
        buyer_name: user ? null : buyer_name.trim(),
        buyer_contact: user ? null : buyer_contact.trim()
      });

    if (saleError) {
      console.error("Error al guardar pedido:", saleError);
      return NextResponse.json({ error: saleError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error en orden de compra:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
