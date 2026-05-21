"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { 
  ShoppingBag, 
  History, 
  Plus, 
  Minus, 
  Check, 
  Loader2, 
  Trash2, 
  AlertTriangle,
  Receipt,
  Sparkles
} from "lucide-react";

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  image_url: string;
};

type OrderHistory = {
  id: string;
  quantity: number;
  total_price: number;
  payment_method: string;
  status: string;
  created_at: string;
  product?: {
    name: string;
  };
};

export default function TiendaAlumnoPage() {
  const [activeTab, setActiveTab] = useState<"catalog" | "history">("catalog");
  const [loading, setLoading] = useState(true);
  const [boxId, setBoxId] = useState<string | null>(null);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [history, setHistory] = useState<OrderHistory[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("users")
        .select("box_id")
        .eq("id", user.id)
        .single();

      if (!profile?.box_id) return;
      setBoxId(profile.box_id);

      // Cargar productos
      const { data: prodRes } = await supabase
        .from("box_products")
        .select("*")
        .eq("box_id", profile.box_id)
        .eq("active", true)
        .order("name");

      // Cargar historial de compras del alumno
      const { data: histRes } = await supabase
        .from("box_product_sales")
        .select(`
          *,
          product:box_products(name)
        `)
        .eq("student_id", user.id)
        .order("created_at", { ascending: false });

      setProducts(prodRes || []);
      setHistory(histRes || []);
    } catch (err) {
      toast.error("Error al cargar información");
    } finally {
      setLoading(false);
    }
  }

  function addToCart(id: string) {
    setCart(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
    toast.success("Producto agregado al carrito");
  }

  function removeFromCart(id: string) {
    setCart(prev => {
      const updated = { ...prev };
      if (updated[id] > 1) {
        updated[id] -= 1;
      } else {
        delete updated[id];
      }
      return updated;
    });
  }

  async function handleCheckout() {
    const keys = Object.keys(cart);
    if (keys.length === 0) return;

    setSubmitting(true);
    try {
      for (const prodId of keys) {
        const qty = cart[prodId];
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            box_id: boxId,
            product_id: prodId,
            quantity: qty
          })
        });

        if (!res.ok) throw new Error();
      }

      toast.success("¡Pedido realizado! Acercate al mostrador para retirar");
      setCart({});
      loadData();
    } catch (err) {
      toast.error("Error al procesar el pedido");
    } finally {
      setSubmitting(false);
    }
  }

  const totalItems = Object.values(cart).reduce((sum, q) => sum + q, 0);
  const cartProducts = products.filter(p => (cart[p.id] || 0) > 0);
  const cartTotal = cartProducts.reduce((sum, p) => sum + p.price * cart[p.id], 0);

  if (loading) {
    return (
      <div className="space-y-6 p-4 max-w-lg mx-auto pb-24">
        <div className="h-6 w-32 bg-muted animate-pulse rounded-lg" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-28 bg-white border rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24">
      
      {/* Header Fijo Estilo Mobile Premium */}
      <div className="bg-white border-b border-border px-6 py-5 sticky top-0 z-30 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-1.5">
            <Sparkles className="w-5 h-5 text-primary" /> Tienda del Box
          </h1>
          <p className="text-xs text-muted-foreground">Adquirí tus suplementos e indumentaria oficial</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        
        {/* Selector Pestañas */}
        <div className="flex bg-white p-1 rounded-xl border border-border shadow-sm">
          <button
            onClick={() => setActiveTab("catalog")}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "catalog"
                ? "bg-primary text-white"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShoppingBag className="w-4 h-4" /> Comprar Productos
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "history"
                ? "bg-primary text-white"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <History className="w-4 h-4" /> Mis Consumos
          </button>
        </div>

        {/* ─── PESTAÑA: CATALOGO DE PRODUCTOS ────────────────── */}
        {activeTab === "catalog" && (
          <div className="space-y-3">
            {products.length > 0 ? (
              products.map(p => {
                const count = cart[p.id] || 0;
                return (
                  <div key={p.id} className="p-4 bg-white border border-border rounded-2xl flex items-center gap-4 shadow-sm relative overflow-hidden group">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="w-16 h-16 rounded-xl object-cover border border-border shrink-0" />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center text-muted-foreground font-black text-xs shrink-0">
                        BOX
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-foreground truncate">{p.name}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{p.description || "Sin descripción disponible"}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-sm font-extrabold text-primary">${p.price.toLocaleString()}</span>
                        {p.stock <= 3 && (
                          <span className="text-[10px] font-bold text-amber-600 flex items-center gap-0.5">
                            <AlertTriangle className="w-3 h-3" /> ¡Últimos {p.stock}!
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0">
                      {count > 0 ? (
                        <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl p-0.5">
                          <button onClick={() => removeFromCart(p.id)} className="p-1 rounded-lg text-muted-foreground hover:bg-white transition">
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-2 text-xs font-bold text-foreground">{count}</span>
                          <button onClick={() => addToCart(p.id)} className="p-1 rounded-lg text-muted-foreground hover:bg-white transition">
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(p.id)}
                          className="px-3 py-1.5 bg-primary text-white rounded-xl text-xs font-semibold hover:bg-primary/90 transition shadow-sm"
                        >
                          Comprar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-16 bg-white border border-border rounded-2xl">
                <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-semibold text-foreground">Sin productos cargados</h3>
                <p className="text-xs text-muted-foreground mt-1">La tienda digital del Box está siendo actualizada por tu coach.</p>
              </div>
            )}
          </div>
        )}

        {/* ─── PESTAÑA: HISTORIAL DE COMPRAS ────────────────── */}
        {activeTab === "history" && (
          <div className="space-y-2">
            {history.length > 0 ? (
              history.map(item => (
                <div key={item.id} className="p-4 bg-white border border-border rounded-2xl flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                      <Receipt className="w-5 h-5 text-slate-500" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-foreground">{item.product?.name || "Producto comprado"}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.quantity} {item.quantity > 1 ? "unidades" : "unidad"} · {new Date(item.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-extrabold text-sm text-foreground">${item.total_price.toLocaleString()}</p>
                    <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full uppercase mt-1 ${
                      item.status === "completado" 
                        ? "bg-emerald-100 text-emerald-700" 
                        : item.status === "pendiente" 
                        ? "bg-amber-100 text-amber-700 animate-pulse" 
                        : "bg-rose-100 text-rose-700"
                    }`}>
                      {item.status === "completado" ? "Entregado" : item.status === "pendiente" ? "Por Retirar" : "Cancelado"}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-16 bg-white border border-border rounded-2xl">
                <History className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-semibold text-foreground">Sin compras registradas</h3>
                <p className="text-xs text-muted-foreground mt-1">Tus compras de suplementos o accesorios se listarán en esta pestaña.</p>
              </div>
            )}
          </div>
        )}

      </div>

      {/* ─── WIDGET CARRO DE COMPRAS INFERIOR FIJO ────────── */}
      {activeTab === "catalog" && totalItems > 0 && (
        <div className="fixed bottom-16 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-border z-40" style={{ paddingBottom: "calc(16px + env(safe-area-inset-bottom))" }}>
          <div className="max-w-lg mx-auto flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase">Total del Pedido</p>
              <p className="font-black text-primary text-base">${cartTotal.toLocaleString()} <span className="text-xs font-semibold text-muted-foreground">({totalItems} items)</span></p>
            </div>
            <button
              disabled={submitting}
              onClick={handleCheckout}
              className="flex items-center gap-2 px-5 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/95 transition shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Procesando...
                </>
              ) : (
                <>
                  Confirmar Pedido <Check className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
