"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Dumbbell, ArrowRight, CheckCircle2, BarChart3,
  Users, Calendar, ChevronDown, Sparkles, Zap, CreditCard,
  Trophy, MessageCircle, Activity, ShieldCheck, Clock,
} from "lucide-react";

// ─── Palabras que rotan en el H1 ────────────────────────────────
const ROTATING_WORDS = [
  "Box",
  "Gimnasio",
  "Centro de Pilates",
  "Espacio de Yoga",
  "Centro Funcional",
  "Centro de Halterofilia",
  "Espacio CrossFit",
];

function RotatingWord() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex(i => (i + 1) % ROTATING_WORDS.length);
        setVisible(true);
      }, 400);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  return (
    <span
      className="bg-gradient-to-r from-primary via-orange-400 to-yellow-400 bg-clip-text text-transparent block transition-all duration-400"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(10px)",
        transition: "opacity 0.35s ease, transform 0.35s ease",
        display: "inline-block",
        minWidth: "1px",
      }}
    >
      {ROTATING_WORDS[index]}
    </span>
  );
}

// ─── Datos de los tabs de disciplinas ───────────────────────────
const DISCIPLINES = [
  {
    key: "crossfit",
    label: "CrossFit",
    emoji: "🏋️",
    title: "Boxes de CrossFit",
    desc: "Control total de WODs por niveles, asignación masiva de ciclos, benchmarks históricos y reservas por hora en tiempo real con lista de espera automática.",
    color: "from-orange-500 to-red-600",
    glow: "bg-orange-500/15",
    features: ["WODs por niveles", "Cálculo automático de RMs", "Benchmarks históricos", "Lista de espera WA"],
  },
  {
    key: "halterofilia",
    label: "Halterofilia",
    emoji: "🥇",
    title: "Entrenamiento de Fuerza",
    desc: "Planificación de ciclos de fuerza con porcentajes de 1RM, complexes, trepadas y seguimiento de récords por ejercicio. Diseñado para programación seria.",
    color: "from-blue-500 to-indigo-600",
    glow: "bg-blue-500/15",
    features: ["Ciclos con % de 1RM", "Complexes y trepadas", "Récords personales", "Historial de sesiones"],
  },
  {
    key: "funcional",
    label: "Funcional",
    emoji: "⚡",
    title: "Entrenamiento Funcional",
    desc: "Gestión de circuitos, rotaciones y cronómetros. Clases diferenciadas por nivel y cobros automatizados por cuota mensual o pase libre.",
    color: "from-cyan-500 to-teal-600",
    glow: "bg-cyan-500/15",
    features: ["Circuitos por nivel", "Clases y cupos", "Cobro por cuota", "App para socios"],
  },
  {
    key: "pilates",
    label: "Pilates / Yoga",
    emoji: "🧘",
    title: "Studios de Pilates & Yoga",
    desc: "Control estricto de cupos limitados por reformer, reservas fijas semanales y gestión personalizada de cada alumno. Perfecto para studios íntimos.",
    color: "from-purple-500 to-pink-600",
    glow: "bg-purple-500/15",
    features: ["Cupos por reformer", "Turnos fijos semanales", "Gestión personalizada", "Planes a medida"],
  },
  {
    key: "musculacion",
    label: "Musculación",
    emoji: "💪",
    title: "Gimnasios de Musculación",
    desc: "Rutinas digitales autogestionables para cada alumno, cobros automatizados por débito y métricas financieras en tiempo real desde el panel web.",
    color: "from-green-500 to-emerald-600",
    glow: "bg-green-500/15",
    features: ["Rutinas digitales", "Cobros automáticos", "Panel web del entrenador", "Métricas MRR"],
  },
];

// ─── Plan features (iguales en los 3 planes) ────────────────────
const PLAN_FEATURES = [
  "App móvil para atletas (PWA)",
  "Panel web para entrenadores",
  "Planificación de ciclos de entrenamiento",
  "Gestión de turnos y reservas",
  "Cobros y control de cuotas",
  "Métricas financieras en tiempo real",
  "Récords personales y benchmarks",
  "Soporte por WhatsApp 24/7",
  "Migración de datos incluida",
  "Identidad visual personalizable",
];

// ─── FAQ ────────────────────────────────────────────────────────
const FAQS = [
  {
    q: "¿Es una app nativa para Android e iOS?",
    a: "Usamos la tecnología líder del mercado (PWA — Progressive Web App). Tus alumnos instalan una WebApp ultra-rápida directo desde el navegador, ocupa 100x menos que una app nativa y se actualiza automáticamente. Sin pasar por las tiendas.",
  },
  {
    q: "¿Es difícil migrar mis datos desde otro software?",
    a: "¡Para nada! Nuestro equipo te ayuda gratis a importar tu listado de alumnos y planes desde Excel o cualquier sistema que uses, para que estés facturando desde el día 1.",
  },
  {
    q: "¿Puedo probar antes de pagar?",
    a: "Sí. Ofrecemos un período de prueba sin costo y sin compromiso de permanencia. Usás todas las funciones completas y decidís si es lo que tu centro necesita.",
  },
  {
    q: "¿Cómo se configuran los horarios y cupos?",
    a: "Desde el panel web configurás plantillas de horarios, cupos máximos por clase, tiempos de cancelación y lista de espera automática. Tarda menos de 10 minutos en estar listo.",
  },
  {
    q: "¿Qué pasa si supero el límite de alumnos de mi plan?",
    a: "Te avisamos con anticipación y podés cambiar de plan cuando quieras, sin cargos extra ni penalidades. Siempre se adapta a tu crecimiento.",
  },
];

// ─── Componente Principal ─────────────────────────────────────────
export default function LandingClient() {
  const [activeTab, setActiveTab] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const disc = DISCIPLINES[activeTab];

  return (
    <div className="min-h-screen bg-[#060608] text-white font-sans overflow-x-hidden selection:bg-primary/30">

      {/* ── Fondo Ambiental Global ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-600/8 blur-[150px]" />
        <div className="absolute top-[30%] right-[-15%] w-[45%] h-[45%] rounded-full bg-primary/8 blur-[130px]" />
        <div className="absolute bottom-0 left-[10%] w-[70%] h-[40%] rounded-full bg-violet-700/5 blur-[180px]" />
      </div>

      {/* ══════════════════════════════════════════════════
          NAVBAR
      ══════════════════════════════════════════════════ */}
      <header
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${
          scrolled
            ? "bg-[#060608]/90 backdrop-blur-2xl border-b border-white/8 shadow-2xl shadow-black/50"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-8 h-[72px] flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-1.5 sm:gap-2.5 group">
            <div className="bg-gradient-to-br from-primary to-orange-600 p-1.5 sm:p-2.5 rounded-[10px] sm:rounded-[14px] shadow-lg shadow-primary/30 group-hover:scale-105 transition-all duration-300">
              <Dumbbell className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <span className="text-lg sm:text-xl font-black tracking-tight text-white">
              EntrenAPP
            </span>
          </Link>

          {/* Nav links — desktop */}
          <nav className="hidden lg:flex items-center gap-7 text-sm font-semibold text-white/50">
            <a href="#features" className="hover:text-white transition-colors">Funcionalidades</a>
            <a href="#disciplines" className="hover:text-white transition-colors">Disciplinas</a>
            <a href="#pricing" className="hover:text-white transition-colors">Planes</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </nav>

          {/* CTA buttons */}
          <div className="flex items-center justify-end gap-1 sm:gap-3">
            <div className="flex items-center gap-0.5 sm:gap-2">
              <Link
                href="/buscar-box"
                className="text-xs sm:text-sm font-bold text-white/60 hover:text-white px-1.5 sm:px-3 py-1.5 rounded-xl transition-colors whitespace-nowrap"
              >
                <span className="hidden min-[480px]:inline">Soy </span>Alumno
              </Link>
              <span className="text-white/20 text-xs sm:hidden">|</span>
              <Link
                href="/buscar-box"
                className="text-xs sm:text-sm font-bold text-slate-400 hover:text-white transition px-1.5 sm:px-3 py-1.5 rounded-lg hover:bg-white/5 whitespace-nowrap"
              >
                <span className="hidden min-[480px]:inline">Soy </span>Entrenador
              </Link>
            </div>
            <Link
              href="/auth/signup"
              className="hidden sm:flex bg-gradient-to-r from-primary to-orange-500 text-white text-sm font-black px-5 py-2.5 rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] transition-all duration-200 items-center gap-1.5"
            >
              Empezar gratis
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════
          HERO SECTION
      ══════════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex flex-col justify-center pt-24 pb-16 px-5 sm:px-8 overflow-hidden z-10">

        {/* Grid decorativo de fondo */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />

        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

          {/* ── Copy principal ── */}
          <div className="flex flex-col items-start text-left">

            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-8 backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-black tracking-widest text-primary uppercase">
                La plataforma #1 para centros de entrenamiento
              </span>
            </div>

            {/* H1 con palabra rotante */}
            <h1 className="text-5xl sm:text-6xl xl:text-7xl font-black tracking-tight leading-[1.03] text-white mb-6">
              Gestiona tu<br />
              <RotatingWord />
            </h1>

            <p className="text-lg sm:text-xl text-white/50 leading-relaxed max-w-lg mb-10">
              EntrenAPP centraliza la planificación deportiva, reservas, cobros y métricas en un solo ecosistema premium diseñado para entrenadores serios.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Link
                href="/auth/signup"
                className="bg-gradient-to-r from-primary to-orange-500 text-white font-black px-8 py-4 rounded-2xl shadow-xl shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-0.5 transition-all duration-300 text-base flex items-center justify-center gap-2.5 group"
              >
                Crear cuenta gratis
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a
                href="https://wa.me/541165234769/?text=Hola!%20Quiero%20una%20demo%20de%20EntrenAPP"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-bold px-8 py-4 rounded-2xl transition-all duration-300 text-base flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-5 h-5 text-[#25d366]" />
                Ver demo
              </a>
            </div>

            {/* Mini Stats */}
            <div className="flex items-center gap-8 mt-12 pt-8 border-t border-white/5 w-full">
              {[
                { value: "+200", label: "Centros activos" },
                { value: "99.9%", label: "Uptime garantizado" },
                { value: "24/7", label: "Soporte WhatsApp" },
              ].map((s) => (
                <div key={s.label}>
                  <div className="text-2xl font-black text-white">{s.value}</div>
                  <div className="text-xs text-white/35 font-semibold uppercase tracking-wider mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── 3D Spline Scene ── */}
          <div className="relative h-[400px] sm:h-[520px] lg:h-[620px] flex items-center justify-center mt-8 lg:mt-0">
            {/* Glow detrás de la escena */}
            <div className="absolute w-[80%] h-[80%] rounded-full bg-primary/20 blur-[100px]" />

            {/* Floating badge — ingresos */}
            <div
              className="absolute top-10 right-4 z-20 bg-black/50 backdrop-blur-xl border border-white/10 px-4 py-3 rounded-2xl flex items-center gap-3 shadow-2xl pointer-events-none"
              style={{ animation: "float1 5s ease-in-out infinite" }}
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <div className="text-[10px] text-white/40 font-semibold uppercase">Ingresos este mes</div>
                <div className="text-sm font-black text-white">$1.240.000</div>
              </div>
            </div>

            {/* Floating badge — alumnos */}
            <div
              className="absolute bottom-16 left-2 z-20 bg-black/50 backdrop-blur-xl border border-white/10 px-4 py-3 rounded-2xl flex items-center gap-3 shadow-2xl pointer-events-none"
              style={{ animation: "float2 6s ease-in-out infinite" }}
            >
              <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
                <Users className="w-4 h-4 text-primary" />
              </div>
              <div>
                <div className="text-[10px] text-white/40 font-semibold uppercase">Alumnos activos</div>
                <div className="text-sm font-black text-white">148 atletas</div>
              </div>
            </div>

            {/* Floating badge — clase llena */}
            <div
              className="absolute top-[42%] -left-4 z-20 bg-black/50 backdrop-blur-xl border border-white/10 px-4 py-3 rounded-2xl flex items-center gap-3 shadow-2xl pointer-events-none"
              style={{ animation: "float3 7s ease-in-out infinite" }}
            >
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                <Activity className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <div className="text-[10px] text-white/40 font-semibold uppercase">Clase 19:00hs</div>
                <div className="text-sm font-black text-white">18/20 cupos</div>
              </div>
            </div>

            {mounted ? (
              <div 
                className="w-full h-full z-10 flex items-center justify-center pointer-events-none"
                style={{ perspective: "1000px" }}
              >
                <div 
                  className="w-full max-w-[500px] aspect-video bg-[#0a0a0f]/80 backdrop-blur-xl rounded-2xl border border-white/10 flex flex-col overflow-hidden relative"
                  style={{ 
                    transform: "rotateY(-15deg) rotateX(10deg) rotateZ(2deg)",
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7), -20px 20px 40px rgba(234, 88, 12, 0.15)"
                  }}
                >
                  {/* Dashboard top bar */}
                  <div className="h-10 border-b border-white/10 bg-white/5 flex items-center px-4 gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  </div>
                  {/* Dashboard content */}
                  <div className="flex-1 p-5 flex gap-5">
                    {/* Sidebar */}
                    <div className="w-1/4 border-r border-white/5 pr-4 space-y-4">
                      <div className="h-4 w-full bg-white/20 rounded-md" />
                      <div className="h-3 w-3/4 bg-white/10 rounded-md" />
                      <div className="h-3 w-5/6 bg-white/10 rounded-md" />
                      <div className="h-3 w-2/3 bg-white/10 rounded-md" />
                    </div>
                    {/* Main Area */}
                    <div className="flex-1 flex flex-col gap-4">
                      {/* Graph */}
                      <div className="h-32 rounded-xl bg-gradient-to-t from-primary/20 to-transparent border border-primary/20 relative overflow-hidden flex items-end">
                        <svg className="w-full h-full text-primary opacity-60 drop-shadow-[0_0_8px_rgba(234,88,12,0.8)]" viewBox="0 0 100 100" preserveAspectRatio="none">
                          <path d="M0,100 L0,60 C20,80 40,30 60,50 C80,70 90,20 100,30 L100,100 Z" fill="currentColor" />
                        </svg>
                      </div>
                      {/* Cards */}
                      <div className="flex gap-4">
                         <div className="flex-1 h-12 bg-white/5 rounded-lg border border-white/5" />
                         <div className="flex-1 h-12 bg-white/5 rounded-lg border border-white/5" />
                      </div>
                    </div>
                  </div>
                  {/* Glow overlay effect */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/10 animate-pulse z-10">
                <Dumbbell className="w-24 h-24" />
              </div>
            )}
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/20">
          <div className="w-px h-12 bg-gradient-to-b from-transparent to-white/20" />
          <ChevronDown className="w-4 h-4 animate-bounce" />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          FEATURES — BENTO GRID
      ══════════════════════════════════════════════════ */}
      <section id="features" className="relative py-28 px-5 sm:px-8 z-10">
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-xs font-black text-primary uppercase tracking-[0.2em] mb-4">Funcionalidades</p>
            <h2 className="text-4xl sm:text-5xl font-black text-white leading-tight">
              Todo lo que necesitás,<br />
              <span className="text-white/40">en un solo lugar</span>
            </h2>
          </div>

          {/* Grid Bento */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

            {/* Card 1 — Reservas (grande, span 2) */}
            <div className="lg:col-span-2 group relative bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.06] hover:border-white/[0.12] rounded-3xl p-8 overflow-hidden transition-all duration-500 cursor-default shadow-xl shadow-black/30">
              <div className="absolute -top-20 -right-20 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/15 transition duration-500" />
              <div className="relative z-10">
                <div className="w-11 h-11 rounded-2xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center mb-5">
                  <Calendar className="w-5 h-5 text-indigo-400" />
                </div>
                <h3 className="text-xl font-black text-white mb-2">Agenda y Reservas en Tiempo Real</h3>
                <p className="text-white/45 text-sm leading-relaxed max-w-md">
                  Clases con límite de capacidad, tiempos de cancelación configurables, turnos fijos y lista de espera automática por WhatsApp. Tu agenda siempre bajo control.
                </p>
                {/* Mock UI */}
                <div className="mt-6 bg-black/40 border border-white/5 rounded-2xl p-4 text-xs space-y-2">
                  <div className="flex justify-between text-white/25 uppercase font-bold tracking-wider border-b border-white/5 pb-2">
                    <span>CrossFit — 19:00hs</span>
                    <span className="text-emerald-400">18/20 cupos</span>
                  </div>
                  {["Martín G.", "Valentina R.", "Lucas P."].map((name) => (
                    <div key={name} className="flex items-center gap-3 py-0.5">
                      <div className="w-7 h-7 rounded-full bg-slate-700 shrink-0" />
                      <div className="flex-1">
                        <div className="h-2.5 bg-slate-600 rounded w-24" />
                      </div>
                      <div className="bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-md font-bold">✓</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Card 2 — Cobros */}
            <div className="group relative bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.06] hover:border-white/[0.12] rounded-3xl p-8 overflow-hidden transition-all duration-500 cursor-default shadow-xl shadow-black/30">
              <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl" />
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                  <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center mb-5">
                    <CreditCard className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-black text-white mb-2">Cobros y Finanzas</h3>
                  <p className="text-white/45 text-sm leading-relaxed">
                    Planes modulares, vencimientos automáticos y métricas financieras en tiempo real. Nunca más perseguir deudores.
                  </p>
                </div>
                <div className="mt-6 bg-black/40 border border-white/5 rounded-2xl p-4 flex items-center justify-between group-hover:-translate-y-1 transition-transform duration-500">
                  <div>
                    <div className="text-[10px] text-white/30 uppercase font-bold tracking-wider">MRR Proyectado</div>
                    <div className="text-xl font-black text-white mt-0.5">$1.240.000</div>
                  </div>
                  <Zap className="w-6 h-6 text-emerald-400 animate-pulse" />
                </div>
              </div>
            </div>

            {/* Card 3 — Planificación */}
            <div className="group relative bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.06] hover:border-white/[0.12] rounded-3xl p-8 overflow-hidden transition-all duration-500 cursor-default shadow-xl shadow-black/30">
              <div className="absolute -top-16 -left-16 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
              <div className="relative z-10">
                <div className="w-11 h-11 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center mb-5">
                  <Trophy className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-xl font-black text-white mb-2">Planificación de Ciclos</h3>
                <p className="text-white/45 text-sm leading-relaxed">
                  Diseñá ciclos de fuerza, CrossFit o prep física con % de 1RM, complexes y asignación masiva. Tus atletas lo ven directamente en su app.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {["Fuerza", "CrossFit", "Prep Física", "WODs", "Complexes"].map(tag => (
                    <span key={tag} className="text-[11px] px-2.5 py-1 rounded-full bg-white/5 border border-white/8 text-white/50 font-semibold">{tag}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Card 4 — App Atletas */}
            <div className="group relative bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.06] hover:border-white/[0.12] rounded-3xl p-8 overflow-hidden transition-all duration-500 cursor-default shadow-xl shadow-black/30">
              <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl" />
              <div className="relative z-10">
                <div className="w-11 h-11 rounded-2xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center mb-5">
                  <Sparkles className="w-5 h-5 text-violet-400" />
                </div>
                <h3 className="text-xl font-black text-white mb-2">App Móvil para Atletas</h3>
                <p className="text-white/45 text-sm leading-relaxed">
                  Tus alumnos instalan la WebApp en 2 clics. Ven sus rutinas, registran pesos, y ven su progreso histórico en gráficos hermosos.
                </p>
                <div className="mt-5 flex gap-3">
                  <div className="flex-1 bg-black/40 border border-white/5 rounded-xl p-3 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center text-[9px] font-black text-primary">RM</div>
                    <div>
                      <div className="text-[11px] font-bold text-white">Back Squat</div>
                      <div className="text-[10px] text-white/35">145 kg (+5kg) 🔥</div>
                    </div>
                  </div>
                  <div className="flex-1 bg-black/40 border border-white/5 rounded-xl p-3 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center text-sm">🏆</div>
                    <div>
                      <div className="text-[11px] font-bold text-white">Fran WOD</div>
                      <div className="text-[10px] text-white/35">3:45 min ⚡</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 5 — Soporte */}
            <div className="group relative bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.06] hover:border-white/[0.12] rounded-3xl p-8 overflow-hidden transition-all duration-500 shadow-xl shadow-black/30">
              <div className="absolute inset-0 bg-gradient-to-br from-[#25d366]/5 to-transparent rounded-3xl" />
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                  <div className="w-11 h-11 rounded-2xl bg-[#25d366]/15 border border-[#25d366]/20 flex items-center justify-center mb-5">
                    <MessageCircle className="w-5 h-5 text-[#25d366]" />
                  </div>
                  <h3 className="text-xl font-black text-white mb-2">Soporte Real por WhatsApp</h3>
                  <p className="text-white/45 text-sm leading-relaxed">
                    Sin bots. Un canal directo con el equipo de ingeniería para configurar tu Box en menos de 24 horas.
                  </p>
                </div>
                <a
                  href="https://wa.me/541165234769"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-6 w-full flex items-center justify-center gap-2 py-3 bg-[#25d366]/10 hover:bg-[#25d366]/20 border border-[#25d366]/20 hover:border-[#25d366]/40 text-[#25d366] font-black rounded-2xl transition-all duration-300 text-sm"
                >
                  <MessageCircle className="w-4 h-4" />
                  Consultar ahora
                </a>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          DISCIPLINAS
      ══════════════════════════════════════════════════ */}
      <section id="disciplines" className="relative py-28 px-5 sm:px-8 z-10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-black text-orange-400 uppercase tracking-[0.2em] mb-4">Adaptado a tu disciplina</p>
            <h2 className="text-4xl sm:text-5xl font-black text-white">
              Hecho para múltiples<br />
              <span className="text-white/40">tipos de centros</span>
            </h2>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap justify-center gap-2.5 mb-10">
            {DISCIPLINES.map((d, i) => (
              <button
                key={d.key}
                onClick={() => setActiveTab(i)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-sm transition-all duration-300 ${
                  activeTab === i
                    ? "bg-white text-black shadow-xl scale-[1.04]"
                    : "bg-white/5 hover:bg-white/10 text-white/50 hover:text-white border border-white/5"
                }`}
              >
                <span>{d.emoji}</span>
                {d.label}
              </button>
            ))}
          </div>

          {/* Contenido de tab */}
          <div className="relative bg-white/[0.02] border border-white/[0.06] rounded-3xl p-8 md:p-12 overflow-hidden">
            <div className={`absolute inset-0 rounded-3xl ${disc.glow} blur-3xl opacity-60`} />
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r ${disc.color} bg-opacity-10 mb-5`}>
                  <span className="text-lg">{disc.emoji}</span>
                  <span className="text-xs font-black text-white uppercase tracking-widest">{disc.label}</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-white mb-4">{disc.title}</h3>
                <p className="text-white/50 leading-relaxed mb-7 text-base">{disc.desc}</p>
                <ul className="space-y-2.5">
                  {disc.features.map(f => (
                    <li key={f} className="flex items-center gap-3 text-sm text-white/70 font-semibold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex justify-center">
                <div className={`w-36 h-36 rounded-[40px] bg-gradient-to-br ${disc.color} flex items-center justify-center shadow-2xl`}>
                  <span className="text-6xl">{disc.emoji}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          PRICING
      ══════════════════════════════════════════════════ */}
      <section id="pricing" className="relative py-28 px-5 sm:px-8 z-10">
        <div className="absolute inset-0 bg-white/[0.01] pointer-events-none" />
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-black text-primary uppercase tracking-[0.2em] mb-4">Planes</p>
            <h2 className="text-4xl sm:text-5xl font-black text-white">
              Precios simples y transparentes
            </h2>
            <p className="text-white/40 mt-4 max-w-lg mx-auto text-base">
              Las mismas funcionalidades en todos los planes. El precio escala con la cantidad de alumnos de tu centro.
            </p>
          </div>

          {/* Cards de Pricing */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

            {/* Plan 50 */}
            <div className="relative bg-white/[0.03] border border-white/[0.07] rounded-3xl p-6 flex flex-col transition-all duration-300 hover:border-white/[0.15] hover:bg-white/[0.05] shadow-xl shadow-black/30">
              <div className="mb-6">
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-3">Plan 50</p>
                <div className="flex items-end gap-1.5 mb-2">
                  <span className="text-3xl font-black text-white">$45k</span>
                  <span className="text-white/40 text-sm font-semibold mb-1">/ mes</span>
                </div>
                <p className="text-xs text-white/40 font-semibold">Hasta 50 alumnos</p>
              </div>

              <Link
                href="/auth/signup"
                className="w-full py-3 rounded-2xl bg-white/8 hover:bg-white/15 border border-white/10 hover:border-white/20 text-white font-black text-sm transition-all duration-300 text-center mb-6"
              >
                Empezar gratis
              </Link>

              <ul className="space-y-3 flex-1">
                {PLAN_FEATURES.slice(0, 6).map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-xs text-white/55 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Plan 100 */}
            <div className="relative bg-white/[0.03] border border-white/[0.07] rounded-3xl p-6 flex flex-col transition-all duration-300 hover:border-white/[0.15] hover:bg-white/[0.05] shadow-xl shadow-black/30">
              <div className="mb-6">
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-3">Plan 100</p>
                <div className="flex items-end gap-1.5 mb-2">
                  <span className="text-3xl font-black text-white">$75k</span>
                  <span className="text-white/40 text-sm font-semibold mb-1">/ mes</span>
                </div>
                <p className="text-xs text-white/40 font-semibold">Hasta 100 alumnos</p>
              </div>

              <Link
                href="/auth/signup"
                className="w-full py-3 rounded-2xl bg-white/8 hover:bg-white/15 border border-white/10 hover:border-white/20 text-white font-black text-sm transition-all duration-300 text-center mb-6"
              >
                Empezar gratis
              </Link>

              <ul className="space-y-3 flex-1">
                {PLAN_FEATURES.slice(0, 8).map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-xs text-white/55 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Plan 150 — DESTACADO */}
            <div className="relative bg-gradient-to-b from-primary/[0.08] to-orange-500/[0.04] border-2 border-primary/40 rounded-3xl p-6 flex flex-col shadow-2xl shadow-primary/15 scale-[1.05] z-10">
              {/* Badge popular */}
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <div className="bg-gradient-to-r from-primary to-orange-500 text-white text-[10px] font-black px-4 py-1.5 rounded-full shadow-lg shadow-primary/30 uppercase tracking-wide">
                  Más popular
                </div>
              </div>

              <div className="mb-6 mt-1">
                <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-3">Plan 150</p>
                <div className="flex items-end gap-1.5 mb-2">
                  <span className="text-3xl font-black text-white">$95k</span>
                  <span className="text-white/40 text-sm font-semibold mb-1">/ mes</span>
                </div>
                <p className="text-xs text-white/40 font-semibold">Hasta 150 alumnos</p>
              </div>

              <Link
                href="/auth/signup"
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-400 text-white font-black text-sm transition-all duration-300 text-center shadow-lg shadow-primary/25 hover:shadow-primary/40 mb-6"
              >
                Empezar ahora
              </Link>

              <ul className="space-y-3 flex-1">
                {PLAN_FEATURES.map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-xs text-white/70 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Plan Premium */}
            <div className="relative bg-[#0f0f13] border border-white/[0.1] rounded-3xl p-6 flex flex-col transition-all duration-300 shadow-xl shadow-black/50 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent pointer-events-none" />
              <div className="mb-6 relative z-10">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" />
                  Premium
                </p>
                <div className="flex items-end gap-1.5 mb-2">
                  <span className="text-2xl font-black text-white leading-none">Personalizado</span>
                </div>
                <p className="text-xs text-white/40 font-semibold mt-2">+200 alumnos / Múltiples sedes</p>
              </div>

              <a
                href="https://wa.me/541165234769/?text=Hola!%20Quiero%20información%20sobre%20el%20plan%20Premium%20Enterprise"
                target="_blank"
                rel="noopener noreferrer"
                className="relative w-full py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-indigo-500/30 text-indigo-300 hover:text-indigo-200 font-black text-sm transition-all duration-300 text-center mb-6 flex items-center justify-center gap-2 z-10"
              >
                Hablar con ventas
              </a>

              <ul className="space-y-3 flex-1 relative z-10">
                <li className="flex items-start gap-2.5 text-xs text-white/55 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                  Alumnos ilimitados
                </li>
                <li className="flex items-start gap-2.5 text-xs text-white/55 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                  Staff y roles avanzados
                </li>
                <li className="flex items-start gap-2.5 text-xs text-white/55 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                  Analíticas avanzadas
                </li>
                <li className="flex items-start gap-2.5 text-xs text-indigo-300 font-black mt-2 pt-3 border-t border-white/10">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  Soporte VIP 24/7
                </li>
              </ul>
            </div>

          </div>

          <p className="text-center text-white/20 text-xs font-bold uppercase tracking-widest mt-10">
            Todos los precios en pesos argentinos (ARS). Incluye período de prueba gratuito.
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          FAQ
      ══════════════════════════════════════════════════ */}
      <section id="faq" className="relative py-28 px-5 sm:px-8 z-10">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-black text-white/30 uppercase tracking-[0.2em] mb-4">FAQ</p>
            <h2 className="text-4xl sm:text-5xl font-black text-white">Preguntas frecuentes</h2>
          </div>

          <div className="space-y-3">
            {FAQS.map((item, i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={i}
                  className={`bg-white/[0.03] border rounded-2xl overflow-hidden transition-all duration-300 ${isOpen ? "border-white/[0.12] bg-white/[0.05]" : "border-white/[0.06] hover:border-white/[0.1]"}`}
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="w-full px-6 py-5 flex justify-between items-center gap-4 text-left font-black text-white text-sm sm:text-base"
                  >
                    <span>{item.q}</span>
                    <ChevronDown className={`w-5 h-5 text-white/30 shrink-0 transition-transform duration-300 ${isOpen ? "rotate-180 text-primary" : ""}`} />
                  </button>
                  <div className={`px-6 text-sm text-white/50 leading-relaxed overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? "max-h-48 pb-6 border-t border-white/5 pt-4" : "max-h-0"}`}>
                    {item.a}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          CTA FINAL
      ══════════════════════════════════════════════════ */}
      <section className="relative py-28 px-5 sm:px-8 z-10">
        <div className="max-w-4xl mx-auto text-center relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-orange-500/5 to-primary/10 rounded-[40px] blur-3xl" />
          <div className="relative bg-white/[0.02] border border-white/[0.07] rounded-[32px] p-12 sm:p-16 overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

            <div className="w-14 h-14 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center mx-auto mb-6">
              <Dumbbell className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-4">
              ¿Listo para transformar<br />tu centro?
            </h2>
            <p className="text-white/45 text-base sm:text-lg mb-10 max-w-lg mx-auto">
              Empezá gratis. Sin tarjeta. Sin compromiso. Tu centro merece lo mejor.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/auth/signup"
                className="bg-gradient-to-r from-primary to-orange-500 text-white font-black px-10 py-4 rounded-2xl shadow-xl shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-0.5 transition-all duration-300 text-base flex items-center justify-center gap-2 group"
              >
                Crear cuenta gratis
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a
                href="https://wa.me/541165234769"
                target="_blank"
                rel="noreferrer"
                className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-black px-10 py-4 rounded-2xl transition-all duration-300 text-base flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-5 h-5 text-[#25d366]" />
                Hablar con soporte
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════ */}
      <footer className="relative border-t border-white/5 py-14 px-5 sm:px-8 z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2.5">
            <div className="bg-primary/15 p-2.5 rounded-[14px]">
              <Dumbbell className="w-5 h-5 text-primary" />
            </div>
            <span className="text-lg font-black tracking-tight text-white">EntrenAPP</span>
          </div>
          <div className="flex flex-wrap justify-center gap-8 text-sm text-white/30 font-semibold">
            <a href="#features" className="hover:text-white transition-colors">Funcionalidades</a>
            <a href="#disciplines" className="hover:text-white transition-colors">Disciplinas</a>
            <a href="#pricing" className="hover:text-white transition-colors">Planes</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
            <a href="https://wa.me/541165234769" className="hover:text-white transition-colors">Contacto</a>
          </div>
          <p className="text-xs text-white/15 font-bold uppercase tracking-widest">
            © 2026 EntrenAPP · Todos los derechos reservados
          </p>
        </div>
      </footer>

      {/* ── Animaciones flotantes CSS ── */}
      <style jsx global>{`
        @keyframes float1 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes float2 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-16px); }
        }
        @keyframes float3 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
}
