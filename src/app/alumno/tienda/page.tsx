"use client";

import Link from "next/link";
import { ShoppingBag, Sparkles, Compass, Code2, ArrowLeft, ArrowUpRight } from "lucide-react";

export default function TiendaAlumnoPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden select-none pb-24">
      {/* Background gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="px-6 pt-12 pb-6 flex items-center justify-between border-b border-white/5 bg-slate-950/60 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link href="/alumno" className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
            <ArrowLeft className="w-4 h-4 text-slate-300" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Tienda del Box</h1>
            <p className="text-xs text-slate-400">Suplementos e indumentaria oficial</p>
          </div>
        </div>
        <Sparkles className="w-5 h-5 text-primary animate-pulse" />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 max-w-lg mx-auto py-12 space-y-8 z-10 w-full">
        {/* Glow Icon */}
        <div className="relative">
          <div className="absolute inset-0 bg-primary/30 rounded-3xl blur-2xl scale-125 animate-pulse" />
          <div className="relative w-20 h-20 rounded-3xl bg-slate-900 border border-white/10 flex items-center justify-center shadow-2xl">
            <ShoppingBag className="w-10 h-10 text-primary animate-bounce" />
          </div>
        </div>

        {/* Text */}
        <div className="text-center space-y-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 border border-primary/20 text-primary">
            Módulo en desarrollo
          </span>
          <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            La Tienda Digital <br />
            <span className="bg-gradient-to-r from-primary to-orange-400 bg-clip-text text-transparent">
              está siendo re-diseñada
            </span>
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed max-w-sm mx-auto">
            Estamos creando un mostrador interactivo para que puedas encargar tus proteínas, creatinas y ropa oficial del Box directamente desde tu móvil y retirarlos en mostrador.
          </p>
        </div>

        {/* Roadmap Card */}
        <div className="w-full bg-slate-900/60 border border-white/5 rounded-3xl p-5 backdrop-blur-xl shadow-xl space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-primary" /> Roadmap de Desarrollo
          </h3>
          <div className="space-y-3">
            {[
              { label: "Catálogo Online de Productos", status: "completado" },
              { label: "Pasarela de Cobros & Reservas Rápidas", status: "en_curso" },
              { label: "Cuenta de Consumos Mostrador", status: "pendiente" },
            ].map((step, idx) => (
              <div key={idx} className="flex items-center justify-between py-1 border-b border-white/5 last:border-0">
                <span className="text-xs font-medium text-slate-200">{step.label}</span>
                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                  step.status === "completado"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : step.status === "en_curso"
                    ? "bg-primary/10 text-primary border border-primary/20 animate-pulse"
                    : "bg-white/5 text-slate-500 border border-white/5"
                }`}>
                  {step.status === "completado" ? "Listo" : step.status === "en_curso" ? "En curso" : "Pronto"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Interactive action */}
        <Link href="/alumno" className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors group">
          Volver al panel principal
          <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </Link>
      </div>

      {/* Footer Branding */}
      <div className="text-center pb-6 text-[10px] text-slate-600 flex items-center justify-center gap-1.5 z-10">
        <Code2 className="w-3.5 h-3.5" />
        <span>Diseñado en Buenos Aires con estándares premium</span>
      </div>
    </div>
  );
}
