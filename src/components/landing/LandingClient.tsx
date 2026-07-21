"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useInView } from "framer-motion";
import ScrollReveal from "@/components/ui/ScrollReveal";
import { CinematicHero } from "@/components/ui/cinematic-landing-hero";
import { LandingAccordionItem } from "@/components/ui/interactive-image-accordion";
import { Menu, MenuItem } from "@/components/ui/navbar-menu";
import { BlurIn } from "@/components/ui/blur-in";
import { FlipText } from "@/components/ui/flip-text";
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
  const [activeNavbarItem, setActiveNavbarItem] = useState<string | null>("crossfit");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const disciplinesRef = useRef(null);
  const isDisciplinesInView = useInView(disciplinesRef, { once: true, margin: "-10% 0px -10% 0px" });

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
                href="/auth/login"
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
      <CinematicHero />

      {/* ══════════════════════════════════════════════════
          FEATURES — INTERACTIVE ACCORDION
      ══════════════════════════════════════════════════ */}
      <LandingAccordionItem />

      {/* ══════════════════════════════════════════════════
          DISCIPLINAS (Hecho para múltiples tipos de centros)
      ══════════════════════════════════════════════════ */}
      <section id="disciplines" className="relative py-28 px-5 sm:px-8 z-30 min-h-[580px] scroll-mt-20">
        <div className="max-w-5xl mx-auto relative">
          <div className="text-center mb-14">
            <p className="text-xs font-black text-orange-400 uppercase tracking-[0.2em] mb-4">Adaptado a tu disciplina</p>
            <h2 ref={disciplinesRef} className="text-4xl sm:text-5xl font-black text-white flex flex-col items-center gap-1">
              <BlurIn
                word="Hecho para múltiples"
                animate={isDisciplinesInView}
                duration={0.6}
                className="text-4xl sm:text-5xl font-black text-white tracking-tighter"
              />
              <BlurIn
                word="tipos de centros"
                animate={isDisciplinesInView}
                duration={0.6}
                variant={{
                  hidden: { filter: "blur(10px)", opacity: 0 },
                  visible: { filter: "blur(0px)", opacity: 0.4 },
                }}
                className="text-4xl sm:text-5xl font-black text-white tracking-tighter"
              />
            </h2>
          </div>

          {/* Dynamic Dropdown Navbar Menu */}
          <div className="flex flex-col items-center w-full relative">
            <div className="flex justify-center w-full relative z-40">
              <Menu 
                setActive={setActiveNavbarItem} 
                closeOnMouseLeave={false} 
                className="border border-white/5 bg-black/40 backdrop-blur-md px-6 py-4 rounded-full"
              >
                {DISCIPLINES.map((d) => (
                  <MenuItem
                    key={d.key}
                    setActive={setActiveNavbarItem}
                    active={activeNavbarItem}
                    item={d.key}
                    label={d.label}
                    emoji={d.emoji}
                  />
                ))}
              </Menu>
            </div>

            {/* Dropdown Content Rendered Below to Avoid Clipping/Overflow Constraints */}
            <div className="w-full relative z-30 min-h-[380px] sm:min-h-[320px]">
              <AnimatePresence mode="wait">
                {activeNavbarItem && (() => {
                  const d = DISCIPLINES.find(item => item.key === activeNavbarItem);
                  if (!d) return null;
                  return (
                    <motion.div
                      key={d.key}
                      initial={{ opacity: 0, y: 15, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -15, scale: 0.98 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="mt-8 w-full max-w-4xl mx-auto"
                    >
                      <div className="relative bg-white/[0.02] border border-white/[0.06] rounded-[28px] p-6 sm:p-8 md:p-10 overflow-hidden shadow-2xl backdrop-blur-md text-left">
                        {/* Glow effect matching active discipline color */}
                        <div className={`absolute -inset-1 blur-3xl opacity-20 bg-gradient-to-br ${d.color} transition-all duration-500`} />
                        
                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                          <div className="flex-1">
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r ${d.color} bg-opacity-10 border border-white/5 mb-4`}>
                              <span className="text-sm">{d.emoji}</span>
                              <span className="text-[10px] font-black text-white uppercase tracking-widest">{d.label}</span>
                            </div>
                            
                            <h3 className="text-2xl sm:text-3xl font-black text-white mb-3 tracking-tight">
                              {d.title}
                            </h3>
                            
                            <p className="text-white/60 leading-relaxed text-sm sm:text-base max-w-2xl mb-6">
                              {d.desc}
                            </p>
                            
                            <div className="border-t border-white/5 pt-4">
                              <p className="text-[10px] uppercase tracking-[0.2em] font-black text-white/30 mb-3">Funcionalidades Clave</p>
                              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {d.features.map(f => (
                                  <li key={f} className="flex items-center gap-2.5 text-xs sm:text-sm text-white/80 font-bold">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                    <span>{f}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                          
                          <div className="hidden md:flex justify-center items-center shrink-0">
                            <motion.div
                              initial={{ scale: 0.9, rotate: -2 }}
                              animate={{ scale: 1, rotate: 0 }}
                              transition={{ type: "spring", stiffness: 100 }}
                              className={`w-32 h-32 md:w-40 md:h-40 rounded-[32px] bg-gradient-to-br ${d.color} flex items-center justify-center shadow-xl relative group`}
                            >
                              <span className="text-6xl select-none filter drop-shadow-md">{d.emoji}</span>
                            </motion.div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })()}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          PRICING
      ══════════════════════════════════════════════════ */}
      <section id="pricing" className="relative py-28 px-5 sm:px-8 z-10 overflow-hidden scroll-mt-20">
        <div className="absolute inset-0 bg-white/[0.01] pointer-events-none" />
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-black text-primary uppercase tracking-[0.2em] mb-4">Planes</p>
            <h2 className="text-4xl sm:text-5xl font-black text-white flex justify-center">
              <FlipText
                word="Precios simples y transparentes"
                className="text-white text-4xl sm:text-5xl font-black tracking-tight"
                duration={0.4}
                delayMultiple={0.03}
              />
            </h2>
            <p className="text-white/40 mt-4 max-w-lg mx-auto text-base">
              Las mismas funcionalidades en todos los planes. El precio escala con la cantidad de alumnos de tu centro.
            </p>
          </div>

          {/* Cards de Pricing adaptadas de 21st.dev */}
          <div className="flex flex-col lg:flex-row items-stretch justify-center gap-8 lg:gap-5 pt-12 pb-8">

            {/* Plan 50 */}
            <ScrollReveal direction="up" delay={100} duration={600} className="w-full max-w-sm lg:w-72 flex flex-col">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ type: "spring", duration: 0.5 }}
                className="w-full flex flex-col h-full"
              >
                <motion.div
                  layout
                  animate={{ y: [0, -8, 0] }}
                  transition={{
                    y: {
                      repeat: Infinity,
                      duration: 5,
                      ease: "easeInOut",
                    }
                  }}
                  whileHover={{ scale: 1.05, rotate: 0, zIndex: 30 }}
                  style={{ rotate: -2 }}
                  className="relative z-10 w-full rounded-3xl border border-white/10 bg-black/40 px-6 py-8 text-foreground shadow-[0_0_0_1px_rgba(255,255,255,.03)_inset] backdrop-blur-md flex flex-col h-full cursor-default"
                >
                  <div className="mb-6">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-3">Plan 50</p>
                    <div className="flex items-end gap-1.5 mb-2">
                      <span className="text-4xl font-black text-white">$45k</span>
                      <span className="text-white/40 text-sm font-semibold mb-1">/ mes</span>
                    </div>
                    <p className="text-xs text-white/40 font-semibold">Hasta 50 alumnos</p>
                  </div>

                  <Link
                    href="/auth/signup"
                    className="w-full py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/20 text-white font-black text-sm transition-all duration-300 text-center mb-6"
                  >
                    Empezar gratis
                  </Link>

                  <ul className="space-y-3 flex-1 text-left text-xs text-white/70">
                    {PLAN_FEATURES.slice(0, 3).map(f => (
                      <li key={f} className="flex items-center gap-2 font-semibold">
                        <span className="text-emerald-400 font-bold shrink-0">✔</span>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <AnimatePresence initial={false}>
                    {expandedPlan === "plan50" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <ul className="space-y-3 pt-3 mt-3 border-t border-white/5 text-left text-xs text-white/70">
                          {PLAN_FEATURES.slice(3, 6).map(f => (
                            <li key={f} className="flex items-center gap-2 font-semibold">
                              <span className="text-emerald-400 font-bold shrink-0">✔</span>
                              {f}
                            </li>
                          ))}
                        </ul>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setExpandedPlan(expandedPlan === "plan50" ? null : "plan50");
                    }}
                    className="mt-5 w-full py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] text-white/50 hover:text-white flex items-center justify-center gap-1.5 text-[11px] font-bold tracking-wider uppercase transition-all duration-200"
                  >
                    <span>{expandedPlan === "plan50" ? "Ocultar Detalles" : "Ver Detalles"}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${expandedPlan === "plan50" ? "rotate-180" : ""}`} />
                  </button>
                </motion.div>
              </motion.div>
            </ScrollReveal>

            {/* Plan 100 */}
            <ScrollReveal direction="up" delay={200} duration={600} className="w-full max-w-sm lg:w-72 flex flex-col">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ type: "spring", duration: 0.5 }}
                className="w-full flex flex-col h-full"
              >
                <motion.div
                  layout
                  animate={{ y: [0, -6, 0] }}
                  transition={{
                    y: {
                      repeat: Infinity,
                      duration: 4.5,
                      ease: "easeInOut",
                      delay: 0.4
                    }
                  }}
                  whileHover={{ scale: 1.05, rotate: 0, zIndex: 30 }}
                  style={{ rotate: -1 }}
                  className="relative z-10 w-full rounded-3xl border border-white/10 bg-black/40 px-6 py-8 text-foreground shadow-[0_0_0_1px_rgba(255,255,255,.03)_inset] backdrop-blur-md flex flex-col h-full cursor-default"
                >
                  <div className="mb-6">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-3">Plan 100</p>
                    <div className="flex items-end gap-1.5 mb-2">
                      <span className="text-4xl font-black text-white">$75k</span>
                      <span className="text-white/40 text-sm font-semibold mb-1">/ mes</span>
                    </div>
                    <p className="text-xs text-white/40 font-semibold">Hasta 100 alumnos</p>
                  </div>

                  <Link
                    href="/auth/signup"
                    className="w-full py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/20 text-white font-black text-sm transition-all duration-300 text-center mb-6"
                  >
                    Empezar gratis
                  </Link>

                  <ul className="space-y-3 flex-1 text-left text-xs text-white/70">
                    {PLAN_FEATURES.slice(0, 3).map(f => (
                      <li key={f} className="flex items-center gap-2 font-semibold">
                        <span className="text-emerald-400 font-bold shrink-0">✔</span>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <AnimatePresence initial={false}>
                    {expandedPlan === "plan100" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <ul className="space-y-3 pt-3 mt-3 border-t border-white/5 text-left text-xs text-white/70">
                          {PLAN_FEATURES.slice(3, 8).map(f => (
                            <li key={f} className="flex items-center gap-2 font-semibold">
                              <span className="text-emerald-400 font-bold shrink-0">✔</span>
                              {f}
                            </li>
                          ))}
                        </ul>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setExpandedPlan(expandedPlan === "plan100" ? null : "plan100");
                    }}
                    className="mt-5 w-full py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] text-white/50 hover:text-white flex items-center justify-center gap-1.5 text-[11px] font-bold tracking-wider uppercase transition-all duration-200"
                  >
                    <span>{expandedPlan === "plan100" ? "Ocultar Detalles" : "Ver Detalles"}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${expandedPlan === "plan100" ? "rotate-180" : ""}`} />
                  </button>
                </motion.div>
              </motion.div>
            </ScrollReveal>

            {/* Plan 150 — DESTACADO (Best Deal / Floating) */}
            <ScrollReveal direction="up" delay={300} duration={650} className="w-full max-w-sm lg:w-80 flex flex-col z-10">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ type: "spring", duration: 0.7 }}
                className="w-full flex flex-col h-full"
              >
                <motion.div
                  layout
                  animate={{ y: [0, -10, 0] }}
                  transition={{
                    y: {
                      repeat: Infinity,
                      duration: 4.8,
                      ease: "easeInOut",
                      delay: 0.2
                    }
                  }}
                  whileHover={{ scale: 1.08, rotate: 0, zIndex: 30 }}
                  style={{ rotate: 0 }}
                  className="relative z-20 w-full rounded-3xl border-4 border-primary/50 bg-gradient-to-b from-primary to-orange-600 px-7 py-10 text-neutral-950 shadow-2xl shadow-primary/20 flex flex-col h-full cursor-default"
                >
                  {/* Floating "Más Popular" Badge */}
                  <motion.div
                    animate={{ y: [8, 4, 8] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    className="absolute -top-5.5 left-1/2 -translate-x-1/2 rounded-full border border-black/20 bg-primary px-5 py-1 text-[10px] font-black uppercase text-neutral-950 shadow-lg tracking-wider pointer-events-none"
                  >
                    Más popular
                  </motion.div>

                  <div className="mb-6 mt-1">
                    <p className="text-[10px] font-black text-neutral-950/60 uppercase tracking-widest mb-3">Plan 150</p>
                    <div className="flex items-end gap-1.5 mb-2">
                      <span className="text-5xl font-black">$95k</span>
                      <span className="text-neutral-950/60 text-sm font-semibold mb-1">/ mes</span>
                    </div>
                    <p className="text-xs text-neutral-950/60 font-semibold">Hasta 150 alumnos</p>
                  </div>

                  <Link
                    href="/auth/signup"
                    className="w-full py-3 rounded-2xl bg-neutral-950 hover:bg-neutral-900 text-white font-black text-sm transition-all duration-300 text-center mb-6 shadow-md shadow-black/20"
                  >
                    Empezar ahora
                  </Link>

                  <ul className="space-y-3 flex-1 text-left text-xs text-neutral-950/90 font-bold">
                    {PLAN_FEATURES.slice(0, 3).map(f => (
                      <li key={f} className="flex items-center gap-2">
                        <span className="text-emerald-800 font-black shrink-0">✔</span>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <AnimatePresence initial={false}>
                    {expandedPlan === "plan150" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <ul className="space-y-3 pt-3 mt-3 border-t border-black/10 text-left text-xs text-neutral-950/90 font-bold">
                          {PLAN_FEATURES.slice(3).map(f => (
                            <li key={f} className="flex items-center gap-2">
                              <span className="text-emerald-800 font-black shrink-0">✔</span>
                              {f}
                            </li>
                          ))}
                        </ul>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setExpandedPlan(expandedPlan === "plan150" ? null : "plan150");
                    }}
                    className="mt-5 w-full py-2 rounded-xl bg-black/10 hover:bg-black/15 border border-black/5 text-neutral-900/60 hover:text-neutral-900 flex items-center justify-center gap-1.5 text-[11px] font-bold tracking-wider uppercase transition-all duration-200"
                  >
                    <span>{expandedPlan === "plan150" ? "Ocultar Detalles" : "Ver Detalles"}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${expandedPlan === "plan150" ? "rotate-180" : ""}`} />
                  </button>
                </motion.div>
              </motion.div>
            </ScrollReveal>

            {/* Plan Premium */}
            <ScrollReveal direction="up" delay={400} duration={600} className="w-full max-w-sm lg:w-72 flex flex-col">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ type: "spring", duration: 0.6 }}
                className="w-full flex flex-col h-full"
              >
                <motion.div
                  layout
                  animate={{ y: [0, -7, 0] }}
                  transition={{
                    y: {
                      repeat: Infinity,
                      duration: 5.2,
                      ease: "easeInOut",
                      delay: 0.6
                    }
                  }}
                  whileHover={{ scale: 1.05, rotate: 0, zIndex: 30 }}
                  style={{ rotate: 2 }}
                  className="relative z-10 w-full rounded-3xl border border-indigo-500/30 bg-[#0c0c12]/60 px-6 py-8 text-foreground shadow-[0_0_0_1px_rgba(99,102,241,.1)_inset] backdrop-blur-md flex flex-col h-full overflow-hidden cursor-default"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent pointer-events-none" />
                  <div className="mb-6 relative z-10">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3" />
                      Premium
                    </p>
                    <div className="flex items-end gap-1.5 mb-2">
                      <span className="text-3xl font-black text-white leading-none">Personalizado</span>
                    </div>
                    <p className="text-xs text-white/40 font-semibold mt-2">+200 alumnos / Múltiples sedes</p>
                  </div>

                  <a
                    href="https://wa.me/541165234769/?text=Hola!%20Quiero%20información%20sobre%20el%20plan%20Premium%20Enterprise"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm transition-all duration-300 text-center mb-6 flex items-center justify-center gap-2 z-10 shadow-lg shadow-indigo-600/20"
                  >
                    Hablar con ventas
                  </a>

                  <ul className="space-y-3 flex-1 relative z-10 text-left text-xs text-white/70">
                    <li className="flex items-center gap-2 font-semibold">
                      <span className="text-indigo-400 font-bold shrink-0">✔</span>
                      Alumnos ilimitados
                    </li>
                    <li className="flex items-center gap-2 font-semibold">
                      <span className="text-indigo-400 font-bold shrink-0">✔</span>
                      Staff y roles avanzados
                    </li>
                    <li className="flex items-center gap-2 font-semibold">
                      <span className="text-indigo-400 font-bold shrink-0">✔</span>
                      Analíticas avanzadas
                    </li>
                  </ul>

                  <AnimatePresence initial={false}>
                    {expandedPlan === "premium" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden relative z-10"
                      >
                        <ul className="space-y-3 pt-3 mt-3 border-t border-white/10 text-left text-xs text-white/70">
                          <li className="flex items-center gap-2 text-indigo-300 font-black pt-1">
                            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                            Soporte VIP 24/7
                          </li>
                          <li className="flex items-center gap-2 font-semibold">
                            <span className="text-indigo-400 font-bold shrink-0">✔</span>
                            Multi-sede y reportes unificados
                          </li>
                          <li className="flex items-center gap-2 font-semibold">
                            <span className="text-indigo-400 font-bold shrink-0">✔</span>
                            Integración de API personalizada
                          </li>
                        </ul>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setExpandedPlan(expandedPlan === "premium" ? null : "premium");
                    }}
                    className="relative mt-5 w-full py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] text-white/50 hover:text-white flex items-center justify-center gap-1.5 text-[11px] font-bold tracking-wider uppercase transition-all duration-200 z-10"
                  >
                    <span>{expandedPlan === "premium" ? "Ocultar Detalles" : "Ver Detalles"}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${expandedPlan === "premium" ? "rotate-180" : ""}`} />
                  </button>
                </motion.div>
              </motion.div>
            </ScrollReveal>

          </div>

          <p className="text-center text-white/20 text-xs font-bold uppercase tracking-widest mt-10">
            Todos los precios en pesos argentinos (ARS). Incluye período de prueba gratuito.
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          FAQ
      ══════════════════════════════════════════════════ */}
      <section id="faq" className="relative py-28 px-5 sm:px-8 z-10 scroll-mt-20">
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
