"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Dumbbell, ArrowRight, CheckCircle2, Star, Trophy, BarChart3, 
  Users, Calendar, Settings, ChevronDown, ShieldCheck, Sparkles, Zap, Clock, CreditCard
} from "lucide-react";

export default function LandingClient() {
  const [activeTab, setActiveTab] = useState("crossfit");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Datos de disciplinas
  const disciplines = {
    crossfit: {
      title: "Boxes de Crossfit",
      desc: "Control total de WODs por niveles, cálculo masivo de RMs, benchmarks y reservas por hora en tiempo real.",
      icon: Trophy,
      color: "from-orange-500 to-red-500",
    },
    funcional: {
      title: "Entrenamiento Funcional",
      desc: "Gestión fluida de circuitos, rotaciones, cronómetros y listas de espera automatizadas en horas pico.",
      icon: Zap,
      color: "from-blue-500 to-cyan-500",
    },
    pilates: {
      title: "Estudios de Pilates / Yoga",
      desc: "Control estricto de cupos limitados por reformer, reservas fijas semanales y gestión personalizada.",
      icon: Sparkles,
      color: "from-purple-500 to-pink-500",
    },
    musculacion: {
      title: "Gimnasios de Musculación",
      desc: "Rutinas digitales autogestionables, cobros automatizados por débito y monitoreo en tiempo real de ingresos.",
      icon: Dumbbell,
      color: "from-green-500 to-emerald-500",
    }
  };

  return (
    <div className="min-h-screen bg-[#050507] text-white selection:bg-primary/30 font-sans overflow-x-hidden">
      {/* 🌌 Fondo Cósmico Resplandeciente */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px] animate-pulse" />
        <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="absolute bottom-[10%] left-[20%] w-[60%] h-[30%] rounded-full bg-primary/5 blur-[150px]" />
      </div>

      {/* 🧭 Navbar de Élite */}
      <header className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#050507]/70 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="bg-gradient-to-br from-primary to-orange-600 p-2.5 rounded-2xl shadow-lg shadow-primary/20 group-hover:scale-105 transition duration-300">
              <Dumbbell className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-white bg-clip-text">
              EntrenAPP
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-white/60">
            <a href="#features" className="hover:text-white transition">Funcionalidades</a>
            <a href="#disciplines" className="hover:text-white transition">Disciplinas</a>
            <a href="#pricing" className="hover:text-white transition">Precios</a>
            <a href="#faq" className="hover:text-white transition">Preguntas</a>
          </nav>

          <div className="flex items-center gap-4">
            <Link 
              href="/auth/login" 
              className="text-sm font-semibold text-white/80 hover:text-white px-4 py-2 transition"
            >
              Ingresar
            </Link>
            <Link 
              href="/auth/signup" 
              className="bg-white text-black hover:bg-white/90 text-sm font-bold px-6 py-2.5 rounded-xl transition shadow-lg hover:shadow-white/10"
            >
              Empezar Gratis
            </Link>
          </div>
        </div>
      </header>

      {/* 🚀 HERO SECTION (3D Interactivo) */}
      <section className="relative pt-32 lg:pt-44 pb-20 lg:pb-32 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center relative z-10">
          
          {/* Izquierda: Copy Explosivo */}
          <div className="lg:col-span-6 flex flex-col justify-center text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 self-center lg:self-start mb-6 backdrop-blur-md">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold tracking-wide text-white/80 uppercase">La evolución de tu gimnasio</span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05] text-white">
              Gestiona tu Box <br />
              <span className="bg-gradient-to-r from-primary via-orange-500 to-yellow-500 bg-clip-text text-transparent drop-shadow-sm">
                en otra dimensión
              </span>
            </h1>

            <p className="mt-6 text-lg text-white/60 max-w-lg leading-relaxed mx-auto lg:mx-0">
              EntrenAPP centraliza la planificación deportiva inteligente, reservas fluidas, cobros y finanzas en un ecosistema premium que a tus atletas les encantará.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
              <Link 
                href="/auth/signup" 
                className="w-full sm:w-auto bg-gradient-to-r from-primary to-orange-600 text-white font-bold px-8 py-4 rounded-2xl flex items-center justify-center gap-2.5 shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-300 text-lg group"
              >
                Crear Cuenta Gratis
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <a 
                href="https://wa.me/541165234769/?text=Hola!%20Quiero%20una%20demo%20de%20EntrenAPP" 
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold px-8 py-4 rounded-2xl flex items-center justify-center gap-2 transition duration-300 text-lg"
              >
                Hablar con soporte
              </a>
            </div>

            {/* Mini Stats */}
            <div className="mt-12 grid grid-cols-3 gap-4 pt-8 border-t border-white/5 max-w-md mx-auto lg:mx-0">
              <div>
                <div className="text-2xl lg:text-3xl font-black text-white">+15k</div>
                <div className="text-xs text-white/40 uppercase tracking-wider mt-1 font-semibold">Reservas Hoy</div>
              </div>
              <div>
                <div className="text-2xl lg:text-3xl font-black text-white">99.9%</div>
                <div className="text-xs text-white/40 uppercase tracking-wider mt-1 font-semibold">Uptime</div>
              </div>
              <div>
                <div className="text-2xl lg:text-3xl font-black text-white">24/7</div>
                <div className="text-xs text-white/40 uppercase tracking-wider mt-1 font-semibold">Soporte WA</div>
              </div>
            </div>
          </div>

          {/* Derecha: Escena 3D Real Interactiva */}
          <div className="lg:col-span-6 h-[350px] sm:h-[450px] lg:h-[550px] relative w-full select-none flex items-center justify-center">
            {/* Anillo de luz decorativo trasero */}
            <div className="absolute w-[70%] h-[70%] rounded-full bg-primary/20 blur-[80px]" />
            
            {mounted ? (
              <div className="w-full h-full z-10 flex items-center justify-center scale-105 lg:scale-110">
                {/* Utilizando una escena de alta gama de Spline que contiene una mancuerna abstracta metálica interactiva */}
                <iframe 
                  src="https://prod.spline.design/JRe7t8hW02qFv1X6/scene.splinecode" 
                  width="100%" 
                  height="100%" 
                  style={{ border: 'none', pointerEvents: 'auto' }}
                  title="EntrenAPP Interactive 3D"
                  className="opacity-90 mix-blend-lighten"
                />
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/20 animate-pulse">
                <Dumbbell className="w-20 h-20" />
              </div>
            )}

            {/* Badges Flotantes CSS 3D */}
            <div 
              className="absolute top-8 right-8 bg-black/40 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex items-center gap-3 animate-bounce pointer-events-none z-20 shadow-2xl"
              style={{ animationDuration: "4000ms" }}
            >
              <div className="bg-green-500/20 p-2 rounded-xl">
                <BarChart3 className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <div className="text-xs text-white/40 font-medium">Cobros este mes</div>
                <div className="text-sm font-bold text-white">+$850,000</div>
              </div>
            </div>

            <div 
              className="absolute bottom-12 left-8 bg-black/40 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex items-center gap-3 animate-bounce pointer-events-none z-20 shadow-2xl"
              style={{ animationDuration: "5000ms" }}
            >
              <div className="bg-primary/20 p-2 rounded-xl">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-xs text-white/40 font-medium">Alumnos activos</div>
                <div className="text-sm font-bold text-white">320 Atletas</div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 📱 SECCIÓN GRID BENTO (Funcionalidades Clave) */}
      <section id="features" className="py-24 px-6 bg-[#08080c]/50 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-bold text-primary uppercase tracking-widest">Diseño de Última Generación</h2>
            <p className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mt-4 leading-tight">
              Todo lo que tu Box necesita para despegar
            </p>
          </div>

          {/* Cuadrícula Bento */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-12 gap-6 auto-rows-[240px]">
            
            {/* Tarjeta 1: Reservas Inteligentes (Grande 8 cols) */}
            <div className="lg:col-span-8 md:col-span-2 md:row-span-2 bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/[0.07] rounded-3xl p-8 flex flex-col justify-between relative overflow-hidden group transition duration-500 select-none shadow-2xl">
              <div className="absolute -right-20 -top-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition duration-500" />
              <div className="z-10 max-w-md">
                <div className="bg-white/5 p-3 rounded-2xl w-fit border border-white/10 mb-6">
                  <Calendar className="w-6 h-6 text-indigo-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Agenda & Reservas en Segundos</h3>
                <p className="text-white/50 text-sm leading-relaxed">
                  Múltiples opciones de configuración: límites de capacidad, tiempos para cancelar y reservar, turnos fijos y listas de espera automáticas por Whatsapp.
                </p>
              </div>
              {/* Abstract UI */}
              <div className="z-10 mt-6 bg-[#0d0d12]/80 border border-white/5 rounded-2xl p-4 scale-100 group-hover:scale-[1.02] transition-all duration-500 flex flex-col gap-2 text-xs shadow-xl shadow-black/50">
                <div className="flex justify-between items-center pb-2 border-b border-white/5 text-white/30 uppercase font-bold tracking-wider">
                  <span>Clase Crossfit - 19:00hs</span>
                  <span className="text-primary">18/20 cupos</span>
                </div>
                <div className="flex gap-2 py-1.5 items-center">
                  <div className="w-8 h-8 rounded-full bg-slate-700 animate-pulse" />
                  <div className="flex-grow">
                    <div className="h-3 w-24 bg-slate-700 rounded animate-pulse" />
                    <div className="h-2 w-16 bg-slate-800 mt-1 rounded" />
                  </div>
                  <div className="bg-green-500/10 text-green-400 px-2 py-0.5 rounded-md font-medium">Confirmado</div>
                </div>
                <div className="flex gap-2 py-1.5 items-center">
                  <div className="w-8 h-8 rounded-full bg-slate-700" />
                  <div className="flex-grow">
                    <div className="h-3 w-32 bg-slate-700 rounded" />
                    <div className="h-2 w-12 bg-slate-800 mt-1 rounded" />
                  </div>
                  <div className="bg-green-500/10 text-green-400 px-2 py-0.5 rounded-md font-medium">Confirmado</div>
                </div>
              </div>
            </div>

            {/* Tarjeta 2: Automatización de Cobros (Pequeña 4 cols) */}
            <div className="lg:col-span-4 md:row-span-2 bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/[0.07] rounded-3xl p-8 flex flex-col justify-between relative overflow-hidden group transition duration-500 select-none shadow-2xl">
              <div className="absolute -right-16 -bottom-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl" />
              <div>
                <div className="bg-white/5 p-3 rounded-2xl w-fit border border-white/10 mb-6">
                  <CreditCard className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Cobros & Finanzas</h3>
                <p className="text-white/50 text-sm leading-relaxed mb-4">
                  Olvídate de perseguir deudores. Planes modulares, control de vencimientos automático y métricas financieras en tiempo real.
                </p>
              </div>
              <div className="bg-[#0d0d12]/80 border border-white/5 rounded-2xl p-4 flex items-center justify-between group-hover:translate-y-[-5px] transition duration-500">
                <div>
                  <div className="text-[10px] text-white/40 uppercase font-bold tracking-wider">MRR Proyectado</div>
                  <div className="text-lg font-black text-white">$1,240,000</div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-emerald-400 animate-pulse" />
                </div>
              </div>
            </div>

            {/* Tarjeta 3: App Atletas (Grande 8 cols) */}
            <div className="lg:col-span-8 md:col-span-2 md:row-span-2 bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/[0.07] rounded-3xl p-8 flex flex-col justify-between relative overflow-hidden group transition duration-500 select-none shadow-2xl">
              <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition duration-500" />
              <div className="z-10 max-w-md">
                <div className="bg-white/5 p-3 rounded-2xl w-fit border border-white/10 mb-6">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">La Aplicación Móvil Amada por Atletas</h3>
                <p className="text-white/50 text-sm leading-relaxed">
                  Una WebApp ultra-rápida (PWA) que tus alumnos instalan en su Android o iPhone en 2 clics. Registran RMs, Benchmarks y visualizan su progreso histórico en hermosos gráficos interactivos.
                </p>
              </div>
              <div className="mt-6 flex gap-3 scale-100 group-hover:scale-[1.02] transition duration-500">
                <div className="bg-[#0d0d12]/60 border border-white/5 rounded-xl p-3 flex-1 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">RM</div>
                  <div>
                    <div className="text-xs font-bold">Back Squat</div>
                    <div className="text-[10px] text-white/40">145 kg (+5kg)</div>
                  </div>
                </div>
                <div className="bg-[#0d0d12]/60 border border-white/5 rounded-xl p-3 flex-1 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-xs font-bold text-amber-400">🏆</div>
                  <div>
                    <div className="text-xs font-bold">Fran (WOD)</div>
                    <div className="text-[10px] text-white/40">3:45 seg</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tarjeta 4: Soporte Personalizado (4 cols) */}
            <div className="lg:col-span-4 md:row-span-2 bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/[0.07] rounded-3xl p-8 flex flex-col justify-between relative overflow-hidden group transition duration-500 shadow-2xl">
              <div>
                <div className="bg-white/5 p-3 rounded-2xl w-fit border border-white/10 mb-6">
                  <Settings className="w-6 h-6 text-white/80" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Soporte por Whatsapp</h3>
                <p className="text-white/50 text-sm leading-relaxed">
                  Olvídate de lidiar con bots. Tienes un canal directo de Whatsapp con ingenieros reales para ayudarte a configurar tu Box en menos de 24 horas.
                </p>
              </div>
              <a 
                href="https://wa.me/541165234769" 
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#25d366]/10 hover:bg-[#25d366]/20 border border-[#25d366]/20 text-[#25d366] font-bold rounded-2xl transition"
              >
                Consultar vía Whatsapp
              </a>
            </div>

          </div>
        </div>
      </section>

      {/* 🏋️‍♀️ SECCIÓN DISCIPLINAS (Selector Dinámico) */}
      <section id="disciplines" className="py-24 px-6 relative">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-xs font-bold text-orange-500 uppercase tracking-widest">Adaptado a tu Pasión</h2>
            <p className="text-3xl sm:text-4xl font-black text-white mt-3">Especialistas en múltiples disciplinas</p>
          </div>

          {/* Botonera de Selector */}
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            {Object.entries(disciplines).map(([key, data]) => {
              const IconComp = data.icon;
              const isActive = activeTab === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex items-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-sm transition-all duration-300 ${
                    isActive 
                      ? "bg-white text-black shadow-xl shadow-white/5 scale-105" 
                      : "bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/5"
                  }`}
                >
                  <IconComp className={`w-4 h-4 ${isActive ? "text-black" : "text-white/60"}`} />
                  {data.title.split(" ")[0]}
                </button>
              );
            })}
          </div>

          {/* Detalle Dinámico de la Disciplina */}
          <div className="bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/5 rounded-3xl p-8 md:p-12 relative overflow-hidden animate-in fade-in duration-500">
            {/* Fondo decorativo dinámico */}
            <div className={`absolute top-[-50%] right-[-30%] w-96 h-96 bg-gradient-to-br ${disciplines[activeTab as keyof typeof disciplines].color} opacity-10 blur-[100px] pointer-events-none rounded-full transition-all duration-500`} />
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center relative z-10">
              <div className="md:col-span-8">
                <h3 className="text-3xl font-black text-white mb-4 flex items-center gap-3">
                  {disciplines[activeTab as keyof typeof disciplines].title}
                </h3>
                <p className="text-white/60 text-base leading-relaxed mb-8 max-w-xl">
                  {disciplines[activeTab as keyof typeof disciplines].desc}
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-sm text-white/80 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-green-400" /> Turnos Fijos
                  </div>
                  <div className="flex items-center gap-2 text-sm text-white/80 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-green-400" /> Pagos Integrados
                  </div>
                  <div className="flex items-center gap-2 text-sm text-white/80 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-green-400" /> App para Socios
                  </div>
                  <div className="flex items-center gap-2 text-sm text-white/80 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-green-400" /> Sin Límites de Alumnos
                  </div>
                </div>
              </div>
              <div className="md:col-span-4 flex justify-center">
                <div className={`w-32 h-32 rounded-[40px] bg-gradient-to-br ${disciplines[activeTab as keyof typeof disciplines].color} flex items-center justify-center shadow-2xl shadow-black`}>
                  {(() => {
                    const DynamicIcon = disciplines[activeTab as keyof typeof disciplines].icon;
                    return <DynamicIcon className="w-14 h-14 text-white drop-shadow" />;
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 💵 SECCIÓN DE CONTACTO COMERCIAL / VENTAS */}
      <section id="pricing" className="py-24 px-6 bg-[#08080c]/50 relative">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-xs font-bold text-primary uppercase tracking-widest">Comienza Hoy</h2>
            <p className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mt-3">El plan ideal para tu negocio</p>
            <p className="text-white/40 text-sm mt-4 leading-relaxed max-w-lg mx-auto">
              Descubre cómo EntrenAPP puede transformar la gestión diaria de tu centro. Agenda una demo personalizada sin compromiso.
            </p>
          </div>

          {/* Tarjeta de Contacto de Ventas Premium */}
          <div className="bg-gradient-to-br from-[#0d0d14] to-[#08080b] border border-white/10 rounded-3xl p-8 md:p-12 text-center relative overflow-hidden shadow-2xl shadow-black">
            <div className="absolute top-0 right-0 bg-gradient-to-l from-primary to-orange-500 text-white text-xs font-black px-8 py-2 rounded-bl-2xl shadow-lg uppercase tracking-wider">
              Personalizado
            </div>

            <div className="mb-8">
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center mb-4 border border-primary/20">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-black text-white mb-2">Potencia tu Box de Entrenamiento</h3>
              <p className="text-white/50 text-sm max-w-md mx-auto leading-relaxed">
                Analizamos el tamaño de tu Box y tus necesidades específicas para ofrecerte una propuesta a tu medida, sin comisiones raras ni costos ocultos.
              </p>
            </div>

            {/* Grid de Beneficios Incluidos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left max-w-md mx-auto mb-10 border-t border-white/5 pt-8">
              <div className="flex items-center gap-3 text-sm text-white/80 font-medium">
                <CheckCircle2 className="w-5 h-5 text-green-400" /> Sin Límites de Alumnos
              </div>
              <div className="flex items-center gap-3 text-sm text-white/80 font-medium">
                <CheckCircle2 className="w-5 h-5 text-green-400" /> App Móvil para Atletas
              </div>
              <div className="flex items-center gap-3 text-sm text-white/80 font-medium">
                <CheckCircle2 className="w-5 h-5 text-green-400" /> Diseño e Identidad Propia
              </div>
              <div className="flex items-center gap-3 text-sm text-white/80 font-medium">
                <CheckCircle2 className="w-5 h-5 text-green-400" /> Soporte por Whatsapp 24/7
              </div>
              <div className="flex items-center gap-3 text-sm text-white/80 font-medium">
                <CheckCircle2 className="w-5 h-5 text-green-400" /> Planificaciones Inteligentes
              </div>
              <div className="flex items-center gap-3 text-sm text-white/80 font-medium">
                <CheckCircle2 className="w-5 h-5 text-green-400" /> Migración de Datos Gratis
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 max-w-lg mx-auto">
              <a 
                href="https://wa.me/541165234769/?text=Hola!%20Me%20gustaría%20cotizar%20EntrenAPP%20para%20mi%20centro%20de%20entrenamiento." 
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-[#25d366] hover:bg-[#22c35e] text-black font-black text-lg py-4 px-8 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-[#25d366]/20"
              >
                Hablar con Ventas (WhatsApp)
              </a>
              <Link 
                href="/auth/signup" 
                className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-lg py-4 px-8 rounded-2xl transition-all duration-300"
              >
                Crear Cuenta Demo
              </Link>
            </div>
            <p className="text-white/30 text-[10px] mt-6 font-bold uppercase tracking-wider">
              * Prueba gratis habilitada temporalmente
            </p>
          </div>
        </div>
      </section>

      {/* ❓ SECCIÓN PREGUNTAS FRECUENTES (FAQs Accordion) */}
      <section id="faq" className="py-24 px-6 relative">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest">Despeja tus dudas</h2>
            <p className="text-3xl sm:text-4xl font-black text-white mt-3">Preguntas Frecuentes</p>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "¿Es una aplicación nativa para Android e iOS?",
                a: "Usamos la tecnología líder en el mercado (PWA). Esto significa que tus alumnos instalan una WebApp ultra-rápida y liviana directo en sus teléfonos desde el navegador. Ocupa 100 veces menos espacio y se actualiza automáticamente en tiempo real sin pasar por las tiendas."
              },
              {
                q: "¿Es difícil migrar mis datos desde otro software?",
                a: "¡Para nada! Nuestro soporte de ingeniería te ayuda GRATIS a cargar tu listado actual de alumnos y planes desde un Excel para que empieces a facturar en EntrenAPP desde el día 1."
              },
              {
                q: "¿Puedo probarlo antes de pagar?",
                a: "Sí, claro que sí. Ofrecemos un período de prueba gratis y sin compromiso de permanencia para que uses todas las funciones y compruebes con tus propios ojos que es lo que tu Box necesita."
              },
              {
                q: "¿Cómo se configuran los límites de reservas y horarios?",
                a: "Desde el panel web de Entrenador puedes configurar plantillas horarias, asignar cupos máximos por box y definir tiempos límites para cancelar o reservar. Si el box se llena, el sistema activa automáticamente la lista de espera."
              }
            ].map((item, index) => {
              const isOpen = openFaq === index;
              return (
                <div 
                  key={index} 
                  className="bg-white/5 border border-white/5 hover:border-white/10 rounded-2xl overflow-hidden transition-colors duration-300"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full px-6 py-5 text-left flex justify-between items-center gap-4 font-bold text-white"
                  >
                    <span>{item.q}</span>
                    <ChevronDown className={`w-5 h-5 text-white/40 shrink-0 transition-transform duration-300 ${isOpen ? "rotate-180" : "rotate-0"}`} />
                  </button>
                  <div className={`px-6 text-sm text-white/60 overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? "max-h-40 pb-5 border-t border-white/5 pt-4" : "max-h-0"}`}>
                    <p>{item.a}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 🏁 FOOTER DE ÉLITE */}
      <footer className="border-t border-white/5 py-16 px-6 bg-[#050507] relative">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2.5">
            <div className="bg-primary/20 p-2.5 rounded-2xl">
              <Dumbbell className="w-5 h-5 text-primary" />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-white">
              EntrenAPP
            </span>
          </div>
          <div className="flex flex-wrap justify-center gap-8 text-sm text-white/40">
            <a href="#features" className="hover:text-white transition">Características</a>
            <a href="#disciplines" className="hover:text-white transition">Disciplinas</a>
            <a href="#pricing" className="hover:text-white transition">Precios</a>
            <a href="https://wa.me/541165234769" className="hover:text-white transition">Contacto</a>
          </div>
          <div className="text-xs text-white/20 font-bold uppercase tracking-widest">
            © 2026 EntrenAPP. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
