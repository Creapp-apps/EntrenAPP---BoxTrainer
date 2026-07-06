"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Dumbbell, ArrowRight, UserCircle, MapPin, X, Info, Tag, ShoppingBag, MessageCircle, Search, ShoppingCart, Check, Loader2, ArrowLeft, Copy } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  price: number;
  modality: string;
  sessions_per_week: number;
  description?: string;
  show_on_landing?: boolean;
  allowed_activities?: string[];
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

export default function BoxLandingClient({ box, plans = [], products = [], activities = [] }: { box: BoxData, plans?: Plan[], products?: any[], activities?: any[] }) {
  const primaryColor = box.branding_config?.primary_color || "#EA580C"; // default orange
  const welcomeMsg = box.branding_config?.welcome_message || "Tu mejor versión empieza acá.";
  
  const [activeModal, setActiveModal] = useState<"about" | "prices" | "products" | "trial" | null>(null);

  // States for trial modal
  const getTomorrowDateString = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  };

  const [trialDate, setTrialDate] = useState(getTomorrowDateString());
  const [trialSlots, setTrialSlots] = useState<any[]>([]);
  const [trialLoadingSlots, setTrialLoadingSlots] = useState(false);
  const [selectedTrialSlotId, setSelectedTrialSlotId] = useState("");
  const [trialFullName, setTrialFullName] = useState("");
  const [trialEmail, setTrialEmail] = useState("");
  const [trialPhone, setTrialPhone] = useState("");
  const [trialSubmitting, setTrialSubmitting] = useState(false);
  const [trialSuccess, setTrialSuccess] = useState(false);
  const [trialCredentials, setTrialCredentials] = useState<any | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  // Fetch slots for the selected date on trial modal open/change
  useEffect(() => {
    if (activeModal !== "trial" || !trialDate) return;

    const fetchSlots = async () => {
      setTrialLoadingSlots(true);
      try {
        const res = await fetch(`/api/public/boxes/${box.id}/slots?date=${trialDate}`);
        if (res.ok) {
          const data = await res.json();
          setTrialSlots(data.slots || []);
          // Auto select first slot with available spots
          const firstAvailable = (data.slots || []).find((s: any) => s.spots_available > 0);
          setSelectedTrialSlotId(firstAvailable ? firstAvailable.slot_id : "");
        } else {
          setTrialSlots([]);
          setSelectedTrialSlotId("");
        }
      } catch (error) {
        console.error("Error fetching trial slots:", error);
        setTrialSlots([]);
        setSelectedTrialSlotId("");
      } finally {
        setTrialLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [activeModal, trialDate, box.id]);

  // States for products modal
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [buyerName, setBuyerName] = useState("");
  const [buyerContact, setBuyerContact] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

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
      ) : box.name.toLowerCase().includes("vuur") ? (
        <div className="w-full max-w-[500px] lg:max-w-[600px] aspect-square relative rounded-[3rem] shadow-2xl border-2 overflow-hidden pointer-events-none" style={{ borderColor: primaryColor, boxShadow: `0 30px 60px -15px rgba(${primaryRgb}, 0.5)` }}>
          <img 
            src="/assets/vuur-massive-render.png" 
            alt="Instalaciones Vuur" 
            className="w-full h-full object-cover opacity-90 mix-blend-lighten"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#060608] via-transparent to-transparent opacity-80" />
          <div className="absolute bottom-6 left-6 right-6 p-4 rounded-2xl bg-black/50 backdrop-blur-md border border-white/10 flex justify-between items-center">
            <div>
              <p className="text-[10px] uppercase font-bold text-white/50 tracking-wider">Instalaciones Premium</p>
              <p className="font-black text-white">Complejo Vuur</p>
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
            <button
              onClick={() => setActiveModal("trial")}
              className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-bold px-8 py-4 rounded-2xl transition-all duration-300 text-base flex items-center justify-center gap-2"
            >
              <Dumbbell className="w-5 h-5 text-white/70 animate-pulse" style={{ color: primaryColor }} />
              Clase de prueba
            </button>
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
                <div className="max-h-[60vh] overflow-y-auto pr-2">
                  {(() => {
                    const metadata = box.branding_config?.plans_landing_metadata || {};
                    
                    const plansWithMetadata = plans.map(p => {
                      const planMeta = metadata[p.id] || {};
                      return {
                        ...p,
                        description: planMeta.description || p.description || "",
                        show_on_landing: planMeta.show_on_landing !== undefined ? planMeta.show_on_landing : !!p.show_on_landing,
                      };
                    });

                    const plansToShow = plansWithMetadata.filter(p => p.show_on_landing);

                    if (plansToShow.length === 0) {
                      return (
                        <div className="text-center py-12 bg-white/[0.01] rounded-2xl border border-white/[0.03]">
                          <p className="text-white/50 text-sm">Próximamente estaremos publicando nuestros planes activos.</p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-4">
                        {plansToShow.map((plan) => (
                          <div 
                            key={plan.id} 
                            className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col hover:border-white/10 transition-all gap-3 text-left"
                          >
                            <div className="flex justify-between items-start gap-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[9px] uppercase font-black tracking-widest px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/50">
                                    {plan.modality === 'presencial' ? 'Presencial' : plan.modality === 'a_distancia' ? 'A Distancia' : 'Mixto'}
                                  </span>
                                  
                                  {/* Activity Badges */}
                                  {(plan.allowed_activities || []).map((aId) => {
                                    const act = activities.find(a => a.id === aId);
                                    return act ? (
                                      <span 
                                        key={aId} 
                                        className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded"
                                        style={{ backgroundColor: act.color + '20', color: act.color, border: `1px solid ${act.color}30` }}
                                      >
                                        {act.name}
                                      </span>
                                    ) : null;
                                  })}
                                </div>
                                <h4 className="font-extrabold text-white text-base mt-2">{plan.name}</h4>
                                <p className="text-xs text-white/40 leading-normal">
                                  {plan.sessions_per_week} clases por semana
                                </p>
                              </div>
                              <div className="text-right">
                                <span className="font-black text-xl" style={{ color: primaryColor }}>
                                  ${plan.price.toLocaleString("es-AR")}
                                </span>
                                <p className="text-[10px] text-white/30 font-bold uppercase tracking-wider mt-0.5">Por período</p>
                              </div>
                            </div>

                            {plan.description && (
                              <p className="text-xs text-white/60 leading-relaxed bg-white/[0.01] border border-white/[0.03] p-3 rounded-xl">
                                {plan.description}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {activeModal === "products" && (
              <div className="flex flex-col h-full max-h-[85vh]">
                {/* Header */}
                <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-4 shrink-0">
                  {selectedProduct ? (
                    <button
                      onClick={() => {
                        setSelectedProduct(null);
                        setOrderSuccess(false);
                        setOrderQuantity(1);
                      }}
                      className="p-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-white/75 hover:text-white"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                  ) : (
                    <div className="p-2 rounded-xl" style={{ backgroundColor: `rgba(${primaryRgb}, 0.1)` }}>
                      <ShoppingBag className="w-5 h-5" style={{ color: primaryColor }} />
                    </div>
                  )}
                  <div className="text-left">
                    <h2 className="text-xl font-black text-white">
                      {selectedProduct ? "Realizar Pedido" : "Tienda del Box"}
                    </h2>
                    <p className="text-xs text-white/40">
                      {selectedProduct ? selectedProduct.name : "Suplementación, bebidas y equipamiento"}
                    </p>
                  </div>
                </div>

                {/* Sub-view: Order Success */}
                {selectedProduct && orderSuccess ? (
                  <div className="flex-1 overflow-y-auto pr-1 py-4 space-y-6 text-center">
                    <div className="relative w-16 h-16 mx-auto">
                      <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-lg scale-125 animate-pulse" />
                      <div className="relative w-full h-full rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                        <Check className="w-8 h-8 text-emerald-400" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-lg font-black text-white">¡Pedido recibido con éxito!</h3>
                      <p className="text-xs text-white/60 leading-relaxed max-w-sm mx-auto">
                        Hemos registrado tu pedido en nuestra base de datos. Podes pasar a retirarlo y abonarlo directamente en el mostrador del Box.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2 max-w-sm mx-auto text-left">
                      <div className="flex justify-between text-xs">
                        <span className="text-white/40">Producto:</span>
                        <span className="font-semibold text-white">{selectedProduct.name}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-white/40">Cantidad:</span>
                        <span className="font-semibold text-white">{orderQuantity} unidades</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-white/40">Total a abonar:</span>
                        <span className="font-black" style={{ color: primaryColor }}>
                          ${(selectedProduct.price * orderQuantity).toLocaleString("es-AR")}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 max-w-sm mx-auto pt-4">
                      {box.phone && (
                        <a
                          href={`https://wa.me/${String(box.phone).replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                            `¡Hola! Acabo de realizar un pedido de ${orderQuantity}x ${selectedProduct.name} desde la web del Box. Mi nombre es ${buyerName}.`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-black px-6 py-3.5 rounded-xl shadow-xl transition-all duration-300 text-sm flex items-center justify-center gap-2 text-white hover:scale-[1.02]"
                          style={{
                            backgroundColor: "#25D366",
                            boxShadow: "0 10px 20px -5px rgba(37, 211, 102, 0.4)"
                          }}
                        >
                          <MessageCircle className="w-4 h-4 shrink-0" />
                          Enviar WhatsApp para coordinar
                        </a>
                      )}
                      <button
                        onClick={() => {
                          setSelectedProduct(null);
                          setOrderSuccess(false);
                          setOrderQuantity(1);
                        }}
                        className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-bold px-6 py-3 rounded-xl transition-all text-xs w-full"
                      >
                        Volver a la tienda
                      </button>
                    </div>
                  </div>
                ) : selectedProduct ? (
                  /* Sub-view: Order Form */
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (!selectedProduct || !buyerName.trim() || !buyerContact.trim()) return;

                    setIsSubmitting(true);
                    try {
                      const response = await fetch("/api/orders", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          box_id: box.id,
                          product_id: selectedProduct.id,
                          quantity: orderQuantity,
                          buyer_name: buyerName.trim(),
                          buyer_contact: buyerContact.trim(),
                        }),
                      });

                      const resData = await response.json();
                      if (!response.ok) {
                        alert(resData.error || "Hubo un error al realizar el pedido");
                      } else {
                        setOrderSuccess(true);
                      }
                    } catch (error) {
                      console.error(error);
                      alert("Error de conexión");
                    } finally {
                      setIsSubmitting(false);
                    }
                  }} className="flex-1 overflow-y-auto pr-1 py-2 space-y-5 text-left">
                    {/* Product Summary */}
                    <div className="flex gap-4 p-3 rounded-2xl bg-white/[0.02] border border-white/5 items-center">
                      <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/10 flex-shrink-0 overflow-hidden flex items-center justify-center">
                        {selectedProduct.image_url ? (
                          <img src={selectedProduct.image_url} alt={selectedProduct.name} className="w-full h-full object-cover" />
                        ) : (
                          <ShoppingBag className="w-8 h-8 text-white/20" />
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/50">
                          {(() => {
                            const cat = (() => {
                              try {
                                if (selectedProduct.description && selectedProduct.description.startsWith('{')) {
                                  const parsed = JSON.parse(selectedProduct.description);
                                  return parsed.category || 'other';
                                }
                              } catch (e) {}
                              return 'other';
                            })();
                            return cat === "drinks" ? "Bebidas" : cat === "supplements" ? "Suplementos" : cat === "clothing" ? "Ropa" : "Otros";
                          })()}
                        </span>
                        <h4 className="font-bold text-white mt-1 text-sm">{selectedProduct.name}</h4>
                        <div className="flex gap-2 items-center mt-0.5">
                          <span className="text-sm font-black" style={{ color: primaryColor }}>
                            ${selectedProduct.price.toLocaleString("es-AR")}
                          </span>
                          <span className="text-[10px] text-white/40">• Stock: {selectedProduct.stock} disp.</span>
                        </div>
                      </div>
                    </div>

                    {selectedProduct.description && (
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Descripción</span>
                        <p className="text-xs text-white/60 leading-relaxed bg-white/[0.01] border border-white/[0.03] p-3 rounded-xl">
                          {(() => {
                            try {
                              if (selectedProduct.description && selectedProduct.description.startsWith('{')) {
                                const parsed = JSON.parse(selectedProduct.description);
                                return parsed.text || '';
                              }
                            } catch (e) {}
                            return selectedProduct.description || '';
                          })()}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      {/* Quantity Selector */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Cantidad</label>
                        <select
                          value={orderQuantity}
                          onChange={(e) => setOrderQuantity(Number(e.target.value))}
                          className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
                        >
                          {Array.from({ length: Math.min(10, selectedProduct.stock || 1) }, (_, i) => i + 1).map((n) => (
                            <option key={n} value={n}>
                              {n} unidad{n > 1 ? "es" : ""}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Total */}
                      <div className="space-y-1.5 flex flex-col justify-end text-right">
                        <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Total a pagar</span>
                        <span className="text-xl font-black" style={{ color: primaryColor }}>
                          ${(selectedProduct.price * orderQuantity).toLocaleString("es-AR")}
                        </span>
                      </div>
                    </div>

                    <hr className="border-white/5" />

                    {/* Buyer Information */}
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Tu Nombre y Apellido</label>
                        <input
                          type="text"
                          required
                          placeholder="Ej. Juan Pérez"
                          value={buyerName}
                          onChange={(e) => setBuyerName(e.target.value)}
                          className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Tu WhatsApp / Teléfono</label>
                        <input
                          type="tel"
                          required
                          placeholder="Ej. 11 1234 5678"
                          value={buyerContact}
                          onChange={(e) => setBuyerContact(e.target.value)}
                          className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting || selectedProduct.stock <= 0}
                      className="w-full font-black py-4 rounded-xl shadow-xl transition-all duration-300 text-sm flex items-center justify-center gap-2 text-white hover:scale-[1.01] mt-6"
                      style={{
                        backgroundColor: primaryColor,
                        boxShadow: `0 15px 30px -5px rgba(${primaryRgb}, 0.4)`
                      }}
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ShoppingCart className="w-4 h-4 shrink-0" />
                      )}
                      {selectedProduct.stock <= 0 ? "Agotado" : "Reservar para retirar"}
                    </button>
                  </form>
                ) : (
                  /* Main Product Grid View */
                  <div className="flex-1 flex flex-col min-h-0">
                    {/* Search & Category Filter */}
                    <div className="space-y-3 shrink-0 mb-4">
                      {/* Search Bar */}
                      <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                        <input
                          type="text"
                          placeholder="Buscar productos..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full bg-white/[0.03] border border-white/5 hover:border-white/15 focus:border-white/20 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-white/20 focus:outline-none transition-all"
                        />
                      </div>

                      {/* Category Pills */}
                      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                        {[
                          { key: "all", label: "Todos" },
                          { key: "drinks", label: "Bebidas" },
                          { key: "supplements", label: "Suplementos" },
                          { key: "clothing", label: "Ropa" },
                          { key: "other", label: "Cafetería / Gustitos" }
                        ].map((c) => (
                          <button
                            key={c.key}
                            onClick={() => setSelectedCategory(c.key)}
                            className="px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider shrink-0 transition-all"
                            style={{
                              backgroundColor: selectedCategory === c.key ? primaryColor : "rgba(255,255,255,0.02)",
                              borderColor: selectedCategory === c.key ? primaryColor : "rgba(255,255,255,0.05)",
                              color: selectedCategory === c.key ? "#fff" : "rgba(255,255,255,0.6)"
                            }}
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Product Catalog Grid */}
                    <div className="flex-1 overflow-y-auto pr-1">
                      {(() => {
                        const getCategory = (p: any) => {
                          try {
                            if (p.description && p.description.startsWith('{')) {
                              const parsed = JSON.parse(p.description);
                              return parsed.category || 'other';
                            }
                          } catch (e) {}
                          return 'other';
                        };

                        const getDescriptionText = (p: any) => {
                          try {
                            if (p.description && p.description.startsWith('{')) {
                              const parsed = JSON.parse(p.description);
                              return parsed.text || '';
                            }
                          } catch (e) {}
                          return p.description || '';
                        };

                        const filtered = products.filter((prod) => {
                          const matchesSearch = prod.name.toLowerCase().includes(searchTerm.toLowerCase());
                          const category = getCategory(prod);
                          const matchesCategory = selectedCategory === "all" || category === selectedCategory;
                          return matchesSearch && matchesCategory;
                        });

                        if (filtered.length === 0) {
                          return (
                            <div className="text-center py-12 bg-white/[0.01] rounded-2xl border border-white/[0.03] my-4">
                              <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-white/20" />
                              <p className="text-white/40 text-xs font-medium">No se encontraron productos.</p>
                            </div>
                          );
                        }

                        return (
                          <div className="grid grid-cols-2 gap-3 pb-4">
                            {filtered.map((prod) => (
                              <div
                                key={prod.id}
                                className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all flex flex-col justify-between group text-left"
                              >
                                <div>
                                  {/* Product image container */}
                                  <div className="aspect-square w-full rounded-xl bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center relative mb-2.5">
                                    {prod.image_url ? (
                                      <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                    ) : (
                                      <ShoppingBag className="w-8 h-8 text-white/10 group-hover:scale-110 transition-transform duration-300" />
                                    )}

                                    {/* Stock indicator badge */}
                                    <div className="absolute top-1.5 right-1.5">
                                      {prod.stock <= 0 ? (
                                        <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                                          Sin stock
                                        </span>
                                      ) : prod.stock <= 3 ? (
                                        <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                          Últimos {prod.stock}
                                        </span>
                                      ) : null}
                                    </div>
                                  </div>

                                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-white/30">
                                    {(() => {
                                      const cat = getCategory(prod);
                                      return cat === "drinks" ? "Bebidas" : cat === "supplements" ? "Suplementos" : cat === "clothing" ? "Ropa" : "Otros";
                                    })()}
                                  </span>
                                  <h4 className="font-bold text-white text-xs mt-0.5 line-clamp-1 group-hover:text-primary transition-colors">{prod.name}</h4>
                                  <p className="text-[10px] text-white/50 line-clamp-2 mt-1 leading-normal h-8">
                                    {getDescriptionText(prod)}
                                  </p>
                                </div>

                                <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between">
                                  <span className="font-black text-sm text-white">
                                    ${prod.price.toLocaleString("es-AR")}
                                  </span>
                                  <button
                                    onClick={() => setSelectedProduct(prod)}
                                    disabled={prod.stock <= 0}
                                    className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all disabled:opacity-30 disabled:pointer-events-none hover:scale-102"
                                    style={{
                                      backgroundColor: prod.stock <= 0 ? "rgba(255,255,255,0.05)" : primaryColor,
                                      color: "#fff"
                                    }}
                                  >
                                    Pedir
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {activeModal === "trial" && (
              <div className="flex flex-col h-full max-h-[85vh]">
                {/* Header */}
                <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-4 shrink-0">
                  <div className="p-2 rounded-xl" style={{ backgroundColor: `rgba(${primaryRgb}, 0.1)` }}>
                    <Dumbbell className="w-5 h-5" style={{ color: primaryColor }} />
                  </div>
                  <div className="text-left">
                    <h2 className="text-xl font-black text-white">Probar una clase gratis</h2>
                    <p className="text-xs text-white/40">Registrate para asistir a una clase de prueba en {box.name}</p>
                  </div>
                </div>

                {trialSuccess && trialCredentials ? (
                  /* Success View */
                  <div className="flex-1 overflow-y-auto pr-1 py-4 space-y-6 text-center text-left">
                    <div className="relative w-16 h-16 mx-auto">
                      <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-lg scale-125 animate-pulse" />
                      <div className="relative w-full h-full rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                        <Check className="w-8 h-8 text-emerald-400" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-lg font-black text-white">¡Clase de prueba reservada!</h3>
                      <p className="text-xs text-white/60 leading-relaxed max-w-sm mx-auto">
                        Te registramos como alumno y confirmamos tu turno de prueba para el día{" "}
                        <strong className="text-white">
                          {new Date(trialDate + "T00:00:00").toLocaleDateString("es-AR", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                          })}
                        </strong>.
                      </p>
                    </div>

                    {/* Acceso e info de inicio de sesión */}
                    <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4 max-w-sm mx-auto text-left relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-3 bg-white/5 text-[9px] font-black uppercase tracking-widest text-white/40 border-l border-b border-white/5">
                        Tus Datos
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-[10px] text-white/40 uppercase font-black tracking-wider">Tu Usuario / Email</p>
                        <p className="text-sm font-semibold text-white">{trialCredentials.email}</p>
                      </div>

                      <div className="space-y-1">
                        <p className="text-[10px] text-white/40 uppercase font-black tracking-wider">Tu Contraseña Temporal</p>
                        <div className="flex items-center justify-between gap-2 bg-black/40 border border-white/5 p-2 rounded-xl">
                          <code className="text-xs font-mono text-white/90 select-all">{trialCredentials.password}</code>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(trialCredentials.password);
                              setCopiedText(true);
                              setTimeout(() => setCopiedText(false), 2000);
                            }}
                            className="text-xs text-white/40 hover:text-white transition-colors"
                          >
                            {copiedText ? "Copiado" : "Copiar"}
                          </button>
                        </div>
                      </div>
                      
                      <p className="text-[10px] text-white/30 leading-normal">
                        Usá estas credenciales para iniciar sesión en tu panel o en la app y ver tus planificaciones físicas.
                      </p>
                    </div>

                    <div className="flex flex-col gap-3 max-w-sm mx-auto pt-4">
                      {box.phone && (
                        <a
                          href={`https://wa.me/${String(box.phone).replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                            `¡Hola! Acabo de registrarme para una clase de prueba el día ${trialDate} desde la web del Box. Mi nombre es ${trialFullName}.`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-black px-6 py-3.5 rounded-xl shadow-xl transition-all duration-300 text-sm flex items-center justify-center gap-2 text-white hover:scale-[1.02]"
                          style={{
                            backgroundColor: "#25D366",
                            boxShadow: "0 10px 20px -5px rgba(37, 211, 102, 0.4)"
                          }}
                        >
                          <MessageCircle className="w-4 h-4 shrink-0" />
                          Enviar WhatsApp para confirmar asistencia
                        </a>
                      )}
                      <button
                        onClick={() => {
                          setActiveModal(null);
                          // Reset states
                          setTrialSuccess(false);
                          setTrialCredentials(null);
                          setTrialFullName("");
                          setTrialEmail("");
                          setTrialPhone("");
                        }}
                        className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-bold px-6 py-3 rounded-xl transition-all text-xs w-full"
                      >
                        Entendido, volver
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Form View */
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!trialFullName.trim() || !trialEmail.trim() || !trialPhone.trim() || !trialDate || !selectedTrialSlotId) {
                        alert("Por favor completá todos los campos.");
                        return;
                      }

                      setTrialSubmitting(true);
                      try {
                        const response = await fetch(`/api/public/boxes/${box.id}/trial-booking`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            fullName: trialFullName.trim(),
                            email: trialEmail.trim(),
                            phone: trialPhone.trim(),
                            date: trialDate,
                            slotId: selectedTrialSlotId,
                          }),
                        });

                        const resData = await response.json();
                        if (!response.ok) {
                          alert(resData.error || "Hubo un error al reservar tu clase de prueba");
                        } else {
                          setTrialCredentials(resData.credentials);
                          setTrialSuccess(true);
                        }
                      } catch (error) {
                        console.error(error);
                        alert("Error de conexión");
                      } finally {
                        setTrialSubmitting(false);
                      }
                    }}
                    className="flex-1 overflow-y-auto pr-1 py-2 space-y-4 text-left"
                  >
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Tu Nombre y Apellido</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Juan Pérez"
                        value={trialFullName}
                        onChange={(e) => setTrialFullName(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Tu Correo Electrónico</label>
                        <input
                          type="email"
                          required
                          placeholder="Ej. juan@gmail.com"
                          value={trialEmail}
                          onChange={(e) => setTrialEmail(e.target.value)}
                          className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Tu WhatsApp / Teléfono</label>
                        <input
                          type="tel"
                          required
                          placeholder="Ej. 11 1234 5678"
                          value={trialPhone}
                          onChange={(e) => setTrialPhone(e.target.value)}
                          className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Fecha de la clase</label>
                        <input
                          type="date"
                          required
                          min={getTomorrowDateString()}
                          value={trialDate}
                          onChange={(e) => setTrialDate(e.target.value)}
                          className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/30"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Horario disponible</label>
                        {trialLoadingSlots ? (
                          <div className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white/40 flex items-center gap-2 h-[41px]">
                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                            Cargando horarios...
                          </div>
                        ) : trialSlots.length > 0 ? (
                          <select
                            value={selectedTrialSlotId}
                            onChange={(e) => setSelectedTrialSlotId(e.target.value)}
                            required
                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 h-[41px]"
                          >
                            <option value="">Seleccioná un horario</option>
                            {trialSlots.map((slot) => {
                              const spots = slot.spots_available;
                              const isFull = spots <= 0;
                              return (
                                <option key={slot.slot_id} value={slot.slot_id} disabled={isFull}>
                                  {slot.start_time.slice(0, 5)} - {slot.label} ({isFull ? "Sin cupo" : `${spots} libre${spots > 1 ? "s" : ""}`})
                                </option>
                              );
                            })}
                          </select>
                        ) : (
                          <div className="w-full bg-slate-950 border border-red-500/20 text-red-400 rounded-xl px-4 py-2 text-xs flex items-center justify-center text-center h-[41px]">
                            No hay turnos disponibles para esta fecha
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={trialSubmitting || !selectedTrialSlotId || trialSlots.length === 0}
                      className="w-full font-black py-4 rounded-xl shadow-xl transition-all duration-300 text-sm flex items-center justify-center gap-2 text-white hover:scale-[1.01] mt-6"
                      style={{
                        backgroundColor: primaryColor,
                        boxShadow: `0 15px 30px -5px rgba(${primaryRgb}, 0.4)`
                      }}
                    >
                      {trialSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Dumbbell className="w-4 h-4 shrink-0" />
                      )}
                      Reservar mi clase de prueba gratis
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
