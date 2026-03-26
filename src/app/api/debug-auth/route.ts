import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Endpoint de diagnóstico: /api/debug-auth
// Verifica todo el flujo de autenticación y rol
export async function GET() {
  const diagnostics: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    env_check: {
      has_supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      has_anon_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      has_service_role_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      has_resend_key: !!process.env.RESEND_API_KEY,
    },
  };

  try {
    // 1. Auth check con anon key
    const cookieStore = await cookies();
    const supabaseAnon = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() {},
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser();
    diagnostics.auth = {
      has_user: !!user,
      user_id: user?.id ?? null,
      user_email: user?.email ?? null,
      app_metadata_role: user?.app_metadata?.role ?? null,
      auth_error: authError?.message ?? null,
    };

    if (!user) {
      diagnostics.conclusion = "NO_SESSION — necesitás estar logueado";
      return NextResponse.json(diagnostics);
    }

    // 2. DB query con anon key (para ver si RLS bloquea)
    const { data: anonProfile, error: anonError } = await supabaseAnon
      .from("users")
      .select("id, email, role, box_id")
      .eq("id", user.id)
      .single();

    diagnostics.anon_query = {
      profile: anonProfile,
      error: anonError?.message ?? null,
      role: anonProfile?.role ?? "NULL",
    };

    // 3. DB query con service role (para ver si bypasea RLS)
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabaseAdmin = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          cookies: {
            getAll() { return cookieStore.getAll(); },
            setAll() {},
          },
        }
      );

      const { data: adminProfile, error: adminError } = await supabaseAdmin
        .from("users")
        .select("id, email, role, box_id")
        .eq("id", user.id)
        .single();

      diagnostics.admin_query = {
        profile: adminProfile,
        error: adminError?.message ?? null,
        role: adminProfile?.role ?? "NULL",
      };
    } else {
      diagnostics.admin_query = { error: "SUPABASE_SERVICE_ROLE_KEY not set!" };
    }

    // 4. Conclusion
    const finalRole = diagnostics.admin_query && 
      typeof diagnostics.admin_query === 'object' && 
      'role' in diagnostics.admin_query ? 
      diagnostics.admin_query.role : "UNKNOWN";
    
    diagnostics.conclusion = {
      final_role: finalRole,
      would_redirect_to: finalRole === "super_admin" ? "/super-admin" : finalRole === "student" ? "/alumno" : "/entrenador",
      rls_blocking_anon: anonError ? true : false,
      service_role_works: diagnostics.admin_query && typeof diagnostics.admin_query === 'object' && !('error' in diagnostics.admin_query && diagnostics.admin_query.error),
    };

  } catch (err) {
    diagnostics.fatal_error = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json(diagnostics, { status: 200 });
}
