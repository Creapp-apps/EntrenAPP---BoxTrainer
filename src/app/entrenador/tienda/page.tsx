"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { 
  Plus, 
  Trash2, 
  Edit3, 
  ShoppingBag, 
  History, 
  TrendingUp, 
  Inbox, 
  Check, 
  X, 
  AlertTriangle,
  ArrowRight,
  User,
  Phone,
  DollarSign,
  Search,
  ShoppingCart,
  Minus,
  Sparkles
} from "lucide-react";

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  image_url: string;
  active: boolean;
};

type Sale = {
  id: string;
  quantity: number;
  total_price: number;
  payment_method: string;
  status: string;
  buyer_name?: string;
  buyer_contact?: string;
  created_at: string;
  product?: {
    name: string;
  };
  student?: {
    full_name: string;
    email: string;
  };
};

type Student = {
  id: string;
  full_name: string;
  email: string;
};

export default function TiendaEntrenadorPage() {
  const [activeTab, setActiveTab] = useState<"pos" | "inventory" | "orders" | "history">("pos");
  const [loading, setLoading] = useState(true);
  const [boxId, setBoxId] = useState<string | null>(null);
  
  // Data lists
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  // POS State
  const [posCart, setPosCart] = useState<Record<string, number>>({});
  const [posStudentId, setPosStudentId] = useState("");
  const [posBuyerName, setPosBuyerName] = useState("");
  const [posBuyerContact, setPosBuyerContact] = useState("");
  const [posPaymentMethod, setPosPaymentMethod] = useState<"efectivo" | "mercadopago" | "transferencia" | "otro">("efectivo");
  const [posSearch, setPosSearch] = useState("");

  // Modals & product setup state
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    price: 0,
    stock: 0,
    image_url: "",
    active: true
  });

  const [completingOrder, setCompletingOrder] = useState<Sale | null>(null);
  const [orderPaymentMethod, setOrderPaymentMethod] = useState<string>("efectivo");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Obtener box_id
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
        .order("name");

      // Cargar alumnos activos del Box para el POS
      const { data: studRes } = await supabase
        .from("users")
        .select("id, full_name, email")
        .eq("box_id", profile.box_id)
        .eq("role", "student")
        .eq("active", true)
        .order("full_name");

      // Cargar historial de ventas
      const { data: salesRes } = await supabase
        .from("box_product_sales")
        .select(`
          *,
          product:box_products(name),
          student:users(full_name, email)
        `)
        .eq("box_id", profile.box_id)
        .order("created_at", { ascending: false });

      setProducts(prodRes || []);
      setStudents(studRes || []);
      setSales(salesRes || []);
    } catch (err) {
      toast.error("Error al cargar información");
    } finally {
      setLoading(false);
    }
  }

  // POS Cart Actions
  function addToPosCart(id: string) {
    const product = products.find(p => p.id === id);
    if (!product) return;
    
    const currentQty = posCart[id] || 0;
    if (product.stock <= currentQty) {
      toast.error(`Stock insuficiente. Solo quedan ${product.stock} unidades de ${product.name}`);
      return;
    }

    setPosCart(prev => ({ ...prev, [id]: currentQty + 1 }));
  }

  function removeFromPosCart(id: string) {
    setPosCart(prev => {
      const updated = { ...prev };
      if (updated[id] > 1) {
        updated[id] -= 1;
      } else {
        delete updated[id];
      }
      return updated;
    });
  }

  function deleteFromPosCart(id: string) {
    setPosCart(prev => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
  }

  // Realizar Cobro en POS
  async function handlePosCheckout() {
    const cartKeys = Object.keys(posCart);
    if (cartKeys.length === 0) {
      toast.error("El ticket está vacío");
      return;
    }

    const supabase = createClient();
    try {
      for (const prodId of cartKeys) {
        const qty = posCart[prodId];
        const product = products.find(p => p.id === prodId);
        if (!product) continue;

        const total_price = product.price * qty;

        // 1. Registrar Venta
        const { error: saleError } = await supabase
          .from("box_product_sales")
          .insert({
            box_id: boxId,
            product_id: prodId,
            student_id: posStudentId || null,
            buyer_name: posStudentId ? null : (posBuyerName.trim() || "Cliente de Paso"),
            buyer_contact: posStudentId ? null : (posBuyerContact.trim() || null),
            quantity: qty,
            total_price,
            payment_method: posPaymentMethod,
            status: "completado"
          });

        if (saleError) throw saleError;

        // 2. Descontar Stock
        const { error: stockError } = await supabase
          .from("box_products")
          .update({ stock: product.stock - qty })
          .eq("id", product.id);

        if (stockError) throw stockError;
      }

      toast.success("¡Cobro procesado con éxito!");
      setPosCart({});
      setPosStudentId("");
      setPosBuyerName("");
      setPosBuyerContact("");
      loadData();
    } catch (err: any) {
      toast.error("Error al procesar el cobro: " + err.message);
    }
  }

  // ABM Productos
  async function handleSaveProduct() {
    if (!productForm.name.trim() || productForm.price < 0 || productForm.stock < 0) {
      toast.error("Por favor completa los datos obligatorios válidos");
      return;
    }

    const supabase = createClient();
    try {
      if (editingProduct) {
        const { error } = await supabase
          .from("box_products")
          .update({
            name: productForm.name,
            description: productForm.description,
            price: productForm.price,
            stock: productForm.stock,
            image_url: productForm.image_url,
            active: productForm.active
          })
          .eq("id", editingProduct.id);

        if (error) throw error;
        toast.success("Producto actualizado");
      } else {
        const { error } = await supabase
          .from("box_products")
          .insert({
            box_id: boxId,
            name: productForm.name,
            description: productForm.description,
            price: productForm.price,
            stock: productForm.stock,
            image_url: productForm.image_url,
            active: productForm.active
          });

        if (error) throw error;
        toast.success("Producto creado exitosamente");
      }

      setShowProductModal(false);
      setEditingProduct(null);
      setProductForm({ name: "", description: "", price: 0, stock: 0, image_url: "", active: true });
      loadData();
    } catch (err: any) {
      toast.error("Error al guardar: " + err.message);
    }
  }

  async function handleDeleteProduct(id: string) {
    if (!confirm("¿Eliminar este producto? Los registros históricos permanecerán intactos.")) return;
    const supabase = createClient();
    try {
      const { error } = await supabase
        .from("box_products")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Producto eliminado");
      loadData();
    } catch (err: any) {
      toast.error("Error al eliminar");
    }
  }

  // Completar Orden de Inbox
  async function handleApproveOrder(order: Sale) {
    const supabase = createClient();
    try {
      const { data: product } = await supabase
        .from("box_products")
        .select("*")
        .eq("id", order.product_id)
        .single();

      if (!product) {
        toast.error("El producto ya no existe.");
        return;
      }

      if (product.stock < order.quantity) {
        toast.error(`Stock insuficiente. Quedan ${product.stock} y el pedido solicita ${order.quantity}.`);
        return;
      }

      const { error: saleError } = await supabase
        .from("box_product_sales")
        .update({
          status: "completado",
          payment_method: orderPaymentMethod
        })
        .eq("id", order.id);

      if (saleError) throw saleError;

      const { error: stockError } = await supabase
        .from("box_products")
        .update({ stock: product.stock - order.quantity })
        .eq("id", product.id);

      if (stockError) throw stockError;

      toast.success("Pedido entregado y completado");
      setCompletingOrder(null);
      loadData();
    } catch (err: any) {
      toast.error("Error al procesar: " + err.message);
    }
  }

  async function handleRejectOrder(id: string) {
    if (!confirm("¿Rechazar o cancelar este pedido?")) return;
    const supabase = createClient();
    try {
      const { error } = await supabase
        .from("box_product_sales")
        .update({ status: "cancelado" })
        .eq("id", id);

      if (error) throw error;
      toast.success("Pedido cancelado");
      loadData();
    } catch (err: any) {
      toast.error("Error al cancelar");
    }
  }

  // Metrics
  const completedSales = sales.filter(s => s.status === "completado");
  const pendingOrders = sales.filter(s => s.status === "pendiente");
  const totalRevenue = completedSales.reduce((sum, s) => sum + Number(s.total_price), 0);
  const totalSoldUnits = completedSales.reduce((sum, s) => sum + s.quantity, 0);

  // POS Cart computations
  const posCartProducts = products.filter(p => (posCart[p.id] || 0) > 0);
  const posTotal = posCartProducts.reduce((sum, p) => sum + p.price * posCart[p.id], 0);
  const posItemCount = Object.values(posCart).reduce((sum, q) => sum + q, 0);

  // Filter products for POS
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(posSearch.toLowerCase()) || 
                          (p.description || "").toLowerCase().includes(posSearch.toLowerCase());
    return p.active && matchesSearch;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-white rounded-2xl animate-pulse border border-border" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      
      {/* ─── HEADER Y METRICAS PRINCIPALES ────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" /> Tienda y POS del Box
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Punto de Venta (POS) en vivo, control de stock e ingresos de suplementos
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setEditingProduct(null);
              setProductForm({ name: "", description: "", price: 0, stock: 0, image_url: "", active: true });
              setShowProductModal(true);
            }}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition shadow-lg shadow-primary/10"
          >
            <Plus className="w-4 h-4" /> Registrar Producto
          </button>
        </div>
      </div>

      {/* Grid de Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Recaudado</p>
            <h3 className="text-lg font-black text-foreground mt-0.5">${totalRevenue.toLocaleString()}</h3>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
            <DollarSign className="w-4.5 h-4.5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Vendidos</p>
            <h3 className="text-lg font-black text-foreground mt-0.5">{totalSoldUnits} u.</h3>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
            <ShoppingBag className="w-4.5 h-4.5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Por Entregar</p>
            <h3 className="text-lg font-black text-foreground mt-0.5">{pendingOrders.length} pedidos</h3>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
            <Inbox className="w-4.5 h-4.5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Total Catálogo</p>
            <h3 className="text-lg font-black text-foreground mt-0.5">{products.length} ítems</h3>
          </div>
          <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
            <ShoppingCart className="w-4.5 h-4.5" />
          </div>
        </div>
      </div>

      {/* ─── MENU NAVEGACION PESTAÑAS ─────────────────────── */}
      <div className="flex gap-1.5 border-b border-border pb-1">
        <button
          onClick={() => setActiveTab("pos")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "pos"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <ShoppingCart className="w-4 h-4" /> Punto de Venta (POS)
        </button>
        <button
          onClick={() => setActiveTab("inventory")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "inventory"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <ShoppingBag className="w-4 h-4" /> Inventario de Stock
        </button>
        <button
          onClick={() => setActiveTab("orders")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all relative ${
            activeTab === "orders"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Inbox className="w-4 h-4" /> Pedidos Web / Alumnos
          {pendingOrders.length > 0 && (
            <span className="ml-1.5 w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
              {pendingOrders.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "history"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <History className="w-4 h-4" /> Historial de Ventas
        </button>
      </div>

      {/* ─── VISTA: INTERACTIVE PUNTO DE VENTA (POS) ────────── */}
      {activeTab === "pos" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Columna Izquierda: Grid de Productos */}
          <div className="lg:col-span-8 space-y-4">
            
            {/* Buscador de Productos */}
            <div className="relative">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar producto por nombre o descripción para facturar..."
                value={posSearch}
                onChange={e => setPosSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-border bg-white text-sm focus:ring-1 focus:ring-primary outline-none"
              />
            </div>

            {/* Grid de Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filteredProducts.length > 0 ? (
                filteredProducts.map(p => {
                  const addedQty = posCart[p.id] || 0;
                  const isOutOfStock = p.stock <= addedQty;
                  return (
                    <div
                      key={p.id}
                      onClick={() => !isOutOfStock && addToPosCart(p.id)}
                      className={`bg-white border rounded-2xl p-4 shadow-sm hover:shadow-md transition cursor-pointer flex flex-col justify-between select-none relative group overflow-hidden ${
                        isOutOfStock ? "opacity-60 cursor-not-allowed" : "border-slate-200 hover:border-primary/50"
                      }`}
                    >
                      {addedQty > 0 && (
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary text-white font-black text-xs flex items-center justify-center shadow">
                          {addedQty}
                        </div>
                      )}

                      <div className="space-y-2">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="w-full h-24 rounded-xl object-cover border border-border" />
                        ) : (
                          <div className="w-full h-24 rounded-xl bg-slate-50 flex items-center justify-center font-black text-slate-400 text-xs uppercase">
                            Sin Foto
                          </div>
                        )}
                        <h4 className="font-bold text-slate-800 text-sm truncate" title={p.name}>{p.name}</h4>
                        <p className="text-[10px] text-muted-foreground line-clamp-1">{p.description || "Sin descripción"}</p>
                      </div>

                      <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                        <div>
                          <p className="text-[9px] text-muted-foreground font-semibold uppercase">Stock</p>
                          {p.stock === 0 ? (
                            <span className="text-[10px] font-bold text-red-600">Agotado</span>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-700">{p.stock - addedQty} disp.</span>
                          )}
                        </div>
                        <span className="font-extrabold text-sm text-primary">${p.price.toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-dashed border-border">
                  <ShoppingBag className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No encontramos productos activos</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Probá otra palabra o cargá productos en el inventario.</p>
                </div>
              )}
            </div>
          </div>

          {/* Columna Derecha: Ticket de Venta / Caja Registradora */}
          <div className="lg:col-span-4 bg-white border border-border rounded-2xl p-5 shadow-sm space-y-4 sticky top-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 flex items-center gap-1.5">
                <ShoppingCart className="w-4 h-4 text-primary" /> Ticket de Venta
              </h3>
              {posItemCount > 0 && (
                <button
                  onClick={() => setPosCart({})}
                  className="text-xs font-bold text-red-500 hover:underline"
                >
                  Vaciar
                </button>
              )}
            </div>

            {/* Lista del Carrito */}
            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {posCartProducts.length > 0 ? (
                posCartProducts.map(p => {
                  const qty = posCart[p.id];
                  return (
                    <div key={p.id} className="flex justify-between items-center bg-slate-50 border border-slate-100 p-2.5 rounded-xl">
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="font-bold text-xs text-slate-800 truncate" title={p.name}>{p.name}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">${p.price.toLocaleString()} c/u</p>
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5">
                          <button onClick={() => removeFromPosCart(p.id)} className="p-1 rounded text-muted-foreground hover:bg-slate-100 transition">
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2 text-xs font-black text-slate-700">{qty}</span>
                          <button onClick={() => addToPosCart(p.id)} className="p-1 rounded text-muted-foreground hover:bg-slate-100 transition">
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <button
                          onClick={() => deleteFromPosCart(p.id)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition"
                          title="Quitar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center text-muted-foreground space-y-2">
                  <ShoppingCart className="w-10 h-10 mx-auto text-slate-300 stroke-[1.5]" />
                  <p className="text-xs font-semibold">El ticket está vacío</p>
                  <p className="text-[10px]">Hacé clic en los productos de la izquierda para facturar</p>
                </div>
              )}
            </div>

            {/* Asignación de Cliente */}
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <div>
                <label className="text-[9px] font-bold text-muted-foreground uppercase block mb-1">Asociar a Alumno (Opcional)</label>
                <select
                  value={posStudentId}
                  onChange={e => setPosStudentId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:ring-1 focus:ring-primary outline-none"
                >
                  <option value="">Cliente anónimo / De paso</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.full_name} ({s.email})</option>
                  ))}
                </select>
              </div>

              {!posStudentId && (
                <div className="grid grid-cols-2 gap-2 animate-fadeIn">
                  <div>
                    <label className="text-[9px] font-bold text-muted-foreground uppercase block mb-1">Nombre</label>
                    <input 
                      type="text" 
                      placeholder="Nombre"
                      value={posBuyerName}
                      onChange={e => setPosBuyerName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-muted-foreground uppercase block mb-1">Contacto</label>
                    <input 
                      type="text" 
                      placeholder="Celular"
                      value={posBuyerContact}
                      onChange={e => setPosBuyerContact(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <label className="text-[9px] font-bold text-muted-foreground uppercase block mb-1">Método de Pago</label>
                  <select
                    value={posPaymentMethod}
                    onChange={e => setPosPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:ring-1 focus:ring-primary outline-none font-bold"
                  >
                    <option value="efectivo">💵 Efectivo</option>
                    <option value="mercadopago">📱 MercadoPago</option>
                    <option value="transferencia">🏦 Transferencia</option>
                    <option value="otro">⚙️ Otro</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Totales y Botón Cobrar */}
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-500">Subtotal ({posItemCount} items)</span>
                <span className="text-sm font-bold text-slate-700">${posTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center border-t border-dashed border-slate-100 pt-2">
                <span className="text-sm font-black text-slate-800">Total a Cobrar</span>
                <span className="text-lg font-black text-primary">${posTotal.toLocaleString()}</span>
              </div>

              <button
                disabled={posItemCount === 0}
                onClick={handlePosCheckout}
                className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary/95 transition shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cobrar y Entregar <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── VISTA: INVENTARIO DE PRODUCTOS ────────────────── */}
      {activeTab === "inventory" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.length > 0 ? (
            products.map(p => (
              <div 
                key={p.id} 
                className={`bg-white rounded-2xl p-5 shadow-sm border border-border flex flex-col justify-between transition-all ${
                  !p.active ? "opacity-60" : ""
                }`}
              >
                <div>
                  <div className="flex gap-2 justify-between items-start mb-3">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="w-16 h-16 rounded-xl object-cover border border-border" />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-slate-50 flex items-center justify-center font-black text-slate-400 text-xs">
                        Sin Foto
                      </div>
                    )}
                    
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setEditingProduct(p);
                          setProductForm({
                            name: p.name,
                            description: p.description || "",
                            price: p.price,
                            stock: p.stock,
                            image_url: p.image_url || "",
                            active: p.active
                          });
                          setShowProductModal(true);
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition"
                        title="Editar"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(p.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h4 className="font-bold text-slate-900 truncate" title={p.name}>{p.name}</h4>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{p.description || "Sin descripción corta"}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase">Stock disponible</p>
                    {p.stock === 0 ? (
                      <span className="inline-flex items-center gap-1 mt-1 text-xs font-bold text-red-600">
                        <AlertTriangle className="w-3.5 h-3.5" /> Sin stock
                      </span>
                    ) : p.stock <= 3 ? (
                      <span className="inline-flex items-center gap-1 mt-1 text-xs font-bold text-amber-600">
                        <AlertTriangle className="w-3.5 h-3.5" /> Bajo stock ({p.stock})
                      </span>
                    ) : (
                      <p className="font-bold text-slate-800 mt-0.5">{p.stock} unidades</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase">Precio de venta</p>
                    <p className="font-black text-primary text-base mt-0.5">${p.price.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-16 bg-white rounded-2xl border border-border">
              <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-semibold text-slate-800">Sin productos</h3>
              <p className="text-sm text-muted-foreground mt-1">Cargá productos en tu inventario para comenzar a registrar consumos.</p>
            </div>
          )}
        </div>
      )}

      {/* ─── VISTA: PEDIDOS RECIBIDOS (WEB / ALUMNOS PENDIENTES) ─── */}
      {activeTab === "orders" && (
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          {pendingOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Producto</th>
                    <th className="px-6 py-4">Comprador</th>
                    <th className="px-6 py-4">Cantidad</th>
                    <th className="px-6 py-4">Monto total</th>
                    <th className="px-6 py-4">Fecha</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {pendingOrders.map(order => (
                    <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold">{order.product?.name || "Producto desconocido"}</td>
                      <td className="px-6 py-4">
                        {order.student ? (
                          <div>
                            <p className="font-semibold">{order.student.full_name}</p>
                            <p className="text-xs text-muted-foreground">{order.student.email}</p>
                          </div>
                        ) : (
                          <div>
                            <p className="font-semibold flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-purple-500" /> {order.buyer_name} (Web)</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3 text-zinc-400" /> {order.buyer_contact}</p>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 font-semibold">{order.quantity} u.</td>
                      <td className="px-6 py-4 font-extrabold text-primary">${order.total_price.toLocaleString()}</td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString()} · {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-6 py-4 text-right flex gap-1 justify-end">
                        <button
                          onClick={() => {
                            setOrderPaymentMethod("efectivo");
                            setCompletingOrder(order);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold transition"
                        >
                          <Check className="w-3.5 h-3.5" /> Entregar
                        </button>
                        <button
                          onClick={() => handleRejectOrder(order.id)}
                          className="flex items-center justify-center p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 rounded-lg transition"
                          title="Rechazar pedido"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-16">
              <Inbox className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-semibold text-slate-800">Bandeja de pedidos vacía</h3>
              <p className="text-sm text-muted-foreground mt-1">Los pedidos de suplementos desde el portal de invitación aparecerán acá.</p>
            </div>
          )}
        </div>
      )}

      {/* ─── VISTA: HISTORIAL DE VENTAS ───────────────────── */}
      {activeTab === "history" && (
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          {completedSales.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Producto</th>
                    <th className="px-6 py-4">Comprador</th>
                    <th className="px-6 py-4">Cantidad</th>
                    <th className="px-6 py-4">Monto</th>
                    <th className="px-6 py-4">Medio de Pago</th>
                    <th className="px-6 py-4">Fecha de Compra</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {completedSales.map(sale => (
                    <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold">{sale.product?.name || "Producto sin nombre"}</td>
                      <td className="px-6 py-4">
                        {sale.student ? (
                          <div>
                            <p className="font-semibold">{sale.student.full_name}</p>
                            <p className="text-xs text-muted-foreground">{sale.student.email}</p>
                          </div>
                        ) : (
                          <div>
                            <p className="font-semibold">{sale.buyer_name || "Mostrador"}</p>
                            {sale.buyer_contact && <p className="text-xs text-muted-foreground">{sale.buyer_contact}</p>}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 font-semibold">{sale.quantity} u.</td>
                      <td className="px-6 py-4 font-extrabold text-primary">${sale.total_price.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className="text-xs px-2.5 py-1 rounded-full font-bold uppercase bg-slate-100 text-slate-600">
                          {sale.payment_method}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        {new Date(sale.created_at).toLocaleDateString()} · {new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-16">
              <History className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-semibold text-slate-800">Sin historial</h3>
              <p className="text-sm text-muted-foreground mt-1">Las ventas completadas y entregadas aparecerán listadas en esta sección.</p>
            </div>
          )}
        </div>
      )}

      {/* ─── MODAL: PRODUCTO (NUEVO/EDITAR) ────────────────── */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={() => setShowProductModal(false)} />
          <div className="relative bg-white rounded-3xl p-6 w-full max-w-md border border-border shadow-2xl space-y-4">
            <h3 className="font-bold text-lg text-slate-900">
              {editingProduct ? "Editar Producto" : "Nuevo Producto"}
            </h3>
            
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Nombre</label>
                <input 
                  type="text" 
                  value={productForm.name} 
                  onChange={e => setFormAndVerify({ name: e.target.value })}
                  placeholder="Ej: Creatina Micronizada 300g" 
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary outline-none" 
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Descripción</label>
                <textarea 
                  value={productForm.description} 
                  onChange={e => setFormAndVerify({ description: e.target.value })}
                  placeholder="Ej: Suplemento de alta pureza para entrenamientos explosivos" 
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary outline-none h-20 resize-none" 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Precio ($)</label>
                  <input 
                    type="number" 
                    value={productForm.price} 
                    onChange={e => setFormAndVerify({ price: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary outline-none" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Stock</label>
                  <input 
                    type="number" 
                    value={productForm.stock} 
                    onChange={e => setFormAndVerify({ stock: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary outline-none" 
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">URL de Imagen</label>
                <input 
                  type="text" 
                  value={productForm.image_url} 
                  onChange={e => setFormAndVerify({ image_url: e.target.value })}
                  placeholder="Pegá un enlace de Imgur o Google" 
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary outline-none" 
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-semibold text-muted-foreground">Producto Activo (Visible en tienda)</span>
                <input 
                  type="checkbox" 
                  checked={productForm.active} 
                  onChange={e => setFormAndVerify({ active: e.target.checked })}
                  className="w-5 h-5 rounded-lg border-slate-200 text-primary focus:ring-0" 
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button 
                onClick={handleSaveProduct}
                className="flex-1 bg-primary text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition"
              >
                Guardar
              </button>
              <button 
                onClick={() => setShowProductModal(false)}
                className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-200 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: MEDIO DE PAGO PARA PEDIDOS RECIBIDOS ────── */}
      {completingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={() => setCompletingOrder(null)} />
          <div className="relative bg-white rounded-3xl p-6 w-full max-w-sm border border-border shadow-2xl space-y-4">
            <h3 className="font-bold text-lg text-slate-900 flex items-center gap-1.5">
              Confirmar Entrega de Pedido
            </h3>
            
            <p className="text-xs text-muted-foreground leading-relaxed">
              ¿Cómo abonó <strong>{completingOrder.buyer_name || completingOrder.student?.full_name}</strong> las <strong>{completingOrder.quantity} unidades</strong> de {completingOrder.product?.name}?
            </p>

            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Medio de Pago</label>
              <select
                value={orderPaymentMethod}
                onChange={e => setOrderPaymentMethod(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:ring-1 focus:ring-primary outline-none"
              >
                <option value="efectivo">💵 Efectivo</option>
                <option value="mercadopago">📱 MercadoPago</option>
                <option value="transferencia">🏦 Transferencia</option>
                <option value="otro">⚙️ Otro</option>
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button 
                onClick={() => handleApproveOrder(completingOrder)}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-semibold transition"
              >
                Confirmar y Entregar
              </button>
              <button 
                onClick={() => setCompletingOrder(null)}
                className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-200 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );

  function setFormAndVerify(obj: Partial<typeof productForm>) {
    setProductForm(prev => ({ ...prev, ...obj }));
  }
}
