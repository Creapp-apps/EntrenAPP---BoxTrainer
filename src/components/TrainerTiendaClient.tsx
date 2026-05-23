"use client";

import { useState } from "react";
import { 
  ShoppingBag, Search, Plus, Minus, Trash2, User, CreditCard, 
  Check, Loader2, ArrowRight, Settings, SlidersHorizontal, 
  DollarSign, RefreshCw, X, Receipt, Clock, Ban, Phone
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

interface Student {
  id: string;
  name: string;
  email?: string;
}

interface Sale {
  id: string;
  product_id: string;
  quantity: number;
  total_price: number;
  payment_method: string;
  status: "pendiente" | "completado" | "cancelado";
  buyer_name?: string | null;
  buyer_contact?: string | null;
  created_at: string;
  box_products: {
    name: string;
    price: number;
    image_url: string | null;
  } | null;
  users: {
    name: string;
    email?: string;
  } | null;
}

interface TrainerTiendaProps {
  products: Product[];
  students: Student[];
  sales: Sale[];
  boxId: string;
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  maxStock: number;
}

const CATEGORIES = {
  all: "Todos",
  drinks: "Bebidas",
  supplements: "Suplementos",
  clothing: "Ropa",
  other: "Cafetería / Gustitos"
};

export default function TrainerTiendaClient({ 
  products: initialProducts, 
  students, 
  sales: initialSales, 
  boxId 
}: TrainerTiendaProps) {
  
  // Real-time State
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [sales, setSales] = useState<Sale[]>(initialSales);
  
  // Cart & POS Terminal State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerContact, setBuyerContact] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("efectivo");
  const [isProcessingSale, setIsProcessingSale] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  
  // Modal / Queue Tab State
  const [activeQueueTab, setActiveQueueTab] = useState<"completed" | "pending">("pending");
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // CRUD Form State
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formStock, setFormStock] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formCategory, setFormCategory] = useState("drinks");
  const [formActive, setFormActive] = useState(true);
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  // Parsing helper for categories stored in JSON
  const getProductCategory = (p: Product) => {
    try {
      if (p.description && p.description.startsWith("{")) {
        const parsed = JSON.parse(p.description);
        return parsed.category || "other";
      }
    } catch (e) {}
    return "other";
  };

  const getProductDescription = (p: Product) => {
    try {
      if (p.description && p.description.startsWith("{")) {
        const parsed = JSON.parse(p.description);
        return parsed.text || "";
      }
    } catch (e) {}
    return p.description || "";
  };

  // Add Product to POS Cart
  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      alert("Este producto no cuenta con stock disponible");
      return;
    }

    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      if (existing.quantity >= product.stock) {
        alert(`No hay más stock disponible. Máximo: ${product.stock}`);
        return;
      }
      setCart(cart.map(item => 
        item.id === product.id 
          ? { ...item, quantity: item.quantity + 1 } 
          : item
      ));
    } else {
      setCart([...cart, {
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        maxStock: product.stock
      }]);
    }
  };

  // Cart Adjustments
  const incrementQuantity = (id: string) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        if (item.quantity >= item.maxStock) {
          alert(`No hay más stock disponible en mostrador (${item.maxStock})`);
          return item;
        }
        return { ...item, quantity: item.quantity + 1 };
      }
      return item;
    }));
  };

  const decrementQuantity = (id: string) => {
    setCart(cart.map(item => 
      item.id === id && item.quantity > 1 
        ? { ...item, quantity: item.quantity - 1 } 
        : item
    ));
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // POS Checkout Submission
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    
    // Anotado en Cuenta/Deuda requires an actual registered student
    if (paymentMethod === "deuda" && !selectedStudentId) {
      alert("Para registrar una venta como Deuda / Cuenta Corriente es obligatorio seleccionar un alumno del Box.");
      return;
    }

    // Guest sale requires names
    if (!selectedStudentId && !buyerName.trim()) {
      alert("Por favor completá el nombre del cliente invitado o seleccioná un alumno.");
      return;
    }

    setIsProcessingSale(true);
    try {
      const response = await fetch("/api/tienda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "checkout",
          items: cart,
          student_id: selectedStudentId || null,
          payment_method: paymentMethod,
          status: paymentMethod === "deuda" ? "pendiente" : "completado",
          buyer_name: selectedStudentId ? null : buyerName.trim(),
          buyer_contact: selectedStudentId ? null : buyerContact.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        alert(data.error || "Error al procesar la venta");
      } else {
        // Refresh local products stock
        const updatedProducts = products.map(prod => {
          const cartItem = cart.find(c => c.id === prod.id);
          if (cartItem && paymentMethod !== "deuda") { // Deuda/Pending doesn't deduct stock until paid in standard API config
            // Wait, our API route DOES deduct stock if checkout is status 'completado' (Paid)
            // It does NOT deduct stock if checkout is 'pendiente' (Debt/Pending)
            if (paymentMethod !== "deuda") {
              return { ...prod, stock: Math.max(0, prod.stock - cartItem.quantity) };
            }
          }
          return prod;
        });
        setProducts(updatedProducts);

        // Optimistically prepend sale records to recent sales
        const newSales: Sale[] = cart.map(item => ({
          id: Math.random().toString(),
          product_id: item.id,
          quantity: item.quantity,
          total_price: item.price * item.quantity,
          payment_method: paymentMethod,
          status: paymentMethod === "deuda" ? "pendiente" : "completado",
          buyer_name: selectedStudentId ? null : buyerName.trim(),
          buyer_contact: selectedStudentId ? null : buyerContact.trim(),
          created_at: new Date().toISOString(),
          box_products: {
            name: item.name,
            price: item.price,
            image_url: products.find(p => p.id === item.id)?.image_url || null
          },
          users: selectedStudentId 
            ? { name: students.find(s => s.id === selectedStudentId)?.name || "" }
            : null
        }));
        setSales([...newSales, ...sales]);

        // Reset Terminal
        setCart([]);
        setSelectedStudentId("");
        setBuyerName("");
        setBuyerContact("");
        setPaymentMethod("efectivo");
        alert("¡Venta registrada con éxito!");
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión");
    } finally {
      setIsProcessingSale(false);
    }
  };

  // Complete Pending Order (Cash-in)
  const handleCompleteOrder = async (saleId: string, payMethod: string) => {
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return;

    if (confirm(`¿Deseás marcar esta venta de $${sale.total_price.toLocaleString("es-AR")} como Pagada?`)) {
      try {
        const response = await fetch("/api/tienda", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "complete_order",
            sale_id: saleId,
            payment_method: payMethod
          }),
        });

        const resData = await response.json();
        if (!response.ok) {
          alert(resData.error || "Error al cobrar pedido");
        } else {
          // Update status in state
          setSales(sales.map(s => s.id === saleId ? { ...s, status: "completado", payment_method: payMethod } : s));
          
          // Update product stock in state
          setProducts(products.map(p => 
            p.id === sale.product_id 
              ? { ...p, stock: Math.max(0, p.stock - sale.quantity) } 
              : p
          ));

          alert("Venta cobrada con éxito!");
        }
      } catch (err) {
        console.error(err);
        alert("Error de conexión");
      }
    }
  };

  // Cancel Pending Order
  const handleCancelOrder = async (saleId: string) => {
    if (confirm("¿Estás seguro de que deseás cancelar esta orden pendiente?")) {
      try {
        const response = await fetch("/api/tienda", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "cancel_order",
            sale_id: saleId
          }),
        });

        const resData = await response.json();
        if (!response.ok) {
          alert(resData.error || "Error al cancelar orden");
        } else {
          setSales(sales.map(s => s.id === saleId ? { ...s, status: "cancelado" } : s));
          alert("Pedido cancelado");
        }
      } catch (err) {
        console.error(err);
        alert("Error de conexión");
      }
    }
  };

  // Pre-fill fields for Product CRUD
  const openCreateProduct = () => {
    setEditingProduct(null);
    setFormName("");
    setFormDescription("");
    setFormPrice("");
    setFormStock("");
    setFormImageUrl("");
    setFormCategory("drinks");
    setFormActive(true);
    setIsInventoryOpen(true);
  };

  const openEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setFormName(prod.name);
    setFormDescription(getProductDescription(prod));
    setFormPrice(String(prod.price));
    setFormStock(String(prod.stock));
    setFormImageUrl(prod.image_url || "");
    setFormCategory(getProductCategory(prod));
    setFormActive(prod.active);
    setIsInventoryOpen(true);
  };

  // Save/Create Product ABM
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPrice || !formStock) return;

    setIsSavingProduct(true);
    try {
      const payload = {
        action: editingProduct ? "update_product" : "create_product",
        id: editingProduct?.id,
        name: formName.trim(),
        description: formDescription.trim(),
        price: Number(formPrice),
        stock: Number(formStock),
        image_url: formImageUrl.trim() || null,
        category: formCategory,
        active: formActive
      };

      const response = await fetch("/api/tienda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resData = await response.json();
      if (!response.ok) {
        alert(resData.error || "Error al guardar el producto");
      } else {
        if (editingProduct) {
          // Update in state
          setProducts(products.map(p => p.id === editingProduct.id ? resData.product : p));
          alert("Producto actualizado con éxito");
        } else {
          // Prepend new product
          setProducts([resData.product, ...products]);
          alert("Producto catalogado con éxito");
        }
        setIsInventoryOpen(false);
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión");
    } finally {
      setIsSavingProduct(false);
    }
  };

  // Filters catalog search
  const filteredProducts = products.filter(prod => {
    const matchesSearch = prod.name.toLowerCase().includes(searchTerm.toLowerCase());
    const cat = getProductCategory(prod);
    const matchesCategory = selectedCategory === "all" || cat === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 text-foreground">
      
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-card p-6 rounded-2xl border border-border shadow-sm gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-primary">Terminal POS</span>
          <h1 className="text-2xl font-black tracking-tight text-foreground mt-1">Punto de Venta e Inventario</h1>
          <p className="text-xs text-muted-foreground">Administrá tu stock en tiempo real y cobrá consumos al mostrador</p>
        </div>

        <div className="flex gap-3 shrink-0">
          <button 
            onClick={openCreateProduct}
            className="px-4 py-3 rounded-xl bg-primary hover:bg-orange-600 text-white font-bold text-xs transition-all flex items-center gap-2 shadow-sm hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" /> Nuevo Producto
          </button>
          <button 
            onClick={() => {
              setEditingProduct(null);
              setIsInventoryOpen(false);
              window.location.reload();
            }}
            className="p-3 rounded-xl bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-all border border-border"
            title="Refrescar datos"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT & CENTER PANEL: Catalog Terminal */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Filters and Search Bar */}
          <div className="bg-card p-5 rounded-2xl border border-border shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between gap-3 items-start sm:items-center">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-primary" /> Filtros Catálogo
              </h3>
              
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar producto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-muted/50 border border-input rounded-xl pl-10 pr-4 py-2 text-xs text-foreground placeholder-muted-foreground focus:bg-background focus:outline-none focus:ring-1 focus:ring-ring transition-all"
                />
              </div>
            </div>

            {/* Category Pills */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {Object.entries(CATEGORIES).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(key)}
                  className="px-3.5 py-1.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider shrink-0 transition-all"
                  style={{
                    backgroundColor: selectedCategory === key ? "rgba(234, 88, 12, 0.1)" : "rgba(0,0,0,0.02)",
                    borderColor: selectedCategory === key ? "#EA580C" : "var(--border)",
                    color: selectedCategory === key ? "#EA580C" : "var(--muted-foreground)"
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Catalog Visual Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {filteredProducts.map((prod) => {
              const inCart = cart.find(c => c.id === prod.id);
              const availableStock = prod.stock - (inCart?.quantity || 0);

              return (
                <div
                  key={prod.id}
                  className={`bg-card border p-4 rounded-2xl flex flex-col justify-between group transition-all duration-300 relative shadow-sm hover:shadow-md ${
                    !prod.active ? "opacity-40" : ""
                  } ${
                    availableStock <= 0 
                      ? "border-destructive/20" 
                      : "border-border hover:border-border/80"
                  }`}
                >
                  {/* Quick Edit Config Button */}
                  <button 
                    onClick={() => openEditProduct(prod)}
                    className="absolute top-3 left-3 p-1.5 rounded-lg bg-background/80 hover:bg-background border border-border opacity-0 group-hover:opacity-100 transition-opacity z-10 text-muted-foreground hover:text-foreground shadow-sm"
                    title="Editar producto"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>

                  <div>
                    {/* Visual Container */}
                    <div className="aspect-square w-full rounded-xl bg-muted/40 border border-border overflow-hidden flex items-center justify-center relative mb-3">
                      {prod.image_url ? (
                        <img src={prod.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <ShoppingBag className="w-10 h-10 text-muted-foreground/30" />
                      )}

                      {/* Stock Badge */}
                      <div className="absolute top-2 right-2">
                        {prod.stock <= 0 ? (
                          <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-destructive/15 text-destructive border border-destructive/20">
                            Agotado
                          </span>
                        ) : prod.stock <= 3 ? (
                          <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 border border-amber-500/20 animate-pulse">
                            Stock: {prod.stock}
                          </span>
                        ) : (
                          <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">
                            Cant: {prod.stock}
                          </span>
                        )}
                      </div>
                    </div>

                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground/60">
                      {CATEGORIES[getProductCategory(prod) as keyof typeof CATEGORIES] || "Otros"}
                    </span>
                    <h4 className="font-bold text-foreground text-sm mt-0.5 truncate group-hover:text-primary transition-colors">
                      {prod.name}
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-normal line-clamp-2 h-8">
                      {getProductDescription(prod)}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                    <span className="font-black text-base text-foreground">
                      ${prod.price.toLocaleString("es-AR")}
                    </span>

                    {prod.active && availableStock > 0 ? (
                      <button
                        onClick={() => addToCart(prod)}
                        className="p-2 rounded-lg bg-muted hover:bg-primary border border-border hover:border-primary text-muted-foreground hover:text-white transition-all flex items-center justify-center"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    ) : (
                      <span className="text-[10px] text-muted-foreground font-bold px-2 py-1">
                        {!prod.active ? "Pausado" : "Sin Stock"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pending / Recent Sales Queue Panel */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-center border-b border-border pb-4 mb-4">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <Receipt className="w-5 h-5 text-primary" /> Cola de Mostrador
              </h3>
              
              <div className="flex gap-1.5 p-1 rounded-xl bg-muted border border-border">
                <button
                  onClick={() => setActiveQueueTab("pending")}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                    activeQueueTab === "pending"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  Pre-Pedidos ({sales.filter(s => s.status === "pendiente").length})
                </button>
                <button
                  onClick={() => setActiveQueueTab("completed")}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                    activeQueueTab === "completed"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  Ventas Recientes ({sales.filter(s => s.status === "completado").length})
                </button>
              </div>
            </div>

            <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
              {(() => {
                const list = sales.filter(s => s.status === (activeQueueTab === "pending" ? "pendiente" : "completado"));

                if (list.length === 0) {
                  return (
                    <div className="text-center py-10 bg-muted/20 rounded-xl border border-border">
                      <Clock className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
                      <p className="text-xs text-muted-foreground">No hay órdenes en este estado.</p>
                    </div>
                  );
                }

                return list.map((sale) => (
                  <div 
                    key={sale.id}
                    className="p-4 rounded-xl bg-muted/30 border border-border flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center"
                  >
                    <div className="flex gap-4 items-center min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-muted/40 border border-border shrink-0 overflow-hidden flex items-center justify-center">
                        {sale.box_products?.image_url ? (
                          <img src={sale.box_products.image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <ShoppingBag className="w-6 h-6 text-muted-foreground/30" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-foreground text-sm truncate">
                            {sale.box_products?.name || "Producto eliminado"}
                          </h4>
                          <span className="text-[10px] text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded">
                            {sale.quantity} ud{sale.quantity > 1 ? "s" : ""}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 items-center text-[10px] text-muted-foreground mt-1">
                          <span className="font-semibold text-foreground/80">
                            Cliente: {sale.users?.name || sale.buyer_name || "Invitado anónimo"}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-0.5 shrink-0">
                            <Clock className="w-3 h-3" />
                            {new Date(sale.created_at).toLocaleTimeString("es-AR", { hour: "numeric", minute: "2-digit" })}
                          </span>
                          {sale.buyer_contact && (
                            <>
                              <span>•</span>
                              <a 
                                href={`https://wa.me/${String(sale.buyer_contact).replace(/[^0-9]/g, "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5"
                              >
                                <Phone className="w-2.5 h-2.5" /> Chat
                              </a>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex sm:flex-col items-end gap-3 justify-between w-full sm:w-auto">
                      <div className="text-left sm:text-right">
                        <span className="font-extrabold text-sm text-foreground block">
                          ${sale.total_price.toLocaleString("es-AR")}
                        </span>
                        <span className="text-[9px] uppercase tracking-widest text-muted-foreground bg-muted px-1.5 py-0.5 rounded mt-0.5 inline-block border border-border">
                          {sale.payment_method === "deuda" ? "Anotado" : sale.payment_method}
                        </span>
                      </div>

                      {sale.status === "pendiente" && (
                        <div className="flex gap-2">
                          <select 
                            onChange={(e) => {
                              if (e.target.value) {
                                handleCompleteOrder(sale.id, e.target.value);
                              }
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg border-0 focus:outline-none cursor-pointer"
                          >
                            <option value="">Cobrar...</option>
                            <option value="efectivo">Cobrar Efectivo</option>
                            <option value="transferencia">Cobrar Transferencia</option>
                            <option value="tarjeta">Cobrar Tarjeta</option>
                            <option value="debito">Cobrar Débito</option>
                          </select>
                          <button
                            onClick={() => handleCancelOrder(sale.id)}
                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 border border-red-500/20 transition-all"
                            title="Cancelar orden"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: POS Checkout Ticket / Carrito */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-6 sticky top-24">
            
            {/* Header ticket */}
            <div className="border-b border-border pb-4">
              <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                <Receipt className="w-5 h-5 text-primary" /> Ticket Actual
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Mostrador del Box</p>
            </div>

            {/* Cart list */}
            <div className="space-y-3 max-h-[30vh] overflow-y-auto pr-1">
              {cart.length === 0 ? (
                <div className="text-center py-10 bg-muted/20 rounded-xl border border-border border-dashed">
                  <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground">Agregá productos al ticket.</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div 
                    key={item.id}
                    className="p-3 rounded-xl bg-muted/30 border border-border flex justify-between items-center gap-2 animate-in fade-in zoom-in-95 duration-150"
                  >
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-foreground truncate">{item.name}</h4>
                      <span className="text-[10px] text-primary font-black mt-0.5 block">
                        ${item.price.toLocaleString("es-AR")}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border">
                        <button
                          onClick={() => decrementQuantity(item.id)}
                          className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all text-xs font-bold"
                        >
                          -
                        </button>
                        <span className="text-xs font-black text-foreground min-w-[15px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => incrementQuantity(item.id)}
                          className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all text-xs font-bold"
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-muted-foreground hover:text-destructive p-1.5 rounded-lg transition-all hover:bg-destructive/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Ticket Details Form */}
            <div className="space-y-4 pt-4 border-t border-border">
              
              {/* Select Student */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1">
                  <User className="w-3 h-3" /> Asociar a Alumno
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => {
                    setSelectedStudentId(e.target.value);
                    if (e.target.value) {
                      setBuyerName("");
                      setBuyerContact("");
                    }
                  }}
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-ring cursor-pointer"
                >
                  <option value="">Invitado / Consumidor Final</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name} {student.email ? `(${student.email})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Guest Details (Conditional) */}
              {!selectedStudentId && (
                <div className="space-y-3 p-3 rounded-xl bg-muted/30 border border-border animate-in fade-in zoom-in-95 duration-200">
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Nombre del Invitado</label>
                    <input
                      type="text"
                      placeholder="Ej. Juan Pérez"
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      className="w-full bg-background border border-input rounded-lg px-3 py-1.5 text-xs text-foreground placeholder-muted-foreground/40 focus:outline-none focus:border-ring"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Contacto WhatsApp</label>
                    <input
                      type="tel"
                      placeholder="Ej. 11 1234 5678"
                      value={buyerContact}
                      onChange={(e) => setBuyerContact(e.target.value)}
                      className="w-full bg-background border border-input rounded-lg px-3 py-1.5 text-xs text-foreground placeholder-muted-foreground/40 focus:outline-none focus:border-ring"
                    />
                  </div>
                </div>
              )}

              {/* Payment Methods */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1">
                  <CreditCard className="w-3 h-3" /> Método de Pago
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: "efectivo", label: "Efectivo" },
                    { key: "transferencia", label: "Transferencia" },
                    { key: "tarjeta", label: "Tarjeta" },
                    { key: "debito", label: "Débito" },
                    { key: "deuda", label: "Anotar Cuenta", style: selectedStudentId ? "text-amber-600 bg-amber-500/10 border-amber-500/20" : "opacity-30 cursor-not-allowed" }
                  ].map((method) => {
                    const disabled = method.key === "deuda" && !selectedStudentId;
                    return (
                      <button
                        key={method.key}
                        type="button"
                        disabled={disabled}
                        onClick={() => !disabled && setPaymentMethod(method.key)}
                        className={`py-2 px-3 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all text-center ${
                          method.style || ""
                        } ${
                          paymentMethod === method.key
                            ? "bg-primary border-primary text-white shadow-sm"
                            : "bg-background border-input text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {method.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Total & Submit */}
            <div className="space-y-4 pt-4 border-t border-border">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Total ticket:</span>
                <span className="text-2xl font-black text-foreground">
                  ${cartTotal.toLocaleString("es-AR")}
                </span>
              </div>

              <button
                onClick={handleCheckout}
                disabled={cart.length === 0 || isProcessingSale}
                className="w-full bg-primary hover:bg-orange-600 text-white font-black py-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-30 disabled:pointer-events-none hover:scale-[1.01]"
              >
                {isProcessingSale ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {paymentMethod === "deuda" ? "Anotar como Deuda" : "Confirmar Cobro"}
              </button>
            </div>

          </div>
        </div>

      </div>

      {/* Product Admin CRUD Modal (ABM) */}
      {isInventoryOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-card border border-border rounded-3xl p-6 shadow-2xl relative text-foreground">
            
            <button 
              onClick={() => setIsInventoryOpen(false)}
              className="absolute top-5 right-5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-left">
              <div>
                <h3 className="text-xl font-black text-foreground">
                  {editingProduct ? "Editar Catálogo" : "Nuevo Producto"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {editingProduct ? `Modificando: ${editingProduct.name}` : "Cargá un nuevo producto al mostrador"}
                </p>
              </div>

              <hr className="border-border" />

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Nombre del Producto *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Agua Mineral 500ml"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-xs text-foreground placeholder-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Precio de Venta ($) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    placeholder="Ej. 1200"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-xs text-foreground placeholder-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Stock Inicial *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="Ej. 24"
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value)}
                    className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-xs text-foreground placeholder-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Categoría</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                  >
                    <option value="drinks">Bebidas / Canteen</option>
                    <option value="supplements">Suplementos</option>
                    <option value="clothing">Indumentaria / Ropa</option>
                    <option value="other">Otros</option>
                  </select>
                </div>

                <div className="space-y-1 flex flex-col justify-end">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-2">Visibilidad</label>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formActive}
                      onChange={(e) => setFormActive(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-muted border border-input rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-checked:after:bg-white" />
                    <span className="ml-3 text-xs font-bold text-muted-foreground">
                      {formActive ? "Activo" : "Pausado"}
                    </span>
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">URL de la Imagen (Opcional)</label>
                <input
                  type="url"
                  placeholder="https://ejemplo.com/imagen.jpg"
                  value={formImageUrl}
                  onChange={(e) => setFormImageUrl(e.target.value)}
                  className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-xs text-foreground placeholder-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Descripción / Notas</label>
                <textarea
                  rows={2}
                  placeholder="Ej. Agua mineral sin gas fresca embotellada."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-xs text-foreground placeholder-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring resize-none"
                />
              </div>

              <hr className="border-border pt-2" />

              <button
                type="submit"
                disabled={isSavingProduct}
                className="w-full bg-primary hover:bg-orange-600 text-white font-black py-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm"
              >
                {isSavingProduct ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {editingProduct ? "Guardar Cambios" : "Agregar Catálogo"}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
