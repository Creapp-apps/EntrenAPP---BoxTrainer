import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Dumbbell, ArrowRight, Users, Trophy, BarChart3, CheckCircle2, Sparkles, Settings } from "lucide-react";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let dashboardUrl = "/auth/login";
  let ctaText = "Iniciar Sesión";
  let isLogged = false;

  if (user) {
    isLogged = true;
    ctaText = "Ir a mi Panel";
    const role = user.app_metadata?.role;
    if (role === "super_admin") {
      dashboardUrl = "/super-admin";
    } else if (role === "student") {
      dashboardUrl = "/alumno";
    } else {
      dashboardUrl = "/entrenador";
    }
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 selection:bg-violet-500/30 overflow-x-hidden relative font-sans">
      {/* 🌌 Fondos Dinámicos de Iluminación */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[120px] -z-10 pointer-events-none animate-pulse" />
      <div className="absolute top-[40%] right-1/4 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[120px] -z-10 pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 w-[600px] h-[600px] bg-cyan-600/5 rounded-full blur-[150px] -z-10 pointer-events-none" />

      {/* 📍 Barra de Navegación */}
      <nav className="sticky top-0 z-50 bg-[#09090b]/70 backdrop-blur-xl border-b border-zinc-800/50 py-4">
        <div className="max-w-7xl mx-auto px-6 md:px-8 flex items-center justify-between">
          <div className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-all">
              <Dumbbell className="w-5 h-5 text-white" />
            </div>
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              EntrenAPP
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors">Funcionalidades</a>
            <a href="#perfiles" className="hover:text-white transition-colors">Perfiles</a>
            <a href="#beneficios" className="hover:text-white transition-colors">Beneficios</a>
          </div>

          <Link
            href={dashboardUrl}
            className="flex items-center gap-2 bg-white hover:bg-zinc-200 text-black font-bold px-5 py-2.5 rounded-xl transition-all transform active:scale-95 shadow-lg text-sm shadow-white/5"
          >
            {ctaText}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </nav>

      {/* 🚀 SECCIÓN HERO */}
      <main className="max-w-7xl mx-auto px-6 md:px-8 pt-20 pb-28 text-center relative">
        {/* Tag superior */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 mb-8 hover:border-zinc-700 transition cursor-default">
          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-xs font-medium text-zinc-300">La plataforma definitiva para Centros de Entrenamiento</span>
        </div>

        <h1 className="text-4xl md:text-7xl font-black tracking-tight leading-[1.1] max-w-5xl mx-auto">
          Potencia la gestión de tu{" "}
          <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 text-transparent bg-clip-text drop-shadow-sm">
            Box de Entrenamiento
          </span>
        </h1>

        <p className="mt-6 text-base md:text-xl text-zinc-400 max-w-3xl mx-auto leading-relaxed">
          EntrenAPP centraliza cobros, planificación deportiva de alta precisión, gestión de turnos y récords de atletas en un solo ecosistema multi-box. 
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href={dashboardUrl}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold px-8 py-4 rounded-2xl text-lg transition-all shadow-xl shadow-indigo-600/20 border border-indigo-400/20 transform hover:-translate-y-0.5"
          >
            {isLogged ? "Acceder a mi Panel" : "Empieza Ahora"}
            <ArrowRight className="w-5 h-5" />
          </Link>
          <a
            href="#features"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 font-semibold px-8 py-4 rounded-2xl border border-zinc-800 transition hover:text-white"
          >
            Saber más
          </a>
        </div>

        {/* Abstract Preview del Dashboard */}
        <div className="mt-24 relative max-w-5xl mx-auto">
          <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-transparent to-transparent z-10" />
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950 p-4 md:p-6 shadow-[0_20px_80px_-20px_rgba(124,58,237,0.2)] overflow-hidden relative group">
            {/* Top bar del browser mock */}
            <div className="flex items-center gap-2 pb-4 border-b border-zinc-900">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
              <div className="ml-4 h-5 flex-1 max-w-xs bg-zinc-900 rounded-md flex items-center px-3">
                <span className="text-[10px] text-zinc-600 font-medium">entrenapp.com/dashboard</span>
              </div>
            </div>

            {/* Render visual de UI */}
            <div className="grid grid-cols-12 gap-4 pt-6 opacity-80 group-hover:opacity-100 transition duration-500">
              <div className="col-span-3 space-y-3">
                <div className="h-8 bg-zinc-900 rounded-lg w-3/4" />
                <div className="h-24 bg-zinc-900/50 rounded-xl border border-zinc-900" />
                <div className="h-24 bg-zinc-900/50 rounded-xl border border-zinc-900" />
              </div>
              <div className="col-span-9 space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="h-20 rounded-xl bg-gradient-to-br from-violet-950/40 to-zinc-900 border border-violet-900/30 p-3 flex flex-col justify-between">
                    <div className="w-8 h-8 rounded-lg bg-violet-500/10" />
                    <div className="h-3 bg-violet-400/40 rounded w-1/2 mt-2" />
                  </div>
                  <div className="h-20 rounded-xl bg-zinc-900/50 border border-zinc-900" />
                  <div className="h-20 rounded-xl bg-zinc-900/50 border border-zinc-900" />
                </div>
                <div className="h-48 rounded-xl bg-gradient-to-tr from-zinc-900 to-zinc-950 border border-zinc-900 p-4 flex items-end justify-between gap-2 relative overflow-hidden">
                  <div className="h-[30%] w-full bg-indigo-500/30 rounded-t-md" />
                  <div className="h-[50%] w-full bg-violet-500/30 rounded-t-md" />
                  <div className="h-[40%] w-full bg-cyan-500/30 rounded-t-md" />
                  <div className="h-[80%] w-full bg-indigo-500/50 rounded-t-md border-t border-indigo-400" />
                  <div className="h-[60%] w-full bg-violet-500/30 rounded-t-md" />
                  <div className="h-[90%] w-full bg-gradient-to-t from-violet-500/40 to-violet-500/80 rounded-t-md border-t border-violet-300" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 📦 SECCIÓN FUNCIONALIDADES */}
      <section id="features" className="border-t border-zinc-900 bg-black/40 py-24">
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white">
              Todo lo que tu Box necesita
            </h2>
            <p className="mt-4 text-zinc-400">
              Centraliza tu ecosistema deportivo y comercial eliminando el desorden de los grupos de chat y las hojas de cálculo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Tarjeta 1 */}
            <div className="bg-zinc-950 border border-zinc-850 hover:border-violet-500/40 rounded-3xl p-8 transition-all hover:-translate-y-1 hover:shadow-[0_10px_40px_-15px_rgba(124,58,237,0.15)] flex flex-col group">
              <div className="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center text-violet-400 group-hover:bg-violet-500 group-hover:text-white transition-all mb-6 shadow-inner">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Administración Financiera</h3>
              <p className="text-sm text-zinc-400 leading-relaxed flex-1">
                Cobros integrados, planes personalizables, monitoreo de morosos y métricas de ingresos recurrentes (MRR) en vivo.
              </p>
            </div>

            {/* Tarjeta 2 */}
            <div className="bg-zinc-950 border border-zinc-850 hover:border-indigo-500/40 rounded-3xl p-8 transition-all hover:-translate-y-1 hover:shadow-[0_10px_40px_-15px_rgba(99,102,241,0.15)] flex flex-col group">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all mb-6">
                <Settings className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Planificación Inteligente</h3>
              <p className="text-sm text-zinc-400 leading-relaxed flex-1">
                Diseño de ciclos de Fuerza, CrossFit y Prep Física. Módulos de WODs por niveles, variantes de ejercicios y asignación masiva.
              </p>
            </div>

            {/* Tarjeta 3 */}
            <div className="bg-zinc-950 border border-zinc-850 hover:border-cyan-500/40 rounded-3xl p-8 transition-all hover:-translate-y-1 hover:shadow-[0_10px_40px_-15px_rgba(6,182,212,0.15)] flex flex-col group">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500 group-hover:text-white transition-all mb-6">
                <Trophy className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Seguimiento de Atletas</h3>
              <p className="text-sm text-zinc-400 leading-relaxed flex-1">
                Control de récords personales (RMs/PRs), registro diario de resultados y evolución histórica para motivar a tus alumnos.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 👥 SECCIÓN PERFILES */}
      <section id="perfiles" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight">
                Diseñado a medida para cada actor del centro
              </h2>
              <p className="mt-4 text-zinc-400 leading-relaxed">
                Creamos paneles exclusivos enfocados en las necesidades de los administradores, los profesores de piso y los atletas que sudan la camiseta.
              </p>

              <div className="mt-10 space-y-6">
                {[
                  {
                    title: "Dueños de Negocio",
                    desc: "Vigilancia global del local, flujo de caja y altas de nuevos miembros con links simplificados.",
                    icon: Users,
                    color: "text-violet-400",
                    bgColor: "bg-violet-400/10"
                  },
                  {
                    title: "Coaches / Profesores",
                    desc: "Creación rápida de entrenamientos desde el celular o PC y control de asistencia automatizado.",
                    icon: Dumbbell,
                    color: "text-indigo-400",
                    bgColor: "bg-indigo-400/10"
                  },
                  {
                    title: "Alumnos / Atletas",
                    desc: "App nativa móvil (PWA) para agendar turnos, ver el WOD de hoy y cargar sus marcas al instante.",
                    icon: Trophy,
                    color: "text-cyan-400",
                    bgColor: "bg-cyan-400/10"
                  }
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4 p-4 rounded-2xl hover:bg-zinc-900/50 border border-transparent hover:border-zinc-850 transition duration-300">
                    <div className={`w-10 h-10 rounded-xl ${item.bgColor} ${item.color} flex items-center justify-center shrink-0 shadow-inner`}>
                      <item.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white">{item.title}</h4>
                      <p className="text-sm text-zinc-400 mt-1 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual lateral derecha interactiva */}
            <div className="relative flex justify-center">
              <div className="absolute -inset-4 bg-gradient-to-r from-violet-600/10 to-cyan-500/10 rounded-3xl blur-3xl -z-10" />
              <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800 rounded-3xl p-8 w-full max-w-md shadow-2xl relative overflow-hidden">
                {/* Grid decorativo de fondo */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:24px_24px]" />
                
                <div className="relative">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-6">
                    <span className="text-sm font-bold text-zinc-300">App del Atleta</span>
                    <div className="px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] font-bold">Online</div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800">
                      <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-wide">Planificación de Hoy</p>
                      <h4 className="text-base font-bold text-white mt-1">WOD: Murph Modificado</h4>
                      <div className="mt-3 flex items-center gap-2 text-[11px] text-zinc-400">
                        <span className="bg-zinc-800 px-2 py-0.5 rounded">40 min</span>
                        <span className="bg-violet-950/60 text-violet-300 border border-violet-800/40 px-2 py-0.5 rounded font-medium">CrossFit</span>
                      </div>
                    </div>

                    <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-white">Turno Confirmado</p>
                        <CheckCircle2 className="w-4 h-4 text-violet-400" />
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">Hoy · 19:00 hs a 20:00 hs</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="bg-zinc-900/80 rounded-xl p-3 border border-zinc-800 text-center">
                        <p className="text-xl font-bold text-indigo-400">95kg</p>
                        <p className="text-[10px] text-zinc-500 mt-0.5">PR Sentadilla</p>
                      </div>
                      <div className="bg-zinc-900/80 rounded-xl p-3 border border-zinc-800 text-center">
                        <p className="text-xl font-bold text-cyan-400">8</p>
                        <p className="text-[10px] text-zinc-500 mt-0.5">Créditos Libres</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 📢 CTA FINAL */}
      <section className="py-24 bg-gradient-to-b from-black to-[#09090b] border-t border-zinc-900 text-center relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-600/10 rounded-full blur-[100px] -z-10 pointer-events-none" />
        
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl md:text-6xl font-extrabold tracking-tight text-white">
            Comienza a escalar hoy
          </h2>
          <p className="mt-6 text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto">
            Únete a los centros de entrenamiento que ya han modernizado sus cobros y sus rutinas diarias.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={dashboardUrl}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white hover:bg-zinc-200 text-black font-bold px-8 py-4 rounded-2xl text-lg transition-all shadow-xl shadow-white/5 transform active:scale-95"
            >
              {ctaText}
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* 🗺️ FOOTER */}
      <footer className="border-t border-zinc-900 py-12 bg-[#070708] text-center text-sm text-zinc-600">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 border border-zinc-700">
              <Dumbbell className="w-4 h-4" />
            </div>
            <span className="font-bold text-white">EntrenAPP</span>
          </div>
          <p className="font-medium">
            © {new Date().getFullYear()} EntrenAPP · Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-zinc-300 transition">Soporte</a>
            <a href="#" className="hover:text-zinc-300 transition">Legales</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
