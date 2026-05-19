"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Dumbbell, Loader2, CheckCircle2, ArrowRight, Mail } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignedUp, setIsSignedUp] = useState(false);

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

  return (
    <div className="min-h-screen bg-sidebar flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="bg-primary rounded-2xl p-3 shadow-lg shadow-primary/20 mb-3">
            <Dumbbell className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-white text-2xl font-extrabold tracking-tight">EntrenAPP</h1>
          <p className="text-white/50 text-xs font-medium mt-0.5 uppercase tracking-wider">Crea tu perfil de alumno</p>
        </div>

        {/* Card de Registro */}
        <div className="bg-white rounded-3xl p-7 shadow-2xl border border-border/50">
          <h2 className="text-lg font-bold text-foreground mb-5 tracking-tight">Regístrate gratis</h2>

          <button
            type="button"
            onClick={handleGoogleSignup}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-medium py-3 rounded-xl transition disabled:opacity-60 shadow-sm mb-4"
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
            <div className="flex-grow border-t border-slate-100"></div>
            <span className="flex-shrink mx-3 text-muted-foreground text-[10px] uppercase tracking-widest font-semibold bg-white px-1">O usar correo</span>
            <div className="flex-grow border-t border-slate-100"></div>
          </div>

          <form onSubmit={handleSignup} className="space-y-3 mt-2">
            <div>
              <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1">Nombre Completo</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Juan Pérez"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@correo.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1">Contraseña</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1">Repetir Contraseña</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2 mt-3 shadow-md shadow-primary/10"
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

          <p className="text-center text-sm text-muted-foreground mt-5">
            ¿Ya tienes cuenta?{" "}
            <Link href="/auth/login" className="text-primary font-semibold hover:underline">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
