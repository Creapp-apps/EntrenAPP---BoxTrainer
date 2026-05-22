"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Dumbbell, Loader2, CheckCircle2, ArrowRight, Mail } from "lucide-react";

export function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const searchParams = useSearchParams();
  const urlBoxId = searchParams.get("box_id");
  const [loading, setLoading] = useState(false);
  const [isSignedUp, setIsSignedUp] = useState(false);
  const [branding, setBranding] = useState<{ name: string; color: string; logoUrl?: string } | null>(null);

  useEffect(() => {
    // Intentar capturar boxId de la URL o del almacenamiento local
    const boxId = urlBoxId || localStorage.getItem("pending_invite_box_id");
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
  }, [urlBoxId]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error("Las contraseñas no coinciden.");
      return;
    }

    if (password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    // Intentar capturar el box_id pendiente del almacenamiento local o cookies
    let pendingBoxId = null;
    if (typeof window !== "undefined") {
      pendingBoxId = localStorage.getItem("pending_invite_box_id");
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Metadatos para el Trigger de la Base de Datos SQL
        data: {
          full_name: fullName,
          role: "student",
          box_id: pendingBoxId || null,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      toast.error(error.message || "Ocurrió un error al registrarse.");
      setLoading(false);
      return;
    }

    // Si el registro fue exitoso y requiere confirmación de email
    if (data?.user?.identities?.length === 0) {
      // El email ya está registrado en la auth de Supabase
      toast.error("Este correo ya se encuentra registrado.");
      setLoading(false);
    } else {
      // 🔥 Disparar Mail de Bienvenida Premium en background vía Resend
      try {
        fetch("/api/auth/welcome-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, fullName }),
        });
      } catch (mailErr) {
        console.error("Fallo silencioso enviando bienvenida:", mailErr);
      }

      setIsSignedUp(true);
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        toast.error(`Error: ${error.message}`);
        setLoading(false);
      }
    } catch (err: any) {
      console.error("Error catastrófico en Google Signup:", err);
      alert(`Fallo al abrir Google: ${err.message || err}`);
      setLoading(false);
    }
  };

  // Vista de éxito (Confirmación de Mail Pendiente)
  if (isSignedUp) {
    return (
      <div className="min-h-screen bg-sidebar flex items-center justify-center p-4 animate-in fade-in duration-300">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl border border-border text-center">
          <div className="w-16 h-16 mx-auto bg-green-50 rounded-2xl flex items-center justify-center mb-6">
            <Mail className="w-8 h-8 text-green-600 animate-pulse" />
          </div>
          
          <h2 className="text-2xl font-bold text-foreground tracking-tight">¡Casi listo!</h2>
          <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
            Te enviamos un correo de confirmación a <br/>
            <strong className="text-foreground">{email}</strong>.
          </p>
          <p className="text-muted-foreground text-xs mt-2 italic">
            Por favor, revisa tu bandeja de entrada (y correo no deseado) y haz clic en el enlace para activar tu cuenta.
          </p>

          <div className="mt-8 pt-6 border-t border-slate-100">
            <Link 
              href="/auth/login" 
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
            >
              Volver al inicio de sesión
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const primaryColor = branding?.color || "#ea580c";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 select-none relative" style={{ backgroundColor: branding ? "#060608" : "#f1f5f9" }}>
      {/* Background glow if branded */}
      {branding && (
        <div 
          className="absolute inset-0 opacity-10 pointer-events-none" 
          style={{ background: `radial-gradient(circle at center, ${primaryColor} 0%, transparent 70%)` }}
        />
      )}

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          {branding?.logoUrl ? (
            <div className="rounded-2xl p-2 mb-4 shadow-lg w-16 h-16 overflow-hidden bg-white/5 border border-white/10" style={{ boxShadow: `0 10px 25px -5px rgba(0,0,0, 0.4)` }}>
              <img src={branding.logoUrl} alt="Logo" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div 
              className="rounded-2xl p-3 mb-3 shadow-lg"
              style={{ backgroundColor: primaryColor }}
            >
              <Dumbbell className="w-8 h-8 text-white" />
            </div>
          )}
          <h1 className="text-2xl font-bold" style={{ color: branding ? "white" : "#0f172a" }}>
            {branding ? branding.name : "EntrenAPP"}
          </h1>
          <p className="text-sm mt-1" style={{ color: branding ? "rgba(255,255,255,0.6)" : "#64748b" }}>
            {branding ? "Crea tu perfil en el Box" : "Crea tu perfil de alumno"}
          </p>
        </div>

        {/* Card de Registro */}
        <div 
          className="rounded-3xl p-7 shadow-2xl border"
          style={{ 
            backgroundColor: branding ? "rgba(255,255,255,0.02)" : "white",
            borderColor: branding ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.1)",
            backdropFilter: branding ? "blur(20px)" : "none"
          }}
        >
          <h2 className="text-lg font-bold mb-5 tracking-tight" style={{ color: branding ? "white" : "#0f172a" }}>Regístrate gratis</h2>

          <button
            type="button"
            onClick={handleGoogleSignup}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 font-medium py-3 rounded-xl transition disabled:opacity-60 shadow-sm mb-4 border"
            style={{ 
              backgroundColor: branding ? "rgba(255,255,255,0.05)" : "white",
              borderColor: branding ? "rgba(255,255,255,0.1)" : "#e2e8f0",
              color: branding ? "white" : "#334155"
            }}
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            Registrarse con Google
          </button>

          <div className="relative flex py-3 items-center">
            <div className="flex-grow border-t" style={{ borderColor: branding ? "rgba(255,255,255,0.1)" : "#f1f5f9" }}></div>
            <span 
              className="flex-shrink mx-3 text-[10px] uppercase tracking-widest font-semibold px-1"
              style={{ 
                color: branding ? "rgba(255,255,255,0.4)" : "#64748b",
                backgroundColor: branding ? "transparent" : "white" 
              }}
            >
              O usar correo
            </span>
            <div className="flex-grow border-t" style={{ borderColor: branding ? "rgba(255,255,255,0.1)" : "#f1f5f9" }}></div>
          </div>

          <form onSubmit={handleSignup} className="space-y-3 mt-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: branding ? "white" : "#0f172a" }}>Nombre Completo</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Juan Pérez"
                className="w-full px-3.5 py-2.5 rounded-xl border transition"
                style={{ 
                  backgroundColor: branding ? "rgba(255,255,255,0.05)" : "#f8fafc",
                  borderColor: branding ? "rgba(255,255,255,0.1)" : "#e2e8f0",
                  color: branding ? "white" : "#0f172a"
                }}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: branding ? "white" : "#0f172a" }}>Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@correo.com"
                className="w-full px-3.5 py-2.5 rounded-xl border transition"
                style={{ 
                  backgroundColor: branding ? "rgba(255,255,255,0.05)" : "#f8fafc",
                  borderColor: branding ? "rgba(255,255,255,0.1)" : "#e2e8f0",
                  color: branding ? "white" : "#0f172a"
                }}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: branding ? "white" : "#0f172a" }}>Contraseña</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl border transition"
                  style={{ 
                    backgroundColor: branding ? "rgba(255,255,255,0.05)" : "#f8fafc",
                    borderColor: branding ? "rgba(255,255,255,0.1)" : "#e2e8f0",
                    color: branding ? "white" : "#0f172a"
                  }}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: branding ? "white" : "#0f172a" }}>Repetir Contraseña</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl border transition"
                  style={{ 
                    backgroundColor: branding ? "rgba(255,255,255,0.05)" : "#f8fafc",
                    borderColor: branding ? "rgba(255,255,255,0.1)" : "#e2e8f0",
                    color: branding ? "white" : "#0f172a"
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2 mt-3 shadow-lg"
              style={{ backgroundColor: primaryColor }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creando cuenta...
                </>
              ) : (
                "Crear Cuenta"
              )}
            </button>
          </form>

          <p className="text-center text-sm mt-5" style={{ color: branding ? "rgba(255,255,255,0.5)" : "#64748b" }}>
            ¿Ya tienes cuenta?{" "}
            <Link 
              href={branding ? `/auth/login?box_id=${urlBoxId || ''}` : "/auth/login"} 
              className="font-semibold hover:underline"
              style={{ color: primaryColor }}
            >
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

import { Suspense } from "react";
export default function SignupPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#060608] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>}>
      <SignupPage />
    </Suspense>
  );
}
