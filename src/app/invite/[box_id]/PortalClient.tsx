"use client";

import { useState } from "react";
import { 
  ShoppingBag, 
  Calendar, 
  Ticket, 
  X, 
  Plus, 
  Minus, 
  ChevronRight, 
  Dumbbell, 
  Check, 
  Loader2, 
  ShieldCheck,
  Clock,
  Sparkles,
  ChevronDown
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  image_url: string;
};

type Plan = {
  id: string;
  name: string;
  modality: string;
  sessions_per_week: number;
  billing_weeks: number;
  price: number;
  total_credits: number;
  allowed_activities: string[];
  description?: string;
};

type ScheduleSlot = {
  id: string;
  label: string;
  start_time: string;
  end_time: string;
  day_of_week: number;
  activity?: {
    name: string;
    color: string;
  };
};

type PortalClientProps = {
  boxId: string;
  boxName: string;
  products: Product[];
  plans: Plan[];
  slots: ScheduleSlot[];
  logoUrl?: string;
  theme?: string;
};

const DAY_NAMES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

// Mapeo de colores y clases Tailwind según el tema del Box
const THEME_COLORS = {
  default: { hex: "#f97316", text: "text-orange-500", bg: "bg-orange-600", hover: "hover:bg-orange-500", shadow: "shadow-orange-600/10", border: "border-orange-500/20", glow: "from-orange-600 to-amber-500" },
  ocean: { hex: "#0080ff", text: "text-blue-500", bg: "bg-blue-600", hover: "hover:bg-blue-500", shadow: "shadow-blue-600/10", border: "border-blue-500/20", glow: "from-blue-600 to-cyan-500" },
  emerald: { hex: "#10b981", text: "text-emerald-500", bg: "bg-emerald-600", hover: "hover:bg-emerald-500", shadow: "shadow-emerald-600/10", border: "border-emerald-500/20", glow: "from-emerald-600 to-teal-500" },
  violet: { hex: "#8b5cf6", text: "text-violet-500", bg: "bg-violet-600", hover: "hover:bg-violet-500", shadow: "shadow-violet-600/10", border: "border-violet-500/20", glow: "from-violet-600 to-fuchsia-500" },
  rose: { hex: "#e11d48", text: "text-rose-500", bg: "bg-rose-600", hover: "hover:bg-rose-500", shadow: "shadow-rose-600/10", border: "border-rose-500/20", glow: "from-rose-600 to-pink-500" },
  crimson: { hex: "#dc2626", text: "text-red-500", bg: "bg-red-600", hover: "hover:bg-red-500", shadow: "shadow-red-600/10", border: "border-red-500/20", glow: "from-red-600 to-rose-500" },
  amber: { hex: "#f59e0b", text: "text-amber-500", bg: "bg-amber-600", hover: "hover:bg-amber-500", shadow: "shadow-amber-600/10", border: "border-amber-500/20", glow: "from-amber-600 to-yellow-500" },
};

export default function PortalClient({ boxId, boxName, products, plans, slots, logoUrl, theme = "default" }: PortalClientProps) {
  const [activeDrawer, setActiveDrawer] = useState<"store" | "schedule" | "plans" | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [preOrderStep, setPreOrderStep] = useState<"catalog" | "form" | "success">("catalog");
  const [buyerName, setBuyerName] = useState("");
  const [buyerContact, setBuyerContact] = useState("");
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // Estados para controlar acordeones de actividades desplegables
  const [expandedScheduleActivity, setExpandedScheduleActivity] = useState<string | null>(null);
  const [expandedPlansCategory, setExpandedPlansCategory] = useState<string | null>(null);

  // Obtener la configuración del tema del Tenant
  const brand = THEME_COLORS[theme as keyof typeof THEME_COLORS] || THEME_COLORS.default;

  // Contadores de carrito
  const totalItems = Object.values(cart).reduce((sum, q) => sum + q, 0);
  const cartProducts = products.filter(p => (cart[p.id] || 0) > 0);
  const cartTotal = cartProducts.reduce((sum, p) => sum + p.price * cart[p.id], 0);

  function addToCart(productId: string) {
    setCart(prev => ({ ...prev, [productId]: (prev[productId] || 0) + 1 }));
    toast.success("Producto agregado al carrito");
  }

  function removeFromCart(productId: string) {
    setCart(prev => {
      const updated = { ...prev };
      if (updated[productId] > 1) {
        updated[productId] -= 1;
      } else {
        delete updated[productId];
      }
      return updated;
    });
  }

  async function handlePlaceOrder() {
    if (!buyerName.trim() || !buyerContact.trim()) {
      toast.error("Completá tu nombre y contacto (Celular / WhatsApp)");
      return;
    }

    setSubmittingOrder(true);
    try {
      const keys = Object.keys(cart);
      for (const prodId of keys) {
        const qty = cart[prodId];
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            box_id: boxId,
            product_id: prodId,
            quantity: qty,
            buyer_name: buyerName,
            buyer_contact: buyerContact
          })
        });

        if (!res.ok) {
          throw new Error("Error en la orden");
        }
      }

      setPreOrderStep("success");
      setCart({});
      toast.success("¡Pedido registrado exitosamente!");
    } catch (err) {
      toast.error("Ocurrió un error al procesar tu pedido");
    } finally {
      setSubmittingOrder(false);
    }
  }

  // ─── AGRUPAR HORARIOS POR ACTIVIDAD ──────────────────────────────────────
  const scheduleByActivity: Record<string, Record<number, ScheduleSlot[]>> = {};
  slots.forEach(slot => {
    const actName = slot.activity?.name || "Turnos Generales";
    if (!scheduleByActivity[actName]) {
      scheduleByActivity[actName] = {};
    }
    const day = slot.day_of_week; // 1 to 7
    if (!scheduleByActivity[actName][day]) {
      scheduleByActivity[actName][day] = [];
    }
    scheduleByActivity[actName][day].push(slot);
  });

  // Ordenar los slots dentro de cada día
  Object.keys(scheduleByActivity).forEach(act => {
    Object.keys(scheduleByActivity[act]).forEach(dayKey => {
      const day = Number(dayKey);
      scheduleByActivity[act][day].sort((a, b) => a.start_time.localeCompare(b.start_time));
    });
  });

  const uniqueScheduleActivities = Object.keys(scheduleByActivity);

  // ─── AGRUPAR PLANES POR ACTIVIDAD ────────────────────────────────────────
  const plansByCategory: Record<string, Plan[]> = {};
  plans.forEach(plan => {
    if (!plan.allowed_activities || plan.allowed_activities.length === 0) {
      const cat = "Acceso General";
      plansByCategory[cat] = plansByCategory[cat] || [];
      plansByCategory[cat].push(plan);
    } else if (plan.allowed_activities.length > 1) {
      const cat = "Pase Multi-actividad";
      plansByCategory[cat] = plansByCategory[cat] || [];
      plansByCategory[cat].push(plan);
    } else {
      const cat = plan.allowed_activities[0];
      plansByCategory[cat] = plansByCategory[cat] || [];
      plansByCategory[cat].push(plan);
    }
  });

  const uniquePlansCategories = Object.keys(plansByCategory);

  return (
    <div className="min-h-screen bg-[#070709] text-zinc-100 flex flex-col justify-between overflow-x-hidden relative select-none">
      
      {/* Inyectamos estilos directamente de forma segura con dangerouslySetInnerHTML para evitar conflictos de styled-jsx */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulse-neon-purple {
          0%, 100% { box-shadow: 0 0 10px rgba(167, 139, 250, 0.4), 0 0 3px rgba(167, 139, 250, 0.2); }
          50% { box-shadow: 0 0 25px rgba(167, 139, 250, 0.9), 0 0 12px rgba(167, 139, 250, 0.5); }
        }
        @keyframes pulse-neon-blue {
          0%, 100% { box-shadow: 0 0 10px rgba(59, 130, 246, 0.4), 0 0 3px rgba(59, 130, 246, 0.2); }
          50% { box-shadow: 0 0 25px rgba(59, 130, 246, 0.9), 0 0 12px rgba(59, 130, 246, 0.5); }
        }
        @keyframes pulse-neon-emerald {
          0%, 100% { box-shadow: 0 0 10px rgba(16, 185, 129, 0.4), 0 0 3px rgba(16, 185, 129, 0.2); }
          50% { box-shadow: 0 0 25px rgba(16, 185, 129, 0.9), 0 0 12px rgba(16, 185, 129, 0.5); }
        }
        .anim-purple {
          animation: pulse-neon-purple 2s infinite;
        }
        .anim-blue {
          animation: pulse-neon-blue 2s infinite;
        }
        .anim-emerald {
          animation: pulse-neon-emerald 2s infinite;
        }
      ` }} />

      {/* Fondo de malla de neón premium con luces que combinan dinámicamente con el color del Tenant */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:32px_32px] opacity-20 pointer-events-none" />
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-[120px] pointer-events-none opacity-20 transition-all duration-500" style={{ backgroundColor: brand.hex }} />
      <div className="absolute bottom-10 left-10 w-[300px] h-[300px] rounded-full blur-[100px] pointer-events-none opacity-10 transition-all duration-500" style={{ backgroundColor: brand.hex }} />

      {/* ─── HEADER PREMIUM PERSONALIZADO CON LOGO DEL TENANT ───────────────── */}
      <header className="max-w-7xl mx-auto w-full px-6 pt-12 pb-6 flex items-center justify-between z-10 relative">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-zinc-950/80 border border-zinc-800 flex items-center justify-center shadow-lg shadow-black/40">
              <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${brand.glow} flex items-center justify-center shadow-lg shadow-black/40`}>
              <span className="text-white font-black text-sm">{boxName.charAt(0).toUpperCase()}</span>
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold tracking-wider uppercase text-zinc-200">
              {boxName}
            </h1>
            <p className="text-[10px] tracking-[0.2em] uppercase text-zinc-500 font-bold">
              Portal Oficial Interactivo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/auth/login"
            className="text-xs px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950/40 hover:bg-zinc-900 text-zinc-300 font-medium transition"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/auth/signup"
            className={`text-xs px-4 py-2.5 rounded-xl ${brand.bg} ${brand.hover} text-white font-semibold transition shadow-md ${brand.shadow}`}
          >
            Unirse al Box
          </Link>
        </div>
      </header>

      {/* ─── VISTA PRINCIPAL CON BLUEPRINT DE GIMNASIO 3D ─── */}
      <main className="max-w-7xl mx-auto w-full px-6 flex-1 flex flex-col items-center justify-center py-6 z-10 relative">
        
        {/* Banner de Bienvenida */}
        <div className="text-center max-w-2xl mb-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] font-bold text-zinc-400 mb-4 tracking-wider uppercase">
            <Sparkles className={`w-3.5 h-3.5 ${brand.text} animate-pulse`} /> Maqueta Digital 3D en Vivo
          </span>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white uppercase leading-none">
            TU BOX EN OTRA DIMENSIÓN
          </h2>
          <p className="text-zinc-400 text-xs mt-3 leading-relaxed max-w-lg mx-auto">
            Explorá la maqueta 3D hiperrealista de tu gimnasio en tiempo real. Hacé clic en los hotspots interactivos para comprar suplementos en recepción, anotarte a clases o ver membresías.
          </p>
        </div>

        {/* ─── MAQUETA 3D HIperREALISTA CON HOTSPOTS DING ─── */}
        <div className="w-full max-w-3xl bg-zinc-950/90 rounded-3xl border border-zinc-800/80 p-1.5 shadow-2xl relative overflow-hidden flex items-center justify-center aspect-square md:aspect-video">
          
          <img 
            src={
              boxName.toLowerCase().includes("vuur")
                ? "/assets/vuur-massive-render.png"
                : boxName.toLowerCase().includes("wolfpack")
                ? "/assets/wolfpack-massive-render.png"
                : "/images/gym_isometric_render.png"
            } 
            alt="Maqueta 3D Box" 
            className="w-full h-full object-cover rounded-[22px] select-none"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/40 via-transparent to-zinc-950/20 pointer-events-none rounded-[22px]" />

          {/* ─── CAPA DE HOTSPOTS INTERACTIVOS COMPLETAMENTE RESPONSIVE ─── */}
          <div className="absolute inset-0 z-10">
            
            {/* Hotspot 1: Recepción / Tienda (🛒) */}
            <div className="absolute top-[52%] left-[16%] -translate-x-1/2 -translate-y-1/2 group">
              <button 
                onClick={() => { setActiveDrawer("store"); setPreOrderStep("catalog"); }}
                className="relative flex items-center justify-center w-11 h-11 rounded-full bg-purple-600 text-white font-bold transition-all duration-300 hover:scale-110 shadow-lg shadow-purple-600/30 hover:shadow-purple-600/60 anim-purple"
              >
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-40" />
                <ShoppingBag className="w-4.5 h-4.5 relative z-10" />
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 bg-zinc-950/95 text-white text-[10px] font-bold border border-purple-500/30 rounded-xl px-3 py-2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none uppercase tracking-wider flex items-center gap-1.5 shadow-2xl">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                Recepción & Suplementos
              </div>
            </div>

            {/* Hotspot 2: Pista de WOD / Horarios (🏋️‍♂️) */}
            <div className="absolute top-[65%] left-[56%] -translate-x-1/2 -translate-y-1/2 group">
              <button 
                onClick={() => setActiveDrawer("schedule")}
                className="relative flex items-center justify-center w-13 h-13 rounded-full bg-blue-600 text-white font-bold transition-all duration-300 hover:scale-110 shadow-lg shadow-blue-600/30 hover:shadow-blue-600/60 anim-blue"
              >
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-40" />
                <Calendar className="w-5.5 h-5.5 relative z-10" />
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 bg-zinc-950/95 text-white text-[10px] font-bold border border-blue-500/30 rounded-xl px-3 py-2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none uppercase tracking-wider flex items-center gap-1.5 shadow-2xl">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                Clases & Pista de WOD
              </div>
            </div>

            {/* Hotspot 3: Sala de Yoga / Planes (🏢) */}
            <div className="absolute top-[48%] left-[84%] -translate-x-1/2 -translate-y-1/2 group">
              <button 
                onClick={() => setActiveDrawer("plans")}
                className="relative flex items-center justify-center w-11 h-11 rounded-full bg-emerald-600 text-white font-bold transition-all duration-300 hover:scale-110 shadow-lg shadow-emerald-600/30 hover:shadow-emerald-600/60 anim-emerald"
              >
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-40" />
                <Ticket className="w-4.5 h-4.5 relative z-10" />
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 bg-zinc-950/95 text-white text-[10px] font-bold border border-emerald-500/30 rounded-xl px-3 py-2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none uppercase tracking-wider flex items-center gap-1.5 shadow-2xl">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Membresías & Salón Yoga
              </div>
            </div>

          </div>
        </div>

        {/* CTAs rápidas bajo el plano */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 w-full max-w-3xl">
          <button 
            onClick={() => { setActiveDrawer("store"); setPreOrderStep("catalog"); }}
            className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-900 rounded-2xl hover:border-purple-600/40 hover:bg-zinc-900/35 transition group text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Ver Tienda</p>
                <p className="text-sm font-semibold text-zinc-100">{products.length} Productos</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:translate-x-1 transition-transform" />
          </button>

          <button 
            onClick={() => setActiveDrawer("schedule")}
            className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-900 rounded-2xl hover:border-blue-600/40 hover:bg-zinc-900/35 transition group text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Ver Horarios</p>
                <p className="text-sm font-semibold text-zinc-100">Actividades Semanales</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:translate-x-1 transition-transform" />
          </button>

          <button 
            onClick={() => setActiveDrawer("plans")}
            className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-900 rounded-2xl hover:border-emerald-600/40 hover:bg-zinc-900/35 transition group text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Ticket className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Membresías</p>
                <p className="text-sm font-semibold text-zinc-100">{plans.length} Planes Disponibles</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

      </main>

      {/* ─── FOOTER ──────────────────────────────────────── */}
      <footer className="max-w-7xl mx-auto w-full px-6 py-8 flex flex-col sm:flex-row items-center justify-between border-t border-zinc-900/80 z-10 relative">
        <p className="text-zinc-600 text-xs font-semibold tracking-wider">
          © {new Date().getFullYear()} {boxName} · Todos los derechos reservados
        </p>
        <p className="text-zinc-700 text-[10px] font-bold tracking-[0.25em] uppercase mt-4 sm:mt-0">
          POWERED BY ENTRENAPP
        </p>
      </footer>

      {/* ─── DRAWER / SLIDE-OVER CON GLASSMORPHISM ────────── */}
      {activeDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div 
            onClick={() => setActiveDrawer(null)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
          />

          {/* Panel Container */}
          <div className="relative w-full max-w-lg h-full bg-zinc-950/85 backdrop-blur-2xl border-l border-zinc-900 shadow-2xl flex flex-col justify-between overflow-hidden">
            
            {/* Drawer Header */}
            <div className="p-6 border-b border-zinc-900/80 flex items-center justify-between bg-zinc-950/20">
              <div className="flex items-center gap-2">
                {activeDrawer === "store" && <ShoppingBag className="w-5 h-5 text-purple-400" />}
                {activeDrawer === "schedule" && <Calendar className="w-5 h-5 text-blue-400" />}
                {activeDrawer === "plans" && <Ticket className="w-5 h-5 text-emerald-400" />}
                <h3 className="font-bold text-lg text-white uppercase tracking-wider">
                  {activeDrawer === "store" && "Tienda & Suplementos"}
                  {activeDrawer === "schedule" && "Horarios por Actividad"}
                  {activeDrawer === "plans" && "Planes por Actividad"}
                </h3>
              </div>
              <button 
                onClick={() => setActiveDrawer(null)}
                className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">

              {/* ─── CONTENIDO: TIENDA (STORE) ────────────────── */}
              {activeDrawer === "store" && (
                <>
                  {preOrderStep === "catalog" && (
                    <div className="space-y-4">
                      <p className="text-zinc-400 text-xs leading-relaxed">
                        Explorá nuestros productos de nutrición, bebidas y accesorios. Podés armar tu pedido y retirarlo al instante en el mostrador del Box.
                      </p>

                      {products.length > 0 ? (
                        <div className="space-y-3">
                          {products.map(p => {
                            const count = cart[p.id] || 0;
                            return (
                              <div key={p.id} className="p-4 bg-zinc-900/30 border border-zinc-900 rounded-2xl flex items-center gap-4 hover:border-zinc-800 transition">
                                {p.image_url ? (
                                  <img src={p.image_url} alt={p.name} className="w-16 h-16 rounded-xl object-cover border border-zinc-800" />
                                ) : (
                                  <div className="w-16 h-16 rounded-xl bg-zinc-900 flex items-center justify-center border border-zinc-800 text-zinc-500 font-black">
                                    BOX
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-bold text-sm text-white truncate">{p.name}</h4>
                                  <p className="text-xs text-zinc-500 line-clamp-1">{p.description}</p>
                                  <p className="text-sm font-semibold text-purple-400 mt-1">${p.price.toLocaleString()}</p>
                                </div>
                                <div className="shrink-0 flex items-center gap-2">
                                  {count > 0 ? (
                                    <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-xl p-1">
                                      <button onClick={() => removeFromCart(p.id)} className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition">
                                        <Minus className="w-3.5 h-3.5" />
                                      </button>
                                      <span className="px-2.5 text-xs font-bold text-white">{count}</span>
                                      <button onClick={() => addToCart(p.id)} className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition">
                                        <Plus className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ) : (
                                    <button 
                                      onClick={() => addToCart(p.id)}
                                      className="p-2 rounded-xl bg-purple-600/10 border border-purple-600/20 text-purple-400 hover:bg-purple-600 hover:text-white transition font-medium text-xs"
                                    >
                                      Agregar
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-zinc-500 text-sm text-center py-12">No hay productos cargados actualmente.</p>
                      )}
                    </div>
                  )}

                  {preOrderStep === "form" && (
                    <div className="space-y-4">
                      <div className="p-4 bg-purple-600/5 border border-purple-600/15 rounded-2xl">
                        <h4 className="font-bold text-xs text-purple-400 uppercase tracking-wider mb-2">Resumen de tu pedido</h4>
                        {cartProducts.map(p => (
                          <div key={p.id} className="flex justify-between items-center text-xs text-zinc-300 py-1">
                            <span>{p.name} <strong className="text-purple-400">x{cart[p.id]}</strong></span>
                            <span className="font-semibold">${(p.price * cart[p.id]).toLocaleString()}</span>
                          </div>
                        ))}
                        <div className="border-t border-zinc-900 mt-3 pt-3 flex justify-between items-center text-sm font-bold text-white">
                          <span>Total</span>
                          <span>${cartTotal.toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="space-y-3 pt-2">
                        <h4 className="font-bold text-xs text-zinc-300 uppercase tracking-wider">Tus datos para retirar en el Box</h4>
                        <div>
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Nombre y Apellido</label>
                          <input 
                            type="text" 
                            value={buyerName} 
                            onChange={e => setBuyerName(e.target.value)}
                            placeholder="Ej: Juan Pérez" 
                            className="w-full px-4 py-3 rounded-xl border border-zinc-800 bg-zinc-950/40 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500" 
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Número de WhatsApp</label>
                          <input 
                            type="text" 
                            value={buyerContact} 
                            onChange={e => setBuyerContact(e.target.value)}
                            placeholder="Ej: +54 9 11 1234 5678" 
                            className="w-full px-4 py-3 rounded-xl border border-zinc-800 bg-zinc-950/40 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500" 
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {preOrderStep === "success" && (
                    <div className="text-center py-12 space-y-4">
                      <div className="w-16 h-16 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                        <ShieldCheck className="w-8 h-8" />
                      </div>
                      <h4 className="font-bold text-lg text-white">¡Pedido Registrado con Éxito!</h4>
                      <p className="text-zinc-400 text-xs max-w-xs mx-auto leading-relaxed">
                        Tu solicitud de reserva está en la bandeja del entrenador del Box. Acercate a la recepción, da tu nombre e indicales que tenés un pedido de suplementos listo para retirar. ¡Buen entrenamiento! 💪
                      </p>
                      <button 
                        onClick={() => { setPreOrderStep("catalog"); setActiveDrawer(null); }}
                        className="px-6 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 font-semibold hover:bg-zinc-800 text-xs transition"
                      >
                        Entendido
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* ─── CONTENIDO: ACORDEÓN DE HORARIOS POR ACTIVIDAD ─── */}
              {activeDrawer === "schedule" && (
                <div className="space-y-4">
                  <p className="text-zinc-400 text-xs leading-relaxed mb-4">
                    Seleccioná una actividad para desplegar todos sus días y horarios de entrenamiento disponibles en el Box.
                  </p>

                  {uniqueScheduleActivities.length > 0 ? (
                    <div className="space-y-3">
                      {uniqueScheduleActivities.map(actName => {
                        const isExpanded = expandedScheduleActivity === actName;
                        const dayGroup = scheduleByActivity[actName];
                        const totalSlots = Object.values(dayGroup).reduce((sum, list) => sum + list.length, 0);

                        return (
                          <div 
                            key={actName} 
                            className="bg-zinc-900/30 border border-zinc-900 rounded-2xl overflow-hidden transition-all duration-300 hover:border-blue-600/30"
                          >
                            {/* Cabecera del acordeón */}
                            <button
                              onClick={() => setExpandedScheduleActivity(isExpanded ? null : actName)}
                              className="w-full p-4 flex items-center justify-between text-left focus:outline-none"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                                  <Clock className="w-5 h-5 text-blue-400" />
                                </div>
                                <div>
                                  <h4 className="font-bold text-sm text-white uppercase tracking-wider">{actName}</h4>
                                  <p className="text-xs text-zinc-500 font-medium">
                                    {totalSlots} {totalSlots === 1 ? "turno semanal" : "turnos semanales"}
                                  </p>
                                </div>
                              </div>
                              <div className="p-1.5 rounded-lg bg-zinc-950 border border-zinc-900 text-zinc-400">
                                {isExpanded ? <ChevronDown className="w-4 h-4 text-blue-400 rotate-180 transition-transform duration-300" /> : <ChevronRight className="w-4 h-4 transition-transform duration-300" />}
                              </div>
                            </button>

                            {/* Despliegue de Horarios (Body) */}
                            {isExpanded && (
                              <div className="px-4 pb-4 pt-2 border-t border-zinc-900 bg-zinc-950/20 space-y-4">
                                {[1, 2, 3, 4, 5, 6, 7].map(dayNum => {
                                  const daySlots = dayGroup[dayNum] || [];
                                  if (daySlots.length === 0) return null;

                                  return (
                                    <div key={dayNum} className="space-y-2">
                                      <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block border-b border-zinc-900/60 pb-1">
                                        {DAY_NAMES[dayNum - 1]}
                                      </span>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {daySlots.map(slot => (
                                          <div 
                                            key={slot.id} 
                                            className="p-3 bg-zinc-900/20 border border-zinc-900/50 rounded-xl flex items-center justify-between text-xs"
                                          >
                                            <span className="font-semibold text-zinc-200">
                                              {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                                            </span>
                                            {slot.label && (
                                              <span className="text-[10px] text-zinc-500 font-medium truncate max-w-[100px]">
                                                {slot.label}
                                              </span>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-zinc-500 text-sm">
                      No hay horarios cargados actualmente en este Box.
                    </div>
                  )}
                </div>
              )}

              {/* ─── CONTENIDO: ACORDEÓN DE PLANES POR ACTIVIDAD ──── */}
              {activeDrawer === "plans" && (
                <div className="space-y-4">
                  <p className="text-zinc-400 text-xs leading-relaxed mb-4">
                    Seleccioná una actividad para desplegar todas las membresías, abonos y opciones de pases disponibles para vos.
                  </p>

                  {uniquePlansCategories.length > 0 ? (
                    <div className="space-y-3">
                      {uniquePlansCategories.map(catName => {
                        const isExpanded = expandedPlansCategory === catName;
                        const catPlans = plansByCategory[catName];

                        return (
                          <div 
                            key={catName} 
                            className="bg-zinc-900/30 border border-zinc-900 rounded-2xl overflow-hidden transition-all duration-300 hover:border-emerald-600/30"
                          >
                            {/* Cabecera del acordeón */}
                            <button
                              onClick={() => setExpandedPlansCategory(isExpanded ? null : catName)}
                              className="w-full p-4 flex items-center justify-between text-left focus:outline-none"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                                  <Ticket className="w-5 h-5 text-emerald-400" />
                                </div>
                                <div>
                                  <h4 className="font-bold text-sm text-white uppercase tracking-wider">{catName}</h4>
                                  <p className="text-xs text-zinc-500 font-medium">
                                    {catPlans.length} {catPlans.length === 1 ? "membresía disponible" : "membresías disponibles"}
                                  </p>
                                </div>
                              </div>
                              <div className="p-1.5 rounded-lg bg-zinc-950 border border-zinc-900 text-zinc-400">
                                {isExpanded ? <ChevronDown className="w-4 h-4 text-emerald-400 rotate-180 transition-transform duration-300" /> : <ChevronRight className="w-4 h-4 transition-transform duration-300" />}
                              </div>
                            </button>

                            {/* Despliegue de Planes (Body) */}
                            {isExpanded && (
                              <div className="px-4 pb-4 pt-2 border-t border-zinc-900 bg-zinc-950/20 space-y-3">
                                {catPlans.map(p => (
                                  <div 
                                    key={p.id} 
                                    className="p-4 bg-zinc-900/30 border border-zinc-900 rounded-xl hover:border-emerald-600/20 transition relative overflow-hidden group"
                                  >
                                    <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider absolute top-4 right-4">
                                      {p.modality === "presencial" ? "Presencial" : p.modality === "mixto" ? "Mixto" : "A Distancia"}
                                    </span>

                                    <h5 className="font-bold text-xs text-white uppercase tracking-wider pr-16">{p.name}</h5>
                                    <p className="text-[11px] text-zinc-500 mt-1">
                                      {p.sessions_per_week} clases por semana · Créditos: <strong>{p.total_credits}</strong>
                                    </p>
                                    {p.description && (
                                      <p className="text-xs text-zinc-400 mt-2 leading-relaxed bg-zinc-950/40 p-2.5 rounded-xl border border-zinc-900/50 italic">
                                        "{p.description}"
                                      </p>
                                    )}

                                    <div className="flex items-end justify-between mt-4 pt-2 border-t border-zinc-900/50">
                                      <div>
                                        <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Duración</p>
                                        <p className="text-xs font-semibold text-zinc-300">{p.billing_weeks} Semanas</p>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Precio</p>
                                        <p className="text-sm font-black text-emerald-400">${p.price.toLocaleString()}</p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-zinc-500 text-sm">
                      No hay planes ni abonos configurados actualmente en este Box.
                    </div>
                  )}

                  {/* Registrar CTA */}
                  <div className="pt-2">
                    <Link
                      href="/auth/signup"
                      className={`w-full flex items-center justify-center gap-2 ${brand.bg} ${brand.hover} text-white font-semibold py-3 px-4 rounded-xl transition shadow-lg ${brand.shadow} text-sm`}
                    >
                      Comenzar ahora
                    </Link>
                  </div>
                </div>
              )}

            </div>

            {/* Drawer Footer (Solo para Tienda) */}
            {activeDrawer === "store" && products.length > 0 && preOrderStep !== "success" && (
              <div className="p-6 border-t border-zinc-900/80 bg-zinc-950/40">
                {preOrderStep === "catalog" ? (
                  <button 
                    disabled={totalItems === 0}
                    onClick={() => setPreOrderStep("form")}
                    className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold py-3.5 px-4 rounded-2xl transition disabled:opacity-40 disabled:pointer-events-none text-sm"
                  >
                    Confirmar Carrito ({totalItems} items)
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button 
                      disabled={submittingOrder}
                      onClick={handlePlaceOrder}
                      className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold py-3.5 px-4 rounded-2xl transition disabled:opacity-50 text-sm"
                    >
                      {submittingOrder ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Procesando...
                        </>
                      ) : (
                        "Registrar Pedido de Reserva"
                      )}
                    </button>
                    <button 
                      disabled={submittingOrder}
                      onClick={() => setPreOrderStep("catalog")}
                      className="px-4 py-3.5 rounded-2xl text-sm font-semibold text-zinc-400 hover:bg-zinc-900 transition"
                    >
                      Atrás
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
