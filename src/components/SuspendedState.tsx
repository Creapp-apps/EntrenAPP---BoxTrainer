"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Lock, LogOut, AlertTriangle, MessageCircle } from "lucide-react";
import { useState } from "react";

interface SuspendedProps {
  status: "paused" | "suspended";
  reason: string | null;
  boxName: string;
  boxPhone: string | null;
}

export default function SuspendedState({ status, reason, boxName, boxPhone }: SuspendedProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  };

  const isPaused = status === "paused";
  
  // Generar URL de WhatsApp para resolver situación
  const getWhatsappUrl = () => {
    if (!boxPhone) return null;
    const cleanPhone = boxPhone.replace(/[^\d]/g, "");
    const text = encodeURIComponent(
      `¡Hola! Soy alumno de ${boxName}. Veo que mi cuenta de EntrenAPP se encuentra ${isPaused ? "pausada" : "suspendida"}. Me gustaría regularizar mi situación.`
    );
    return `https://wa.me/${cleanPhone}?text=${text}`;
  };

  const waUrl = getWhatsappUrl();

  return (
    <div className="min-h-screen bg-[#050508] text-white flex flex-col items-center justify-center p-4 select-none relative overflow-hidden">
      {/* Resplandores de Luz */}
      <div className={`absolute -top-48 -left-48 w-96 h-96 rounded-full blur-[140px] pointer-events-none ${
        isPaused ? "bg-amber-500/10" : "bg-red-600/10"
      }`} />
      <div className={`absolute -bottom-48 -right-48 w-96 h-96 rounded-full blur-[140px] pointer-events-none ${
        isPaused ? "bg-amber-500/5" : "bg-red-600/5"
      }`} />

      <div className="w-full max-w-md bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl p-8 text-center relative overflow-hidden animate-in zoom-in-95 duration-500">
        <div className="relative z-10 flex flex-col items-center">
          
          {/* Icono Grande e Iluminado */}
          <div className={`w-24 h-24 rounded-[32px] flex items-center justify-center mb-6 shadow-2xl shadow-black/40 relative ${
            isPaused 
              ? "bg-gradient-to-br from-amber-400 to-amber-600" 
              : "bg-gradient-to-br from-red-500 to-red-700"
          }`}>
            {isPaused ? (
              <AlertTriangle className="w-10 h-10 text-slate-950 stroke-[2.5]" />
            ) : (
              <Lock className="w-10 h-10 text-white stroke-[2.5]" />
            )}
            {/* Destello perimetral */}
            <div className={`absolute inset-0 rounded-[32px] animate-pulse pointer-events-none opacity-50 blur-md ${
              isPaused ? "bg-amber-500" : "bg-red-500"
            }`} />
          </div>

          <h1 className="text-2xl font-black tracking-tight mb-2 bg-gradient-to-b from-white to-slate-300 bg-clip-text text-transparent">
            {isPaused ? "Cuenta Pausada" : "Acceso Restringido"}
          </h1>
          
          <p className="text-sm text-slate-400 font-semibold tracking-wider uppercase text-[10px] mb-6">
            {boxName}
          </p>

          {/* Tarjeta de Motivo */}
          <div className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl p-5 text-center mb-8">
            <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-2">
              Motivo de la {isPaused ? "pausa" : "suspensión"}:
            </p>
            <p className="text-slate-200 font-medium leading-relaxed text-sm italic">
              "{reason || (isPaused 
                ? "Tu abono expiró o se solicitó una pausa temporal." 
                : "Cuenta bloqueada por la administración.")}"
            </p>
          </div>

          <p className="text-slate-400 text-xs leading-relaxed mb-8 max-w-[280px]">
            Para reactivar tus reservas de turnos y ver la planificación del día, por favor comunícate con el administrador de tu centro.
          </p>

          {/* Botones de Acción */}
          <div className="flex flex-col w-full gap-3">
            {waUrl && (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2.5 transition shadow-lg shadow-green-900/20 hover:scale-[1.02]"
              >
                <MessageCircle className="w-5 h-5 fill-white" />
                Contactar por WhatsApp
              </a>
            )}
            
            <button
              onClick={handleLogout}
              disabled={loading}
              className="w-full py-3.5 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white rounded-2xl font-semibold text-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <LogOut className="w-4 h-4" />
              {loading ? "Cerrando..." : "Cerrar Sesión"}
            </button>
          </div>

        </div>
      </div>

      <p className="text-white/10 text-[9px] mt-8 font-black tracking-widest uppercase">
        Seguridad y Acceso · EntrenAPP
      </p>
    </div>
  );
}
