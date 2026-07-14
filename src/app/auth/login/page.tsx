"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Dumbbell, Loader2 } from "lucide-react";
import FlipCard, { FlipCardField } from "@/components/ui/flip-card";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const boxId = searchParams.get("box_id");

  const [loading, setLoading] = useState(false);
  const [branding, setBranding] = useState<{ name: string; color: string; logoUrl?: string } | null>(null);
  const [brandingError, setBrandingError] = useState(false);

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
        .then((res) => {
          if (!res.ok) throw new Error("Box not found");
          return res.json();
        })
        .then((data) => {
          if (data.box) {
            setBranding({
              name: data.box.name,
              color: data.box.branding_config?.primary_color || "#EA580C",
              logoUrl: data.box.logo_url
            });
          } else {
            setBrandingError(true);
          }
        })
        .catch((err) => {
          console.error("Error fetching box branding:", err);
          setBrandingError(true);
        });
    }
  }, [boxId]);

  const handleLogin = async (data: Record<string, string>) => {
    const email = data.email;
    const password = data.password;

    if (!email || !password) {
      toast.error("Por favor completá todos los campos.");
      return false;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast.error("Credenciales incorrectas. Verificá tu email y contraseña.");
      setLoading(false);
      return false;
    }

    toast.success("¡Sesión iniciada!");
    window.location.href = "/";
    return true;
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
  const isBranded = !!branding;

  const fields: FlipCardField[] = [
    { name: "email", type: "email", label: "Email", placeholder: "tu@email.com" },
    { name: "password", type: "password", label: "Contraseña", placeholder: "••••••••" },
  ];

  const frontIllustration = branding?.logoUrl ? (
    <div 
      className="rounded-2xl p-2 mb-2 shadow-lg w-16 h-16 overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center"
      style={{ boxShadow: `0 10px 25px -5px rgba(0,0,0, 0.4)` }}
    >
      <img src={branding.logoUrl} alt="Logo" className="w-full h-full object-cover rounded-xl" />
    </div>
  ) : (
    <div 
      className="rounded-2xl p-4 mb-2 shadow-lg"
      style={{ backgroundColor: primaryColor }}
    >
      <Dumbbell className="w-10 h-10 text-white" />
    </div>
  );

  const backIllustration = branding?.logoUrl ? (
    <div className="rounded-xl p-1 w-10 h-10 overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
      <img src={branding.logoUrl} alt="Logo" className="w-full h-full object-cover rounded-lg" />
    </div>
  ) : (
    <div 
      className="rounded-xl p-2 shrink-0"
      style={{ backgroundColor: primaryColor }}
    >
      <Dumbbell className="w-5 h-5 text-white" />
    </div>
  );

  const frontContent = (
    <div className={cn(
      "mt-5 space-y-3.5 text-sm max-w-xs text-left w-full px-2 mb-3",
      isBranded ? "text-white/70" : "text-slate-600"
    )}>
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <span className={cn("font-semibold text-xs", isBranded ? "text-white/80" : "text-slate-700")}>
          Accedé a tus planificaciones y WODs
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/25 flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <span className={cn("font-semibold text-xs", isBranded ? "text-white/80" : "text-slate-700")}>
          Reservá tus clases en segundos
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        </div>
        <span className={cn("font-semibold text-xs", isBranded ? "text-white/80" : "text-slate-700")}>
          Gestioná tus pagos de forma ágil
        </span>
      </div>
    </div>
  );

  const extraFormContent = (
    <div className="space-y-4">
      <div className="relative flex py-2 items-center">
        <div className={cn("flex-grow border-t", isBranded ? "border-white/10" : "border-slate-200")} />
        <span className={cn(
          "flex-shrink mx-4 text-[10px] uppercase tracking-wider font-semibold px-2",
          isBranded ? "text-white/40" : "text-slate-400"
        )}>
          O continuar con
        </span>
        <div className={cn("flex-grow border-t", isBranded ? "border-white/10" : "border-slate-200")} />
      </div>

      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={loading}
        className={cn(
          "w-full flex items-center justify-center gap-3 font-medium py-3 rounded-xl transition disabled:opacity-60 shadow-sm border text-sm",
          isBranded
            ? "bg-white/5 hover:bg-white/10 border-white/10 text-white"
            : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
        )}
      >
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
        </svg>
        Entrar con Google
      </button>

      <p className="text-center text-xs mt-3">
        <span className={isBranded ? "text-white/40" : "text-slate-400"}>¿No tenés una cuenta? </span>
        <Link 
          href={branding ? `/auth/signup?box_id=${boxId}` : "/auth/signup"} 
          className="font-bold hover:underline"
          style={{ color: primaryColor }}
        >
          Registrate gratis
        </Link>
      </p>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ backgroundColor: branding ? "#060608" : "#f1f5f9" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        body {
          background-color: ${branding ? "#060608" : "#f1f5f9"} !important;
        }
      `}} />
      {/* Background glow if branded */}
      {branding && (
        <div 
          className="absolute inset-0 opacity-15 pointer-events-none" 
          style={{ background: `radial-gradient(circle at center, ${primaryColor} 0%, transparent 70%)` }}
        />
      )}

      <div className="w-full max-w-[390px] relative z-10 flex justify-center items-center min-h-[600px]">
        <AnimatePresence mode="wait">
          {boxId && !branding && !brandingError ? (
            <motion.div
              key="loader"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, y: -20, transition: { duration: 0.25 } }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="flex flex-col items-center gap-4"
            >
              <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl flex items-center justify-center shadow-2xl">
                <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
              </div>
              <p className="text-white/60 text-xs font-bold uppercase tracking-wider animate-pulse">Cargando gimnasio...</p>
            </motion.div>
          ) : (
            <motion.div
              key="card"
              initial={{ opacity: 0, x: 50, filter: "blur(4px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, x: -50, filter: "blur(4px)" }}
              transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
              className="w-full"
            >
              <FlipCard
                frontTitle={branding ? branding.name : "EntrenAPP"}
                frontDescription={branding ? "Plataforma oficial" : "Plataforma de entrenamiento"}
                frontIllustration={frontIllustration}
                frontContent={frontContent}
                backTitle="Ingresá a tu cuenta"
                backDescription="Ingresá tus credenciales"
                backIllustration={backIllustration}
                fields={fields}
                onLogin={handleLogin}
                loginButtonText="Ingresar"
                backButtonText="Volver"
                successButtonText="Continuar"
                successTitle="¡Ingreso Exitoso! 🎉"
                successDescription="Sesión iniciada correctamente, ya podés entrenar."
                isBranded={isBranded}
                primaryColor={primaryColor}
                extraFormContent={extraFormContent}
                cardHeight={600}
              />
            </motion.div>
          )}
        </AnimatePresence>
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
