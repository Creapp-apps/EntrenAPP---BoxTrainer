"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Dumbbell, LogOut } from "lucide-react";
import { useState } from "react";

export default function NoBoxState({ fullName }: { fullName: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  };

  const firstName = fullName ? fullName.split(" ")[0] : "atleta";

  return (
    <div className="min-h-screen bg-sidebar flex flex-col items-center justify-center p-4 select-none">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 text-center relative overflow-hidden border border-border">
        {/* Efecto de fondo */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl" />

        <div className="relative">
          {/* Icono Animado */}
          <div className="w-20 h-20 mx-auto bg-primary/10 rounded-3xl flex items-center justify-center mb-6">
            <Dumbbell className="w-10 h-10 text-primary animate-pulse" />
          </div>

          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
            ¡Hola, {firstName}!
          </h1>
          
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
            Tu cuenta de alumno está lista y activa en EntrenAPP, pero aún no estás vinculado a ningún Box.
          </p>

          {/* Tarjeta informativa */}
          <div className="mt-6 bg-slate-50 rounded-2xl p-4 border border-slate-200/60 text-left">
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
              ¿Cómo empezar a entrenar?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Pídele a tu coach o profesor que te comparta su <strong>enlace de invitación de WhatsApp</strong>. Al abrir ese enlace, tu perfil quedará conectado automáticamente a su planificación.
            </p>
          </div>

          {/* Botones de acción */}
          <div className="mt-8 flex flex-col gap-3">
            <button
              onClick={handleLogout}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-white hover:bg-red-50 border border-slate-200 text-slate-600 hover:text-red-600 py-3.5 px-4 rounded-2xl font-semibold transition disabled:opacity-50"
            >
              <LogOut className="w-4 h-4" />
              {loading ? "Cerrando sesión..." : "Cerrar Sesión"}
            </button>
          </div>
        </div>
      </div>
      
      <p className="text-white/30 text-[9px] mt-8 font-bold tracking-widest uppercase">
        ENTRENAPP CORE
      </p>
    </div>
  );
}
