import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Cliente ANON para manejar la sesión del usuario (cookies)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as Parameters<typeof supabaseResponse.cookies.set>[2])
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Rutas públicas
  if (pathname.startsWith("/auth")) {
    if (user) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return supabaseResponse;
  }

  // Rutas protegidas — redirigir a login si no hay sesión
  if (!user) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // Cliente SERVICE ROLE para leer el rol — bypasea RLS completamente
  // Esto evita el problema de recursión con get_my_role() en las policies
  const supabaseAdmin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {
          // No necesita setear cookies — solo lectura
        },
      },
    }
  );

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("[Middleware] Error DB:", profileError.message, "| user:", user.email);
  }

  const role: string | undefined = profile?.role ?? undefined;

  console.log("[Middleware] user:", user.email, "| role:", role, "| path:", pathname);

  // Super admin puede acceder a todo
  if (role === "super_admin") {
    return supabaseResponse;
  }

  // Solo super_admin puede acceder a /super-admin
  if (pathname.startsWith("/super-admin")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Alumnos no pueden acceder al panel del entrenador
  if (pathname.startsWith("/entrenador") && role === "student") {
    return NextResponse.redirect(new URL("/alumno", request.url));
  }

  // Entrenadores/profesores no pueden acceder al panel del alumno
  if (pathname.startsWith("/alumno") && (role === "trainer" || role === "co_trainer" || role === "professor")) {
    return NextResponse.redirect(new URL("/entrenador", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
