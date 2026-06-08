"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Dumbbell, Loader2, Eye, EyeOff } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const boxId = searchParams.get("box_id");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [branding, setBranding] = useState<{ name: string; color: string; logoUrl?: string } | null>(null);

  // Limpiar sesión rota
  useEffect(() => {
    const clearBrokenSession = async () => {
      if (searchParams.get("error") === "profile_not_found") {
        const supabase = createClient();
        await supabase.auth.signOut();
        toast.error("Tu sesión estaba atascada. Intenta registrarte nuevamente.");
        window.history.replaceState(null, "", "/auth/login");
      }
    };
    clearBrokenSession();
  }, [searchParams]);

  // Cargar branding si hay box_id
  useEffect(() => {
    if (boxId) {
      fetch(`/api/public/boxes/${boxId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.box) {
            setBranding({
              name: data.box.name,
              color: data.box.branding_config?.primary_color || "#EA580C",
              logoUrl: data.box.logo_url
            });
          }
        })
        .catch((err) => console.error("Error fetching box branding:", err));
    }
  }, [boxId]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast.error("Credenciales incorrectas. Verificá tu email y contraseña.");
      setLoading(false);
      return;
    }

    // El redirect lo maneja el middleware según el rol
    router.push("/");
    router.refresh();
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        toast.error(`Error: ${error.message}`);
        setLoading(false);
      }
    } catch (err: any) {
      console.error("Error en Google Login:", err);
      alert(`Fallo al abrir Google: ${err.message || err}`);
      setLoading(false);
    }
  };

  const primaryColor = branding?.color || "#ea580c";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative" style={{ backgroundColor: branding ? "#060608" : "#f1f5f9" }}>
      {/* Background glow if branded */}
      {branding && (
        <div 
          className="absolute inset-0 opacity-10 pointer-events-none" 
          style={{ background: `radial-gradient(circle at center, ${primaryColor} 0%, transparent 70%)` }}
        />
      )}

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          {branding?.logoUrl ? (
            <div className="rounded-2xl p-2 mb-4 shadow-lg w-16 h-16 overflow-hidden bg-white/5 border border-white/10" style={{ boxShadow: `0 10px 25px -5px rgba(0,0,0, 0.4)` }}>
              <img src={branding.logoUrl} alt="Logo" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div 
              className="rounded-2xl p-4 mb-4 shadow-lg"
              style={{ backgroundColor: primaryColor }}
            >
              <Dumbbell className="w-10 h-10 text-white" />
            </div>
          )}
          <h1 className="text-2xl font-bold" style={{ color: branding ? "white" : "#0f172a" }}>
            {branding ? branding.name : "EntrenAPP"}
          </h1>
          <p className="text-sm mt-1" style={{ color: branding ? "rgba(255,255,255,0.6)" : "#64748b" }}>
            {branding ? "Plataforma oficial" : "Plataforma de entrenamiento"}
          </p>
        </div>

        {/* Card */}
        <div 
          className="rounded-3xl p-8 shadow-2xl border"
          style={{ 
            backgroundColor: branding ? "rgba(255,255,255,0.02)" : "white",
            borderColor: branding ? "rgba(255,255,255,0.05)" : "transparent",
            backdropFilter: branding ? "blur(20px)" : "none"
          }}
        >
          <h2 className="text-xl font-semibold mb-6" style={{ color: branding ? "white" : "#0f172a" }}>
            Iniciar sesión
          </h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: branding ? "white" : "#0f172a" }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                className="w-full px-4 py-3 rounded-xl border transition"
                style={{ 
                  backgroundColor: branding ? "rgba(255,255,255,0.05)" : "#f8fafc",
                  borderColor: branding ? "rgba(255,255,255,0.1)" : "#e2e8f0",
                  color: branding ? "white" : "#0f172a"
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: branding ? "white" : "#0f172a" }}>
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 rounded-xl border transition pr-12"
                  style={{ 
                    backgroundColor: branding ? "rgba(255,255,255,0.05)" : "#f8fafc",
                    borderColor: branding ? "rgba(255,255,255,0.1)" : "#e2e8f0",
                    color: branding ? "white" : "#0f172a"
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors hover:bg-black/5"
                  style={{ color: branding ? "rgba(255,255,255,0.5)" : "#94a3b8" }}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 mt-2 shadow-lg"
              style={{ backgroundColor: primaryColor }}
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Ingresando...</>
              ) : "Ingresar"}
            </button>
          </form>

          <div className="relative flex py-5 items-center mt-2">
            <div className="flex-grow border-t" style={{ borderColor: branding ? "rgba(255,255,255,0.1)" : "#f1f5f9" }}></div>
            <span 
              className="flex-shrink mx-4 text-[10px] uppercase tracking-wider font-semibold px-2"
              style={{ 
                color: branding ? "rgba(255,255,255,0.4)" : "#64748b",
                backgroundColor: branding ? "transparent" : "white" 
              }}
            >
              O continuar con
            </span>
            <div className="flex-grow border-t" style={{ borderColor: branding ? "rgba(255,255,255,0.1)" : "#f1f5f9" }}></div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 font-medium py-3 rounded-xl transition disabled:opacity-60 shadow-sm border"
            style={{ 
              backgroundColor: branding ? "rgba(255,255,255,0.05)" : "white",
              borderColor: branding ? "rgba(255,255,255,0.1)" : "#e2e8f0",
              color: branding ? "white" : "#334155"
            }}
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            Entrar con Google
          </button>

          <p className="text-center text-sm mt-6" style={{ color: branding ? "rgba(255,255,255,0.5)" : "#64748b" }}>
            ¿No tenés una cuenta?{" "}
            <Link 
              href={branding ? `/auth/signup?box_id=${boxId}` : "/auth/signup"} 
              className="font-bold hover:underline"
              style={{ color: primaryColor }}
            >
              Registrate gratis
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#060608] flex items-center justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>}>
      <LoginForm />
    </Suspense>
  );
}

