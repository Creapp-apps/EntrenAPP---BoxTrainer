import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// 🔍 GET: Obtiene el nombre de un Box de manera segura para que el alumno sepa a qué se une
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const boxId = searchParams.get("boxId");

  if (!boxId) {
    return NextResponse.json({ error: "Falta el boxId" }, { status: 400 });
  }

  try {
    const adminSupabase = await createAdminClient();
    
    const { data: box, error } = await adminSupabase
      .from("boxes")
      .select("id, name")
      .eq("id", boxId)
      .single();

    if (error || !box) {
      return NextResponse.json({ error: "Box no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ name: box.name });
  } catch (err: any) {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// 🤝 POST: Vincula al usuario autenticado actual con el Box indicado
export async function POST(request: NextRequest) {
  try {
    const { boxId } = await request.json();

    if (!boxId) {
      return NextResponse.json({ error: "El Box ID es requerido" }, { status: 400 });
    }

    // 1. Verificar autenticación real del usuario actual en Next.js
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado. Debes iniciar sesión." }, { status: 401 });
    }

    // 2. Validar que el Box exista
    const adminSupabase = await createAdminClient();
    const { data: box, error: boxError } = await adminSupabase
      .from("boxes")
      .select("id, name")
      .eq("id", boxId)
      .single();

    if (boxError || !box) {
      return NextResponse.json({ error: "El Box especificado no existe" }, { status: 404 });
    }

    // 3. Actualizar el perfil del usuario con el ID del Box
    // Usamos el admin client para evitar cualquier restricción RLS client-side restrictiva
    const { error: updateError } = await adminSupabase
      .from("users")
      .update({ box_id: boxId })
      .eq("id", user.id);

    if (updateError) {
      console.error("Error actualizando usuario:", updateError);
      return NextResponse.json({ error: "Error al vincular con la base de datos pública" }, { status: 500 });
    }

    // 4. Opcional: Actualizar metadata interna del usuario para consistencia
    await adminSupabase.auth.admin.updateUserById(user.id, {
      user_metadata: { box_id: boxId }
    });

    return NextResponse.json({ 
      success: true, 
      message: `Vinculado exitosamente a ${box.name}` 
    });

  } catch (err: any) {
    console.error("Error en Endpoint JoinBox:", err);
    return NextResponse.json({ error: "Error interno procesando la solicitud" }, { status: 500 });
  }
}
