"use client";

import React, { useState } from "react";
import {
  TrendingUp, TrendingDown, DollarSign, Receipt, Users, Plus, X, Check, Lock,
  Building, ShoppingBag, Calendar, Layers, PlusCircle, Sparkles, CreditCard,
  Percent, ArrowRight, ShieldAlert, BadgeAlert, AlertCircle, ShoppingCart, Trash2
} from "lucide-react";

// Types
type PlanName = "basic" | "standard" | "premium";

interface Product {
  id: string;
  name: string;
  price: number;
  cost: number;
  stock: number;
}

interface Branch {
  id: string;
  name: string;
  address: string;
  active: boolean;
}

interface Transaction {
  id: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  description: string;
  date: string;
}

interface Professor {
  id: string;
  name: string;
  paymentType: "fixed" | "per_class" | "per_hour";
  rate: number;
  classesTaught: number;
}

export default function MockFinanzasPage() {
  // Plan Simulation State
  const [currentPlan, setCurrentPlan] = useState<PlanName>("premium");
  const [activeTab, setActiveTab] = useState<"plans" | "branches" | "pos" | "finance">("plans");

  // Sucursales State
  const [branches, setBranches] = useState<Branch[]>([
    { id: "1", name: "Sede Belgrano", address: "Av. Cabildo 1500, CABA", active: true },
    { id: "2", name: "Sede San Isidro", address: "Av. del Libertador 14200, San Isidro", active: true }
  ]);
  const [newBranchName, setNewBranchName] = useState("");
  const [newBranchAddress, setNewBranchAddress] = useState("");

  // POS State
  const [products, setProducts] = useState<Product[]>([
    { id: "1", name: "Agua Mineral 500ml", price: 1500, cost: 600, stock: 45 },
    { id: "2", name: "Proteína Whey Shake", price: 4000, cost: 2200, stock: 20 },
    { id: "3", name: "Barra Energética Avena", price: 1200, cost: 500, stock: 60 },
    { id: "4", name: "Bebida Isotónica 750ml", price: 2200, cost: 1000, stock: 30 },
    { id: "5", name: "Remera Oficial Wolfpack", price: 18000, cost: 9000, stock: 15 },
    { id: "6", name: "Day Pass / Pase Diario", price: 5000, cost: 0, stock: 999 },
    { id: "7", name: "Cinta Kinesiológica", price: 3500, cost: 1500, stock: 12 },
    { id: "8", name: "Toalla Wolfpack Mediana", price: 7500, cost: 3500, stock: 18 },
    { id: "9", name: "Magnesio Deportivo 200g", price: 4500, cost: 2000, stock: 25 },
    { id: "10", name: "Soga de Salto Ajustable", price: 12000, cost: 5500, stock: 8 }
  ]);
  const [newProdName, setNewProdName] = useState("");
  const [newProdPrice, setNewProdPrice] = useState("");
  const [newProdCost, setNewProdCost] = useState("");
  const [newProdStock, setNewProdStock] = useState("");
  const [posCart, setPosCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "transfer" | "card">("cash");

  // Finance / P&L State
  const [transactions, setTransactions] = useState<Transaction[]>([
    { id: "1", type: "income", category: "membership", amount: 2850000, description: "Cuotas alumnos - Junio", date: "2026-06-15" },
    { id: "2", type: "income", category: "pos_sale", amount: 480000, description: "Ventas POS mostrador", date: "2026-06-16" },
    { id: "3", type: "expense", category: "provider_payment", amount: 980000, description: "Pago proveedor equipamiento", date: "2026-06-10" },
    { id: "4", type: "expense", category: "salary", amount: 450000, description: "Sueldos profesores", date: "2026-06-12" },
    { id: "5", type: "expense", category: "rent", amount: 350000, description: "Alquiler Sede Belgrano", date: "2026-06-05" }
  ]);

  // Professors (Salary logic) State
  const [professors, setProfessors] = useState<Professor[]>([
    { id: "1", name: "Prof. Seba (WODs)", paymentType: "per_class", rate: 3500, classesTaught: 32 },
    { id: "2", name: "Prof. Fede (Prep Física)", paymentType: "per_hour", rate: 4000, classesTaught: 24 },
    { id: "3", name: "Coaches Auxiliares", paymentType: "fixed", rate: 250000, classesTaught: 0 }
  ]);
  const [selectedProfId, setSelectedProfId] = useState("1");
  const [editRate, setEditRate] = useState("3500");
  const [editClasses, setEditClasses] = useState("32");

  // Plan limits validation variables
  const planLimits = {
    basic: { maxStudents: 50, maxProfessors: 1, maxBranches: 1, maxPosProducts: 10, hasFinance: false, label: "Básico" },
    standard: { maxStudents: 150, maxProfessors: 3, maxBranches: 1, maxPosProducts: 50, hasFinance: false, label: "Estándar" },
    premium: { maxStudents: 9999, maxProfessors: 9999, maxBranches: 99, maxPosProducts: 9999, hasFinance: true, label: "Premium" }
  }[currentPlan];

  // Helper formats
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(amount);
  };

  // Actions
  const handleAddBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;

    if (branches.length >= planLimits.maxBranches) {
      alert(`Límite excedido: Tu plan actual (${planLimits.label}) permite un máximo de ${planLimits.maxBranches} sucursal(es).`);
      return;
    }

    const newB: Branch = {
      id: Math.random().toString(),
      name: newBranchName,
      address: newBranchAddress || "Sin dirección",
      active: true
    };
    setBranches([...branches, newB]);
    setNewBranchName("");
    setNewBranchAddress("");
  };

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim() || !newProdPrice) return;

    if (products.length >= planLimits.maxPosProducts) {
      alert(`Límite de Productos Excedido: Tu plan actual (${planLimits.label}) permite un máximo de ${planLimits.maxPosProducts} productos en catálogo.`);
      return;
    }

    const newP: Product = {
      id: Math.random().toString(),
      name: newProdName,
      price: parseFloat(newProdPrice) || 0,
      cost: parseFloat(newProdCost) || 0,
      stock: parseInt(newProdStock) || 0
    };
    setProducts([...products, newP]);
    setNewProdName("");
    setNewProdPrice("");
    setNewProdCost("");
    setNewProdStock("");
  };

  const addToCart = (product: Product) => {
    if (product.stock <= 0 && product.name !== "Day Pass / Pase Diario") {
      alert("Producto sin stock");
      return;
    }
    const existing = posCart.find(item => item.product.id === product.id);
    if (existing) {
      setPosCart(posCart.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setPosCart([...posCart, { product, quantity: 1 }]);
    }
  };

  const checkoutCart = () => {
    if (posCart.length === 0) return;
    const total = posCart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

    // Record transaction
    const newTx: Transaction = {
      id: Math.random().toString(),
      type: "income",
      category: "pos_sale",
      amount: total,
      description: `Venta POS: ${posCart.map(i => `${i.quantity}x ${i.product.name}`).join(", ")}`,
      date: new Date().toISOString().split("T")[0]
    };

    setTransactions([newTx, ...transactions]);

    // Deduct stock
    setProducts(products.map(p => {
      const cartItem = posCart.find(i => i.product.id === p.id);
      if (cartItem && p.name !== "Day Pass / Pase Diario") {
        return { ...p, stock: Math.max(0, p.stock - cartItem.quantity) };
      }
      return p;
    }));

    setPosCart([]);
    alert(`Venta registrada exitosamente por ${formatCurrency(total)} via ${paymentMethod === "cash" ? "Efectivo" : paymentMethod === "transfer" ? "Transferencia" : "Tarjeta"}`);
  };

  // Salary Calculator helper
  const handleUpdateProf = (e: React.FormEvent) => {
    e.preventDefault();
    setProfessors(professors.map(p => p.id === selectedProfId ? {
      ...p,
      rate: parseFloat(editRate) || 0,
      classesTaught: parseInt(editClasses) || 0
    } : p));
  };

  const getSalaryCalculation = (prof: Professor) => {
    if (prof.paymentType === "fixed") return prof.rate;
    if (prof.paymentType === "per_class") return prof.rate * prof.classesTaught;
    return prof.rate * prof.classesTaught; // Assuming hourly is mapped identically for demo
  };

  const recordSalaryPayment = (prof: Professor) => {
    const amount = getSalaryCalculation(prof);
    const newTx: Transaction = {
      id: Math.random().toString(),
      type: "expense",
      category: "salary",
      amount,
      description: `Liquidación Sueldo: ${prof.name} (${prof.paymentType === "fixed" ? "Fijo" : `${prof.classesTaught} clases`})`,
      date: new Date().toISOString().split("T")[0]
    };
    setTransactions([newTx, ...transactions]);
    alert(`Liquidación de sueldo registrada: ${prof.name} por ${formatCurrency(amount)}`);
  };

  // Calculate totals
  const totalIncome = transactions.filter(t => t.type === "income").reduce((a, t) => a + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === "expense").reduce((a, t) => a + t.amount, 0);
  const netEarnings = totalIncome - totalExpense;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Simulation Banner */}
      <div className="bg-gradient-to-r from-orange-600 to-amber-500 rounded-3xl p-6 shadow-xl text-white flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 animate-pulse" />
            <h2 className="text-xl font-black tracking-tight">Simulador de Planes de Suscripción</h2>
          </div>
          <p className="text-sm text-orange-50/90 mt-1">
            Esta vista te permite probar de forma 100% local cómo se limita el software según el plan contratado por el gimnasio.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-black/20 p-1.5 rounded-2xl border border-white/10 shrink-0">
          {(["basic", "standard", "premium"] as const).map(plan => (
            <button
              key={plan}
              onClick={() => {
                setCurrentPlan(plan);
                if (plan !== "premium" && activeTab === "finance") {
                  setActiveTab("plans");
                }
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                currentPlan === plan
                  ? "bg-white text-orange-600 shadow-md"
                  : "text-white/80 hover:bg-white/5 hover:text-white"
              }`}
            >
              {plan === "basic" ? "Básico" : plan === "standard" ? "Estándar" : "Premium (Full)"}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex bg-white/40 backdrop-blur-md p-1.5 rounded-2xl border border-gray-200/50 shadow-sm max-w-2xl">
        <button
          onClick={() => setActiveTab("plans")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === "plans" ? "bg-orange-600 text-white shadow-md" : "text-gray-600 hover:bg-gray-100/50"
          }`}
        >
          <Layers className="w-4 h-4" />
          Planes y Límites
        </button>
        <button
          onClick={() => setActiveTab("branches")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === "branches" ? "bg-orange-600 text-white shadow-md" : "text-gray-600 hover:bg-gray-100/50"
          }`}
        >
          <Building className="w-4 h-4" />
          Sedes ({branches.length})
        </button>
        <button
          onClick={() => setActiveTab("pos")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === "pos" ? "bg-orange-600 text-white shadow-md" : "text-gray-600 hover:bg-gray-100/50"
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          Punto de Venta (POS)
        </button>
        <button
          onClick={() => {
            if (!planLimits.hasFinance) {
              alert("Bloqueado: El módulo de Finanzas PyL está disponible únicamente en el Plan Premium.");
              return;
            }
            setActiveTab("finance");
          }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all relative ${
            activeTab === "finance" ? "bg-orange-600 text-white shadow-md" : "text-gray-600 hover:bg-gray-100/50"
          } ${!planLimits.hasFinance ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <TrendingUp className="w-4 h-4" />
          Finanzas (PyL)
          {!planLimits.hasFinance && <Lock className="w-3.5 h-3.5 text-gray-500 absolute top-1 right-2" />}
        </button>
      </div>

      {/* Tabs Content */}
      <div className="space-y-6">

        {/* TAB 1: PLANS OVERVIEW */}
        {activeTab === "plans" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Basic Card */}
            <div className={`bg-white rounded-3xl p-6 border-2 transition-all flex flex-col justify-between ${currentPlan === "basic" ? "border-orange-500 ring-2 ring-orange-500/20" : "border-gray-200"}`}>
              <div className="space-y-4">
                <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Plan Básico</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-gray-900">$18.000</span>
                  <span className="text-gray-500 text-sm">/mes</span>
                </div>
                <p className="text-sm text-gray-600">Ideal para entrenadores independientes que inician.</p>
                <div className="space-y-2 border-t border-gray-100 pt-4">
                  <div className="flex items-center gap-2 text-sm text-gray-700"><Check className="w-4 h-4 text-green-500" /> Hasta 50 alumnos</div>
                  <div className="flex items-center gap-2 text-sm text-gray-700"><Check className="w-4 h-4 text-green-500" /> 1 Profesor (Dueño)</div>
                  <div className="flex items-center gap-2 text-sm text-gray-700"><Check className="w-4 h-4 text-green-500" /> 1 Sucursal física</div>
                  <div className="flex items-center gap-2 text-sm text-gray-700"><Check className="w-4 h-4 text-green-500" /> POS Básico (hasta 10 prod.)</div>
                  <div className="flex items-center gap-2 text-sm text-gray-400 line-through"><X className="w-4 h-4 text-red-400" /> WODs de CrossFit</div>
                  <div className="flex items-center gap-2 text-sm text-gray-400 line-through"><X className="w-4 h-4 text-red-400" /> Finanzas & PyL</div>
                </div>
              </div>
              <button
                onClick={() => setCurrentPlan("basic")}
                className="w-full mt-6 py-2.5 rounded-xl border border-orange-500 text-orange-600 font-bold hover:bg-orange-50 transition-colors"
              >
                Activar Plan Básico
              </button>
            </div>

            {/* Standard Card */}
            <div className={`bg-white rounded-3xl p-6 border-2 transition-all flex flex-col justify-between ${currentPlan === "standard" ? "border-orange-500 ring-2 ring-orange-500/20" : "border-gray-200"}`}>
              <div className="space-y-4">
                <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Plan Estándar</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-gray-900">$42.000</span>
                  <span className="text-gray-500 text-sm">/mes</span>
                </div>
                <p className="text-sm text-gray-600">Perfecto para boxes en crecimiento.</p>
                <div className="space-y-2 border-t border-gray-100 pt-4">
                  <div className="flex items-center gap-2 text-sm text-gray-700"><Check className="w-4 h-4 text-green-500" /> Hasta 150 alumnos</div>
                  <div className="flex items-center gap-2 text-sm text-gray-700"><Check className="w-4 h-4 text-green-500" /> Hasta 3 profesores</div>
                  <div className="flex items-center gap-2 text-sm text-gray-700"><Check className="w-4 h-4 text-green-500" /> 1 Sucursal física</div>
                  <div className="flex items-center gap-2 text-sm text-gray-700"><Check className="w-4 h-4 text-green-500" /> WODs e Importador de planillas</div>
                  <div className="flex items-center gap-2 text-sm text-gray-700"><Check className="w-4 h-4 text-green-500" /> POS Intermedio (hasta 50 prod.)</div>
                  <div className="flex items-center gap-2 text-sm text-gray-400 line-through"><X className="w-4 h-4 text-red-400" /> Finanzas & PyL</div>
                </div>
              </div>
              <button
                onClick={() => setCurrentPlan("standard")}
                className="w-full mt-6 py-2.5 rounded-xl border border-orange-500 text-orange-600 font-bold hover:bg-orange-50 transition-colors"
              >
                Activar Plan Estándar
              </button>
            </div>

            {/* Premium Card */}
            <div className={`bg-white rounded-3xl p-6 border-2 transition-all flex flex-col justify-between ${currentPlan === "premium" ? "border-orange-500 ring-2 ring-orange-500/20" : "border-gray-200"}`}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Plan Premium</span>
                  <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-md font-bold uppercase">Multi-Sede</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-gray-900">$78.000</span>
                  <span className="text-gray-500 text-sm">/mes</span>
                </div>
                <p className="text-sm text-gray-600">Para boxes de alta escala y finanzas consolidadas.</p>
                <div className="space-y-2 border-t border-gray-100 pt-4">
                  <div className="flex items-center gap-2 text-sm text-gray-700"><Check className="w-4 h-4 text-green-500" /> Alumnos ilimitados</div>
                  <div className="flex items-center gap-2 text-sm text-gray-700"><Check className="w-4 h-4 text-green-500" /> Profesores ilimitados</div>
                  <div className="flex items-center gap-2 text-sm text-gray-700"><Check className="w-4 h-4 text-green-500" /> Múltiples sucursales físicas</div>
                  <div className="flex items-center gap-2 text-sm text-gray-700"><Check className="w-4 h-4 text-green-500" /> POS e Inventario Ilimitado</div>
                  <div className="flex items-center gap-2 text-sm text-gray-700"><Check className="w-4 h-4 text-green-500" /> Módulo de Finanzas & PyL completo</div>
                </div>
              </div>
              <button
                onClick={() => setCurrentPlan("premium")}
                className="w-full mt-6 py-2.5 rounded-xl bg-orange-600 text-white font-bold hover:bg-orange-700 transition-colors shadow-lg shadow-orange-600/20"
              >
                Activar Plan Premium
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: BRANCHES */}
        {activeTab === "branches" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Form */}
            <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-4">
              <h3 className="font-bold text-gray-900">Agregar Sucursal Física</h3>
              <p className="text-xs text-gray-500">
                Tu plan actual ({planLimits.label}) te permite hasta {planLimits.maxBranches} sedes.
              </p>
              <form onSubmit={handleAddBranch} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600">Nombre de la Sede</label>
                  <input
                    type="text"
                    value={newBranchName}
                    onChange={e => setNewBranchName(e.target.value)}
                    placeholder="Ej. Sede Recoleta"
                    className="w-full mt-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">Dirección</label>
                  <input
                    type="text"
                    value={newBranchAddress}
                    onChange={e => setNewBranchAddress(e.target.value)}
                    placeholder="Ej. Av. Santa Fe 2300"
                    className="w-full mt-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-orange-600 text-white font-bold hover:bg-orange-700 transition-colors shadow-md"
                >
                  Guardar Sucursal
                </button>
              </form>
            </div>

            {/* List */}
            <div className="md:col-span-2 bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-4">
              <h3 className="font-bold text-gray-900">Sedes Registradas ({branches.length})</h3>
              <div className="divide-y divide-gray-100">
                {branches.map(branch => (
                  <div key={branch.id} className="py-4 flex items-center justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                        <Building className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">{branch.name}</h4>
                        <p className="text-xs text-gray-500 mt-0.5">{branch.address}</p>
                      </div>
                    </div>
                    <span className="bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">Activa</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: POS */}
        {activeTab === "pos" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* POS Catalog */}
            <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900">Catálogo del POS</h3>
                <span className="text-xs text-gray-500">
                  Límite del Plan: {products.length} / {planLimits.maxPosProducts === 9999 ? "∞" : planLimits.maxPosProducts} productos
                </span>
              </div>

              {/* Add Product Inline */}
              <form onSubmit={handleAddProduct} className="grid grid-cols-2 md:grid-cols-5 gap-2 bg-gray-55 p-3 rounded-2xl border border-gray-200/50">
                <input
                  type="text"
                  placeholder="Nombre"
                  value={newProdName}
                  onChange={e => setNewProdName(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs col-span-2 md:col-span-2 bg-white"
                />
                <input
                  type="number"
                  placeholder="Precio"
                  value={newProdPrice}
                  onChange={e => setNewProdPrice(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs bg-white"
                />
                <input
                  type="number"
                  placeholder="Costo"
                  value={newProdCost}
                  onChange={e => setNewProdCost(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs bg-white"
                />
                <button
                  type="submit"
                  className="bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold text-xs py-1.5 transition-colors"
                >
                  + Agregar
                </button>
              </form>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {products.map(product => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="p-3 bg-white hover:bg-orange-55 border border-gray-200 rounded-2xl text-left hover:border-orange-500 transition-all group flex flex-col justify-between gap-3"
                  >
                    <div>
                      <h4 className="font-bold text-gray-800 group-hover:text-orange-600 transition-colors text-sm truncate">{product.name}</h4>
                      <span className="text-xs text-gray-500">Stock: {product.stock === 999 ? "∞" : product.stock}</span>
                    </div>
                    <span className="text-sm font-black text-gray-900">{formatCurrency(product.price)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Shopping Cart / Cash Register */}
            <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-orange-600" />
                  Mostrador / Caja
                </h3>

                {posCart.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 text-sm">
                    El carrito está vacío. Haz clic en un producto para agregarlo.
                  </div>
                ) : (
                  <div className="space-y-3 mt-4 divide-y divide-gray-100 max-h-60 overflow-y-auto pr-1">
                    {posCart.map(item => (
                      <div key={item.product.id} className="flex items-center justify-between pt-2">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-800 truncate">{item.product.name}</p>
                          <p className="text-[10px] text-gray-500">{item.quantity} x {formatCurrency(item.product.price)}</p>
                        </div>
                        <button
                          onClick={() => setPosCart(posCart.filter(i => i.product.id !== item.product.id))}
                          className="p-1 rounded-md text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {posCart.length > 0 && (
                <div className="space-y-4 border-t border-gray-100 pt-4">
                  <div className="flex items-center justify-between font-black text-gray-900 text-lg">
                    <span>Total:</span>
                    <span>{formatCurrency(posCart.reduce((a, i) => a + i.product.price * i.quantity, 0))}</span>
                  </div>

                  {/* Payment Method Selector */}
                  <div className="grid grid-cols-3 gap-1 bg-gray-105 p-1 rounded-xl text-xs">
                    {(["cash", "transfer", "card"] as const).map(method => (
                      <button
                        key={method}
                        onClick={() => setPaymentMethod(method)}
                        className={`py-1.5 rounded-lg font-bold transition-all ${
                          paymentMethod === method ? "bg-white text-gray-950 shadow-sm" : "text-gray-600"
                        }`}
                      >
                        {method === "cash" ? "Efectivo" : method === "transfer" ? "Transf." : "Tarj."}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={checkoutCart}
                    className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-lg shadow-orange-600/25 transition-all text-sm"
                  >
                    Confirmar Cobro
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: FINANCE (P&L) */}
        {activeTab === "finance" && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Ingresos Netos</p>
                  <p className="text-2xl font-black text-green-600 mt-1">{formatCurrency(totalIncome)}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Egresos Totales</p>
                  <p className="text-2xl font-black text-red-600 mt-1">{formatCurrency(totalExpense)}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center shrink-0">
                  <TrendingDown className="w-6 h-6 text-red-600" />
                </div>
              </div>
              <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Resultado (PyL)</p>
                  <p className={`text-2xl font-black mt-1 ${netEarnings >= 0 ? "text-orange-600" : "text-red-700"}`}>
                    {formatCurrency(netEarnings)}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center shrink-0">
                  <DollarSign className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </div>

            {/* Split layout: Charts & Logs */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Financial Logs */}
              <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-4">
                <h3 className="font-bold text-gray-900">Libro Diario / Flujo de Caja</h3>
                <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto pr-2">
                  {transactions.map(tx => (
                    <div key={tx.id} className="py-3.5 flex items-center justify-between text-sm">
                      <div className="min-w-0">
                        <p className="font-bold text-gray-800 truncate">{tx.description}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5 capitalize">{tx.category} · {tx.date}</p>
                      </div>
                      <span className={`font-black shrink-0 ${tx.type === "income" ? "text-green-600" : "text-red-500"}`}>
                        {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Salary Liquidation Panel */}
              <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-4">
                <h3 className="font-bold text-gray-900">Liquidador de Sueldos</h3>
                <p className="text-xs text-gray-500">Calcula los honorarios de los profesores en base a clases dictadas en el mes.</p>

                {/* Edit Config Mock Form */}
                <form onSubmit={handleUpdateProf} className="bg-gray-50 p-4 rounded-2xl border border-gray-200/50 space-y-3">
                  <div className="flex gap-2">
                    <select
                      value={selectedProfId}
                      onChange={e => {
                        const id = e.target.value;
                        setSelectedProfId(id);
                        const p = professors.find(p => p.id === id)!;
                        setEditRate(p.rate.toString());
                        setEditClasses(p.classesTaught.toString());
                      }}
                      className="flex-1 px-2 py-1.5 rounded-lg border border-gray-200 text-xs bg-white"
                    >
                      {professors.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  {professors.find(p => p.id === selectedProfId)?.paymentType !== "fixed" && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-gray-500">Tarifa por Clase</label>
                        <input
                          type="number"
                          value={editRate}
                          onChange={e => setEditRate(e.target.value)}
                          className="w-full mt-1 px-2 py-1.5 rounded-lg border border-gray-200 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-500">Clases Dictadas</label>
                        <input
                          type="number"
                          value={editClasses}
                          onChange={e => setEditClasses(e.target.value)}
                          className="w-full mt-1 px-2 py-1.5 rounded-lg border border-gray-200 text-xs"
                        />
                      </div>
                    </div>
                  )}
                  <button
                    type="submit"
                    className="w-full py-1.5 rounded-lg bg-orange-600 text-white font-bold text-xs"
                  >
                    Actualizar Datos de Simulación
                  </button>
                </form>

                {/* Professor Salary Calculation Render */}
                <div className="space-y-3 pt-2">
                  {professors.map(prof => {
                    const salary = getSalaryCalculation(prof);
                    return (
                      <div key={prof.id} className="bg-white rounded-2xl p-4 border border-gray-100 flex flex-col justify-between gap-3 shadow-sm hover:shadow-md transition-all">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-gray-800 text-sm">{prof.name}</h4>
                            <p className="text-[10px] text-gray-500 capitalize mt-0.5">
                              {prof.paymentType === "fixed" ? "Sueldo Fijo Mensual" : `Tarifa: ${formatCurrency(prof.rate)} por clase`}
                            </p>
                          </div>
                          <span className="text-sm font-black text-gray-900">{formatCurrency(salary)}</span>
                        </div>
                        {prof.paymentType !== "fixed" && (
                          <p className="text-xs text-gray-500">
                            {prof.classesTaught} clases dictadas en el período.
                          </p>
                        )}
                        <button
                          onClick={() => recordSalaryPayment(prof)}
                          className="w-full mt-2 py-1.5 rounded-lg border border-gray-200 hover:border-orange-500 text-gray-700 hover:text-orange-600 text-xs font-bold transition-all"
                        >
                          Registrar Liquidación en PyL
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
