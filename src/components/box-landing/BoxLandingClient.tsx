"use client";

import { useState } from "react";
import Link from "next/link";
import { Dumbbell, ArrowRight, UserCircle, MapPin, X, Info, Tag, ShoppingBag, MessageCircle } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  price: number;
  modality: string;
  sessions_per_week: number;
}

interface BoxData {
  id: string;
  name: string;
  phone?: string;
  logo_url?: string;
  branding_config: {
    primary_color?: string;
    secondary_color?: string;
    welcome_message?: string;
    logo_style?: string;
    spline_url?: string;
  } | null;
}

export default function BoxLandingClient({ box, plans = [] }: { box: BoxData, plans?: Plan[] }) {
  const primaryColor = box.branding_config?.primary_color || "#EA580C"; // default orange
  const welcomeMsg = box.branding_config?.welcome_message || "Tu mejor versión empieza acá.";
  
  const [activeModal, setActiveModal] = useState<"about" | "prices" | "products" | null>(null);

  // Helper to convert hex to rgb for opacity handling in tailwind
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : "234, 88, 12";
  };

  const primaryRgb = hexToRgb(primaryColor);

  // Extraemos el Render 3D a una constante para poder posicionarlo diferente en mobile y desktop
  const Render3D = (
    <div 
      className="relative w-full h-[350px] sm:h-[450px] lg:h-[550px] perspective-[1200px] flex items-center justify-center my-8 lg:my-0"
      onMouseMove={(e) => {
        if (window.innerWidth < 1024) return; // Deshabilitar parallax por mouse en mobile/tablet
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        e.currentTarget.style.transform = `rotateY(${x / 30}deg) rotateX(${-y / 30}deg)`;
      }}
      onMouseLeave={(e) => {
        if (window.innerWidth < 1024) return;
        e.currentTarget.style.transform = `rotateY(0deg) rotateX(0deg)`;
      }}
      style={{ transition: "transform 0.15s ease-out" }}
    >
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes mobileFloat {
          0%, 100% { transform: translateY(0px) rotateX(5deg) rotateY(-5deg); }
          50% { transform: translateY(-15px) rotateX(2deg) rotateY(2deg); }
        }
        .mobile-float { animation: mobileFloat 6s ease-in-out infinite; }
        @media (min-width: 1024px) { .mobile-float { animation: none; transform: none; } }
      `}} />
      
      <div className="w-full h-full flex items-center justify-center mobile-float">
      {box.branding_config?.spline_url ? (
        <div className="w-full max-w-[500px] lg:max-w-[600px] aspect-square rounded-[3rem] overflow-hidden relative shadow-2xl border border-white/10 group">
          <iframe 
            src={box.branding_config.spline_url} 
            className="w-full h-full opacity-90 mix-blend-lighten pointer-events-auto"
            style={{ border: "none" }}
          />
        </div>
      ) : box.name.toLowerCase().includes("wolfpack") ? (
        <div className="w-full max-w-[500px] lg:max-w-[600px] aspect-square relative rounded-[3rem] shadow-2xl border-2 overflow-hidden pointer-events-none" style={{ borderColor: primaryColor, boxShadow: `0 30px 60px -15px rgba(${primaryRgb}, 0.5)` }}>
          <img 
            src="/assets/wolfpack-massive-render.png" 
            alt="Instalaciones Wolfpack" 
            className="w-full h-full object-cover opacity-90 mix-blend-lighten"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#060608] via-transparent to-transparent opacity-80" />
          <div className="absolute bottom-6 left-6 right-6 p-4 rounded-2xl bg-black/50 backdrop-blur-md border border-white/10 flex justify-between items-center">
            <div>
              <p className="text-[10px] uppercase font-bold text-white/50 tracking-wider">Instalaciones Completas</p>
              <p className="font-black text-white">Complejo Wolfpack</p>
            </div>
            <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: primaryColor }} />
          </div>
        </div>
      ) : (
        <div 
          className="w-full max-w-[450px] lg:max-w-[550px] aspect-square rounded-[3rem] relative border border-white/10 shadow-2xl overflow-hidden pointer-events-none"
          style={{ 
            transform: "rotateY(-15deg) rotateX(10deg)",
            background: `linear-gradient(135deg, rgba(${primaryRgb}, 0.2) 0%, rgba(0,0,0,0.8) 100%)`,
            boxShadow: `0 30px 60px -15px rgba(${primaryRgb}, 0.3), -20px 20px 50px rgba(0,0,0,0.5)`
          }}
        >
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
          <div className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full border-4 opacity-50 animate-[spin_10s_linear_infinite]" style={{ borderColor: primaryColor }} />
          <div className="absolute bottom-1/4 right-1/4 w-24 h-24 rounded-lg border-2 opacity-30 animate-[spin_8s_linear_infinite_reverse]" style={{ borderColor: primaryColor }} />
          <div className="absolute inset-0 flex items-center justify-center">
             <Dumbbell className="w-32 h-32 text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] opacity-80" />
          </div>
          <div className="absolute bottom-6 left-6 right-6 p-4 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 flex justify-between items-center">
            <div>
              <p className="text-[10px] uppercase font-bold text-white/50 tracking-wider">Espacio Oficial</p>
              <p className="font-black text-white">{box.name}</p>
            </div>
            <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: primaryColor }} />
          </div>
        </div>
      )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#060608] text-white font-sans overflow-hidden relative selection:bg-white/20">
      
      {/* Dynamic Background Glow based on Box Color */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div 
          className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[150px] opacity-40" 
          style={{ backgroundColor: primaryColor }}
        />
        <div 
          className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[150px] opacity-20"
          style={{ backgroundColor: primaryColor }}
        />
      </div>

      {/* Navbar */}
      <nav className="relative z-50 w-full p-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          {box.logo_url ? (
            <div className="w-12 h-12 rounded-[14px] overflow-hidden shadow-lg shrink-0 border border-white/10" style={{ boxShadow: `0 10px 25px -5px rgba(${primaryRgb}, 0.4)` }}>
              <img src={box.logo_url} alt={`Logo de ${box.name}`} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div 
              className="p-2.5 rounded-[14px] shadow-lg shrink-0"
              style={{ backgroundColor: primaryColor, boxShadow: `0 10px 25px -5px rgba(${primaryRgb}, 0.4)` }}
            >
              <Dumbbell className="w-6 h-6 text-white" />
            </div>
          )}
          <span className="text-xl sm:text-2xl font-black tracking-tight truncate">{box.name}</span>
        </div>
        <Link 
          href="/buscar-box" 
          className="text-white/50 hover:text-white text-xs sm:text-sm font-semibold transition-colors shrink-0 ml-2"
        >
          Cambiar <span className="hidden sm:inline">gimnasio</span>
        </Link>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-6 pb-20 grid grid-cols-1 lg:grid-cols-2 gap-x-16 gap-y-0 items-center min-h-[80vh]">
        
        {/* Left: Text & CTA */}
        <div className="flex flex-col items-start text-left w-full">
          <div 
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 border"
            style={{ backgroundColor: `rgba(${primaryRgb}, 0.1)`, borderColor: `rgba(${primaryRgb}, 0.2)` }}
          >
            <MapPin className="w-4 h-4" style={{ color: primaryColor }} />
            <span className="text-xs font-black uppercase tracking-widest" style={{ color: primaryColor }}>
              Sede Oficial
            </span>
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.05] text-white mb-6 text-balance w-full break-words">
            Bienvenido a <br />
            <span style={{ color: primaryColor }}>{box.name}</span>
          </h1>

          <p className="text-lg sm:text-xl text-white/60 leading-relaxed max-w-lg mb-8">
            {welcomeMsg}
          </p>

          {/* MÓVIL: Mostramos el Render 3D ACÁ, justo abajo del texto y antes de los botones */}
          <div className="block lg:hidden w-full">
            {Render3D}
          </div>

          {/* Botones de acción principal */}
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mt-4 lg:mt-0">
            <Link
              href={`/auth/signup?box_id=${box.id}`}
              className="font-black px-8 py-4 rounded-2xl shadow-xl transition-all duration-300 text-base flex items-center justify-center gap-2 group hover:-translate-y-1"
              style={{ 
                backgroundColor: primaryColor, 
                color: "#fff",
                boxShadow: `0 20px 40px -10px rgba(${primaryRgb}, 0.5)`
              }}
            >
              Hacerme socio
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href={`/auth/login?box_id=${box.id}`}
              className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-bold px-8 py-4 rounded-2xl transition-all duration-300 text-base flex items-center justify-center gap-2"
            >
              <UserCircle className="w-5 h-5 text-white/70" />
              Iniciar sesión
            </Link>
          </div>

          {/* Menús Desplegables / Modales */}
          <div className="mt-12 w-full max-w-lg">
            <p className="text-sm font-semibold text-white/40 mb-4 uppercase tracking-widest text-center sm:text-left">Explorar el Box</p>
            <div className="grid grid-cols-2 gap-3 w-full">
              <button 
                onClick={() => setActiveModal("about")}
                className="w-full px-5 py-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] hover:border-white/20 text-sm font-semibold text-white/80 hover:text-white transition-all flex flex-col items-center justify-center gap-2 group"
              >
                <Info className="w-6 h-6 text-white/40 group-hover:text-white transition-colors" style={{ color: primaryColor }} /> 
                <span>Quiénes somos</span>
              </button>
              <button 
                onClick={() => setActiveModal("prices")}
                className="w-full px-5 py-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] hover:border-white/20 text-sm font-semibold text-white/80 hover:text-white transition-all flex flex-col items-center justify-center gap-2 group"
              >
                <Tag className="w-6 h-6 text-white/40 group-hover:text-white transition-colors" style={{ color: primaryColor }} /> 
                <span>Planes y Precios</span>
              </button>
              <button 
                onClick={() => setActiveModal("products")}
                className="w-full px-5 py-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] hover:border-white/20 text-sm font-semibold text-white/80 hover:text-white transition-all flex flex-col items-center justify-center gap-2 group"
              >
                <ShoppingBag className="w-6 h-6 text-white/40 group-hover:text-white transition-colors" style={{ color: primaryColor }} /> 
                <span>Productos</span>
              </button>
              
              {box.phone && (
                <a 
                  href={`https://wa.me/${String(box.phone).replace(/[^0-9]/g, "")}`}
                  target="_blank" rel="noopener noreferrer"
                  className="w-full px-5 py-4 rounded-2xl bg-[#25D366]/5 hover:bg-[#25D366]/10 border border-[#25D366]/20 hover:border-[#25D366]/40 text-sm font-semibold text-[#25D366] transition-all flex flex-col items-center justify-center gap-2 group"
                >
                  <MessageCircle className="w-6 h-6" /> 
                  <span>Consultas</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Desktop: Render 3D a la derecha */}
        <div className="hidden lg:block w-full">
          {Render3D}
        </div>
      </main>

      {/* Modals */}
      {activeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div 
            className="w-full max-w-lg bg-[#0a0a0f] border border-white/10 rounded-3xl p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200"
            style={{ boxShadow: `0 25px 50px -12px rgba(${primaryRgb}, 0.2)` }}
          >
            <button 
              onClick={() => setActiveModal(null)}
              className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            {activeModal === "about" && (
              <div>
                <h2 className="text-2xl font-black text-white mb-4 flex items-center gap-2">
                  <Info className="w-6 h-6" style={{ color: primaryColor }} /> Quiénes somos
                </h2>
                <p className="text-white/60 leading-relaxed">
                  Somos <strong>{box.name}</strong>, tu espacio dedicado al fitness y la comunidad. 
                  Nuestro objetivo es brindarte las mejores herramientas, programación y entorno para 
                  que alcances tu mejor versión. Entrená con profesionales apasionados que te guiarán 
                  paso a paso.
                </p>
              </div>
            )}

            {activeModal === "prices" && (
              <div>
                <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-2">
                  <Tag className="w-6 h-6" style={{ color: primaryColor }} /> Actividades y Precios
                </h2>
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                  {(plans?.length || 0) > 0 ? (
                    plans?.map((plan) => (
                      <div key={plan.id} className="p-4 rounded-xl bg-white/5 border border-white/5 flex justify-between items-center">
                        <div>
                          <h4 className="font-bold text-white">{plan.name}</h4>
                          <p className="text-xs text-white/40">
                            {plan.modality === 'credits' 
                              ? `${plan.sessions_per_week} clases por período` 
                              : plan.modality === 'free' ? 'Libre' : plan.modality}
                          </p>
                        </div>
                        <span className="font-black text-lg" style={{ color: primaryColor }}>
                          ${plan.price.toLocaleString("es-AR")}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-white/50 text-sm">Próximamente estaremos publicando nuestros planes activos.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeModal === "products" && (
              <div>
                <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-2">
                  <ShoppingBag className="w-6 h-6" style={{ color: primaryColor }} /> Productos
                </h2>
                <div className="text-center py-10 bg-white/[0.02] rounded-2xl border border-white/5">
                  <ShoppingBag className="w-10 h-10 mx-auto mb-3 text-white/20" />
                  <p className="text-white/50 font-medium">La tienda de productos estará disponible pronto.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
