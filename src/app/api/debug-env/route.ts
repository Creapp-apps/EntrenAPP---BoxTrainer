import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    has_service_role_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY
  });
}
