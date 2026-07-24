import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    message: "Endpoint de seeding deshabilitado en build de producción.",
  });
}
