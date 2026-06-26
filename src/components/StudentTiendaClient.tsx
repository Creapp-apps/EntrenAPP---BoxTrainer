"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  ShoppingBag, Search, Check, Loader2, ArrowLeft, 
  ShoppingCart, MessageCircle, AlertCircle, Calendar, Receipt, TrendingUp 
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  image_url: string | null;
  active: boolean;
}

interface Purchase {
  id: string;
  product_id: string;
  quantity: number;
  total_price: number;
  payment_method: string;
  status: "pendiente" | "completado" | "cancelado";
  created_at: string;
  box_products: {
    name: string;
    image_url: string | null;
  } | null;
}

interface StudentTiendaProps {
  products: Product[];
  purchases: Purchase[];
  box: {
    id: string;
    name: string;
    phone?: string;
  };
  profile: {
    id: string;
    name: string;
  };
}

const CATEGORIES = {
  all: "Todos",
  drinks: "Bebidas",
  supplements: "Suplementos",
  clothing: "Ropa",
  other: "Cafetería / Gustitos"
};

export default function StudentTiendaClient({ products, purchases: initialPurchases, box, profile }: StudentTiendaProps) {
  const [purchases, setPurchases] = useState<Purchase[]>(initialPurchases);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  // Calculate total pending balance (debts)
  const pendingPurchases = purchases.filter(p => p.status === "pendiente");
  const totalDebt = pendingPurchases.reduce((sum, p) => sum + Number(p.total_price), 0);

  const getCategory = (p: Product) => {
    try {
      if (p.description && p.description.startsWith("{")) {
        const parsed = JSON.parse(p.description);
        return parsed.category || "other";
      }
    } catch (e) {}
    return "other";
  };

  const getDescriptionText = (p: Product) => {
    try {
      if (p.description && p.description.startsWith("{")) {
        const parsed = JSON.parse(p.description);
        return parsed.text || "";
      }
    } catch (e) {}
    return p.description || "";
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          box_id: box.id,
          product_id: selectedProduct.id,
          quantity: orderQuantity,
        }),
      });

      const resData = await response.json();
      if (!response.ok) {
        alert(resData.error || "Hubo un error al realizar el pedido");
      } else {
        // Optimistically add to purchases list to avoid page reload
        const newPurchase: Purchase = {
          id: Math.random().toString(), // temp id
          product_id: selectedProduct.id,
          quantity: orderQuantity,
          total_price: selectedProduct.price * orderQuantity,
          payment_method: "otro",
          status: "pendiente",
          created_at: new Date().toISOString(),
          box_products: {
            name: selectedProduct.name,
            image_url: selectedProduct.image_url
          }
        };
        setPurchases([newPurchase, ...purchases]);
        setOrderSuccess(true);
      }
    } catch (error) {
      console.error(error);
      alert("Error de conexión");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 pb-24 relative overflow-hidden select-none">
      {/* Header */}
      <div className="bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-900 text-white px-6 pt-6 pb-16 relative overflow-hidden border-b border-white/5">
        {/* Glow ambient */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-[60px] -translate-y-1/3 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-64 h-24 bg-zinc-800/40 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/alumno" className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
              <ArrowLeft className="w-4 h-4 text-white" />
            </Link>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Tienda {box.name}</h1>
              <p className="text-xs text-white/60">Encargá y retirá en el mostrador</p>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-primary/20 border border-primary/20 text-primary">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-10 pb-8 relative z-20 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Catalog - Left & Center Column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Pending Debt Banner */}
          {totalDebt > 0 && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex gap-3 items-start animate-in fade-in slide-in-from-top-2 duration-300 shadow-sm">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-amber-800">Saldo pendiente de pago</h4>
                <p className="text-xs text-amber-700 leading-relaxed font-medium">
                  Tenés un saldo pendiente de <strong className="text-amber-950 font-black">${totalDebt.toLocaleString("es-AR")}</strong> por consumos de mostrador. Acercate a recepción en tu próxima clase para regularizarlo.
                </p>
              </div>
            </div>
          )}

          {/* Catalog Title & Filters */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
              <h3 className="font-extrabold text-slate-800 flex items-center gap-2 text-sm tracking-tight">
                <TrendingUp className="w-4 h-4 text-primary" /> Catálogo de Productos
              </h3>
              
              {/* Search Bar */}
              <div className="relative w-full sm:w-60">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-primary/50 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Category Pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {Object.entries(CATEGORIES).map(([key, label]) => {
                const isActive = selectedCategory === key;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedCategory(key)}
                    className={`px-3.5 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider shrink-0 transition-all shadow-sm ${
                      isActive
                        ? "bg-primary/10 border-primary/20 text-primary"
                        : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 hover:border-slate-300"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grid View of Catalog */}
          {(() => {
            const filtered = products.filter((prod) => {
              const matchesSearch = prod.name.toLowerCase().includes(searchTerm.toLowerCase());
              const cat = getCategory(prod);
              const matchesCategory = selectedCategory === "all" || cat === selectedCategory;
              return matchesSearch && matchesCategory;
            });

            if (filtered.length === 0) {
              return (
                <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
                  <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-slate-400 font-medium text-sm">No se encontraron productos disponibles.</p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {filtered.map((prod) => (
                  <div
                    key={prod.id}
                    className="bg-white border border-slate-200/60 hover:border-primary/20 hover:shadow-md p-3.5 rounded-3xl transition-all duration-300 flex flex-col justify-between group shadow-sm"
                  >
                    <div>
                      {/* Image container */}
                      <div className="aspect-square rounded-2xl bg-slate-50 border border-slate-100 overflow-hidden flex items-center justify-center relative mb-3">
                        {prod.image_url ? (
                          <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <ShoppingBag className="w-10 h-10 text-slate-300 group-hover:scale-110 transition-transform duration-300" />
                        )}

                        {/* Low stock badge */}
                        <div className="absolute top-2 right-2">
                          {prod.stock <= 0 ? (
                            <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-red-50 text-red-600 border border-red-100">
                              Sin stock
                            </span>
                          ) : prod.stock <= 3 ? (
                            <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 border border-amber-100">
                              Últimos {prod.stock}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">
                        {CATEGORIES[getCategory(prod) as keyof typeof CATEGORIES] || "Otros"}
                      </span>
                      <h4 className="font-bold text-slate-800 text-sm mt-0.5 line-clamp-1 group-hover:text-primary transition-colors">{prod.name}</h4>
                      <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-normal h-8 font-medium">
                        {getDescriptionText(prod)}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="font-black text-base text-slate-900">
                        ${prod.price.toLocaleString("es-AR")}
                      </span>
                      <button
                        onClick={() => {
                          setSelectedProduct(prod);
                          setOrderSuccess(false);
                          setOrderQuantity(1);
                        }}
                        disabled={prod.stock <= 0}
                        className="px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-30 disabled:pointer-events-none hover:scale-[1.02] bg-primary text-white hover:bg-primary/95 shadow-sm shadow-primary/10"
                      >
                        Encargar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>

        {/* Right Side: Purchases History & WhatsApp Help */}
        <div className="space-y-6">
          
          {/* WhatsApp Support Box */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm relative overflow-hidden">
            <div className="absolute top-[-10%] right-[-10%] w-24 h-24 bg-[#25D366]/5 rounded-full blur-2xl" />
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-2">
              <MessageCircle className="w-4 h-4 text-[#25D366]" /> ¿Consultas sobre productos?
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-4 font-medium">
              Si tenés dudas sobre stock, marcas de suplementos o querés encargar algo personalizado, podés chatear directo con nosotros.
            </p>
            {box.phone && (
              <a
                href={`https://wa.me/${String(box.phone).replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/20 hover:border-[#25D366]/40 text-[#25D366] py-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                Enviar Mensaje a Recepción
              </a>
            )}
          </div>

          {/* Purchase History */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-primary" /> Historial de Compras
            </h3>

            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              {purchases.length === 0 ? (
                <div className="text-center py-10 bg-slate-50/50 rounded-2xl border border-slate-100 border-dashed">
                  <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs text-slate-400 font-medium">Todavía no registrás compras.</p>
                </div>
              ) : (
                purchases.map((purchase) => (
                  <div 
                    key={purchase.id} 
                    className="p-3 rounded-2xl bg-slate-50/40 hover:bg-slate-50 border border-slate-200/40 hover:border-slate-200 flex gap-3 items-center justify-between transition-colors"
                  >
                    <div className="flex gap-3 items-center min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200/60 shrink-0 overflow-hidden flex items-center justify-center">
                        {purchase.box_products?.image_url ? (
                          <img src={purchase.box_products.image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <ShoppingBag className="w-5 h-5 text-slate-300" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-800 truncate">
                          {purchase.box_products?.name || "Producto eliminado"}
                        </h4>
                        <div className="flex gap-1.5 items-center text-[10px] text-slate-400 mt-0.5 font-medium">
                          <span>{purchase.quantity} ud{purchase.quantity > 1 ? "s" : ""}</span>
                          <span>•</span>
                          <span className="flex items-center gap-0.5 shrink-0">
                            <Calendar className="w-3 h-3 text-slate-300" />
                            {new Date(purchase.created_at).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex flex-col items-end gap-1">
                      <span className="font-extrabold text-xs text-slate-800">
                        ${purchase.total_price.toLocaleString("es-AR")}
                      </span>
                      <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${
                        purchase.status === "completado"
                          ? "bg-green-50 text-green-700 border-green-200/80"
                          : purchase.status === "pendiente"
                          ? "bg-amber-50 text-amber-700 border-amber-200/80 animate-pulse"
                          : "bg-slate-100 text-slate-500 border border-slate-200"
                      }`}>
                        {purchase.status === "completado" ? "Pagado" : purchase.status === "pendiente" ? "Deuda" : "Cancelado"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Order Modal Sheet */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            
            <button 
              onClick={() => {
                setSelectedProduct(null);
                setOrderSuccess(false);
              }}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {orderSuccess ? (
              <div className="text-center py-6 space-y-6">
                <div className="relative w-16 h-16 mx-auto">
                  <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-lg scale-125 animate-pulse" />
                  <div className="relative w-full h-full rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                    <Check className="w-8 h-8 text-emerald-500" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">¡Encargo realizado!</h3>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto font-medium">
                    Tu encargo fue registrado. Podés retirarlo y pagarlo en el mostrador del Box cuando vayas a entrenar.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-left">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-400">Producto:</span>
                    <span className="font-bold text-slate-800">{selectedProduct.name}</span>
                  </div>
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-400">Cantidad:</span>
                    <span className="font-bold text-slate-800">{orderQuantity} unidad{orderQuantity > 1 ? "es" : ""}</span>
                  </div>
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-400">Total:</span>
                    <span className="font-black text-primary">${(selectedProduct.price * orderQuantity).toLocaleString("es-AR")}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  {box.phone && (
                    <a
                      href={`https://wa.me/${String(box.phone).replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                        `Hola! Acabo de encargar ${orderQuantity}x ${selectedProduct.name} desde la app. Mi nombre es ${profile.name}.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-[#25D366] text-white hover:bg-emerald-600 py-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Avisar por WhatsApp
                    </a>
                  )}
                  <button
                    onClick={() => {
                      setSelectedProduct(null);
                      setOrderSuccess(false);
                    }}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-2xl text-xs font-bold transition-all border border-slate-200/50"
                  >
                    Cerrar y seguir viendo
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handlePlaceOrder} className="space-y-5 text-left">
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">Confirmar Encargo</h3>
                  <p className="text-xs text-slate-400">Se agregará a tus consumos mostrador</p>
                </div>

                <div className="flex gap-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 items-center">
                  <div className="w-14 h-14 rounded-xl bg-white border border-slate-200/60 shrink-0 overflow-hidden flex items-center justify-center">
                    {selectedProduct.image_url ? (
                      <img src={selectedProduct.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <ShoppingBag className="w-6 h-6 text-slate-300" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">{selectedProduct.name}</h4>
                    <span className="text-xs font-black text-primary mt-0.5 block">
                      ${selectedProduct.price.toLocaleString("es-AR")}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-200/60">
                  <span className="text-xs text-slate-400">Cantidad:</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={orderQuantity <= 1}
                      onClick={() => setOrderQuantity(orderQuantity - 1)}
                      className="w-8 h-8 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-30"
                    >
                      -
                    </button>
                    <span className="text-sm font-black text-slate-900 min-w-[20px] text-center">{orderQuantity}</span>
                    <button
                      type="button"
                      disabled={orderQuantity >= selectedProduct.stock}
                      onClick={() => setOrderQuantity(orderQuantity + 1)}
                      className="w-8 h-8 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-30"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 font-medium">
                  <span className="text-xs text-slate-400">Total estimado:</span>
                  <span className="text-xl font-black text-slate-900">
                    ${(selectedProduct.price * orderQuantity).toLocaleString("es-AR")}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-primary hover:bg-primary/90 text-white font-black py-4 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 text-sm"
                >
                  {isSubmitting ? (
                     <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShoppingCart className="w-4 h-4" />
                  )}
                  Encargar ahora
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
