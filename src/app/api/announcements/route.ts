import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminSupabase = await createAdminClient();

    // 1. Verificar sesión del staff
    const { data: { user: author } } = await supabase.auth.getUser();
    if (!author) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { data: coachProfile } = await adminSupabase
      .from("users")
      .select("role, box_id")
      .eq("id", author.id)
      .single();

    const isStaff = ["trainer", "professor", "co_trainer", "admin"].includes(coachProfile?.role || "");
    if (!isStaff || !coachProfile?.box_id) {
      return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
    }

    // 2. Procesar payload
    const { title, content, scope, targetUserId, pinned } = await request.json();

    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json({ error: "Título y contenido obligatorios" }, { status: 400 });
    }

    // Validar target si el scope es targeted
    const targetIds = scope === "targeted" && targetUserId ? [targetUserId] : null;

    // 3. Insertar nota
    const { data, error } = await adminSupabase
      .from("box_announcements")
      .insert({
        box_id: coachProfile.box_id,
        author_id: author.id,
        title: title.trim(),
        content: content.trim(),
        scope: scope || "general",
        target_user_ids: targetIds,
        pinned: pinned || false,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });

  } catch (err: any) {
    console.error("Error POST /api/announcements:", err);
    return NextResponse.json({ error: err.message || "Error interno" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminSupabase = await createAdminClient();

    // 1. Verificar sesión del staff
    const { data: { user: author } } = await supabase.auth.getUser();
    if (!author) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { data: coachProfile } = await adminSupabase
      .from("users")
      .select("role, box_id")
      .eq("id", author.id)
      .single();

    const isStaff = ["trainer", "professor", "co_trainer", "admin"].includes(coachProfile?.role || "");
    if (!isStaff || !coachProfile?.box_id) {
      return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
    }

    // 2. Obtener ID de anuncio
    const { searchParams } = new URL(request.url);
    const announcementId = searchParams.get("id");

    if (!announcementId) {
      return NextResponse.json({ error: "ID de nota faltante" }, { status: 400 });
    }

    // 3. Ejecutar borrado validando pertenencia al Box
    const { error } = await adminSupabase
      .from("box_announcements")
      .delete()
      .eq("id", announcementId)
      .eq("box_id", coachProfile.box_id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: "Anuncio eliminado" });

  } catch (err: any) {
    console.error("Error DELETE /api/announcements:", err);
    return NextResponse.json({ error: err.message || "Error interno" }, { status: 500 });
  }
}
