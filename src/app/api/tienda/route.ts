import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminSupabase = await createAdminClient();

    // 1. Verify staff session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { data: profile } = await adminSupabase
      .from("users")
      .select("role, box_id")
      .eq("id", user.id)
      .single();

    const isStaff = ["trainer", "professor", "co_trainer", "admin"].includes(profile?.role || "");
    if (!isStaff || !profile?.box_id) {
      return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;

    // --- POS CHECKOUT ---
    if (action === "checkout") {
      const { items, student_id, payment_method, status, buyer_name, buyer_contact } = body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return NextResponse.json({ error: "El carrito está vacío" }, { status: 400 });
      }

      // Check stock and gather product info first
      const productIds = items.map((i: any) => i.id);
      const { data: dbProducts, error: dbProdErr } = await adminSupabase
        .from("box_products")
        .select("*")
        .in("id", productIds)
        .eq("box_id", profile.box_id);

      if (dbProdErr || !dbProducts) {
        return NextResponse.json({ error: "Error al recuperar productos del catálogo" }, { status: 500 });
      }

      // Validate all items
      for (const item of items) {
        const dbProd = dbProducts.find((p: any) => p.id === item.id);
        if (!dbProd) {
          return NextResponse.json({ error: `El producto "${item.name}" no está en el catálogo` }, { status: 404 });
        }
        if (!dbProd.active) {
          return NextResponse.json({ error: `El producto "${dbProd.name}" no está activo` }, { status: 400 });
        }
        // If checkout is marking it completed (sold), check stock
        if (status === "completado" && dbProd.stock < item.quantity) {
          return NextResponse.json({ error: `Stock insuficiente para "${dbProd.name}". Disponible: ${dbProd.stock}` }, { status: 400 });
        }
      }

      // Record each item sale and update stock
      for (const item of items) {
        const dbProd = dbProducts.find((p: any) => p.id === item.id)!;
        const totalPrice = Number(dbProd.price) * Number(item.quantity);

        // 1. Insert sale record
        const { error: saleErr } = await adminSupabase
          .from("box_product_sales")
          .insert({
            box_id: profile.box_id,
            student_id: student_id || null,
            product_id: item.id,
            quantity: Number(item.quantity),
            total_price: totalPrice,
            payment_method: payment_method || "efectivo",
            status: status || "completado",
            buyer_name: student_id ? null : (buyer_name?.trim() || null),
            buyer_contact: student_id ? null : (buyer_contact?.trim() || null),
          });

        if (saleErr) throw saleErr;

        // 2. Deduct stock if status is completed (paid)
        if (status === "completado") {
          const newStock = Math.max(0, dbProd.stock - item.quantity);
          const { error: stockErr } = await adminSupabase
            .from("box_products")
            .update({ stock: newStock })
            .eq("id", item.id);

          if (stockErr) throw stockErr;
        }
      }

      return NextResponse.json({ success: true, message: "Venta registrada con éxito" });
    }

    // --- COMPLETE ORDER (From Pending/Debt to Paid) ---
    if (action === "complete_order") {
      const { sale_id, payment_method } = body;

      if (!sale_id) {
        return NextResponse.json({ error: "Falta el ID de la venta" }, { status: 400 });
      }

      // Fetch sale info
      const { data: sale, error: saleFetchErr } = await adminSupabase
        .from("box_product_sales")
        .select("*, box_products(stock, active, name)")
        .eq("id", sale_id)
        .eq("box_id", profile.box_id)
        .single();

      if (saleFetchErr || !sale) {
        return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
      }

      if (sale.status === "completado") {
        return NextResponse.json({ error: "El pedido ya está completado" }, { status: 400 });
      }

      const product = sale.box_products;
      if (!product) {
        return NextResponse.json({ error: "El producto ya no existe en el catálogo" }, { status: 404 });
      }

      // Check stock
      if (product.stock < sale.quantity) {
        return NextResponse.json({ error: `Stock insuficiente para "${product.name}". Disponible: ${product.stock}` }, { status: 400 });
      }

      // 1. Update sale status to completed
      const { error: updateErr } = await adminSupabase
        .from("box_product_sales")
        .update({
          status: "completado",
          payment_method: payment_method || sale.payment_method,
        })
        .eq("id", sale_id);

      if (updateErr) throw updateErr;

      // 2. Deduct stock
      const newStock = Math.max(0, product.stock - sale.quantity);
      const { error: stockErr } = await adminSupabase
        .from("box_products")
        .update({ stock: newStock })
        .eq("id", sale.product_id);

      if (stockErr) throw stockErr;

      return NextResponse.json({ success: true, message: "Pedido cobrado con éxito" });
    }

    // --- CANCEL ORDER ---
    if (action === "cancel_order") {
      const { sale_id } = body;

      if (!sale_id) {
        return NextResponse.json({ error: "Falta el ID de la venta" }, { status: 400 });
      }

      const { error: deleteErr } = await adminSupabase
        .from("box_product_sales")
        .update({ status: "cancelado" })
        .eq("id", sale_id)
        .eq("box_id", profile.box_id);

      if (deleteErr) throw deleteErr;

      return NextResponse.json({ success: true, message: "Pedido cancelado" });
    }

    // --- CREATE PRODUCT (ABM) ---
    if (action === "create_product") {
      const { name, description, price, stock, image_url, category, active } = body;

      if (!name?.trim() || price === undefined || price < 0 || stock === undefined || stock < 0) {
        return NextResponse.json({ error: "Nombre, precio y stock son obligatorios" }, { status: 400 });
      }

      // Check limits
      const { data: subscription } = await adminSupabase
        .from("box_subscriptions")
        .select("plan_name")
        .eq("box_id", profile.box_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const planName = subscription?.plan_name || "basico";
      
      const limits: Record<string, number> = {
        free: 0,
        trial: 0,
        basico: 10,
        basic: 10,
        estandar: 50,
        standard: 50,
        premium: 9999,
        pro: 9999,
        unlimited: 9999,
      };

      const maxAllowed = limits[planName.toLowerCase()] || 10;

      // Count existing products
      const { count, error: countErr } = await adminSupabase
        .from("box_products")
        .select("id", { count: "exact", head: true })
        .eq("box_id", profile.box_id);

      if (countErr) throw countErr;

      if ((count || 0) >= maxAllowed) {
        return NextResponse.json(
          { error: `Límite de catálogo excedido: Tu plan actual (${planName}) permite un máximo de ${maxAllowed} productos.` },
          { status: 400 }
        );
      }

      // Support category via description fallback JSON structure
      const formattedDescription = JSON.stringify({
        text: description?.trim() || "",
        category: category || "other"
      });

      const { data: newProd, error: createErr } = await adminSupabase
        .from("box_products")
        .insert({
          box_id: profile.box_id,
          name: name.trim(),
          description: formattedDescription,
          price: Number(price),
          stock: Number(stock),
          image_url: image_url?.trim() || null,
          active: active !== undefined ? active : true,
        })
        .select()
        .single();

      if (createErr) throw createErr;

      return NextResponse.json({ success: true, product: newProd });
    }

    // --- UPDATE PRODUCT (ABM) ---
    if (action === "update_product") {
      const { id, name, description, price, stock, image_url, category, active } = body;

      if (!id) {
        return NextResponse.json({ error: "Falta el ID del producto" }, { status: 400 });
      }

      // Support category via description fallback JSON structure
      const formattedDescription = JSON.stringify({
        text: description?.trim() || "",
        category: category || "other"
      });

      const updateData: any = {};
      if (name !== undefined) updateData.name = name.trim();
      if (description !== undefined || category !== undefined) {
        updateData.description = formattedDescription;
      }
      if (price !== undefined) updateData.price = Number(price);
      if (stock !== undefined) updateData.stock = Number(stock);
      if (image_url !== undefined) updateData.image_url = image_url?.trim() || null;
      if (active !== undefined) updateData.active = active;

      const { data: updatedProd, error: updateErr } = await adminSupabase
        .from("box_products")
        .update(updateData)
        .eq("id", id)
        .eq("box_id", profile.box_id)
        .select()
        .single();

      if (updateErr) throw updateErr;

      return NextResponse.json({ success: true, product: updatedProd });
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });

  } catch (err: any) {
    console.error("Error POST /api/tienda:", err);
    return NextResponse.json({ error: err.message || "Error interno del servidor" }, { status: 500 });
  }
}
