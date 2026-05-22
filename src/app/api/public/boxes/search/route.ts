import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";

  // Usamos service role para poder buscar gimnasios públicamente sin requerir sesión,
  // devolviendo SOLO los campos necesarios y públicos.
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let query = adminSupabase
    .from("boxes")
    .select("id, name, branding_config")
    .order("name", { ascending: true })
    .limit(20);

  if (q.trim()) {
    query = query.ilike("name", `%${q}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error searching boxes:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }

  return NextResponse.json({ boxes: data });
}
