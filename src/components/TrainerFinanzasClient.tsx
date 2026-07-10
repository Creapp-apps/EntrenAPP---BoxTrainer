"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Building2,
  Calendar,
  Plus,
  Trash2,
  Check,
  X,
  CreditCard,
  Pencil,
  Info,
  Clock,
  Layers
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import Select from "@/components/ui/Select";

type Transaction = {
  id: string;
  type: "income" | "expense";
  category: "membership" | "pos_sale" | "provider_payment" | "salary" | "rent" | "services" | "other";
  amount: number;
  description: string | null;
  transaction_date: string;
  reference_id: string | null;
  created_at: string;
};

type Professor = {
  id: string;
  full_name: string;
  email: string;
  payment_config?: {
    id: string;
    payment_type: "fixed" | "per_class" | "per_hour";
    rate: number;
  } | null;
};

type SalaryPayment = {
  id: string;
  employee_name: string;
  amount: number;
  payment_date: string;
  period: string;
  notes: string | null;
};

type ProviderPayment = {
  id: string;
  provider_name: string;
  amount: number;
  status: "paid" | "pending";
  due_date: string;
  payment_date: string | null;
  notes: string | null;
};

type FinanceAsset = {
  id: string;
  name: string;
  type: "asset" | "liability";
  value: number;
  purchase_date: string | null;
  notes: string | null;
};

type TrainerFinanzasClientProps = {
  boxId: string;
  activeTab: "pyl" | "sueldos" | "proveedores" | "patrimonio";
};

export default function TrainerFinanzasClient({ boxId, activeTab }: TrainerFinanzasClientProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Data states
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [salaryPayments, setSalaryPayments] = useState<SalaryPayment[]>([]);
  const [providerPayments, setProviderPayments] = useState<ProviderPayment[]>([]);
  const [assets, setAssets] = useState<FinanceAsset[]>([]);

  // Modals & form states
  const [showAddTx, setShowAddTx] = useState(false);
  const [txForm, setTxForm] = useState({
    type: "expense" as "income" | "expense",
    category: "rent" as any,
    amount: "",
    description: "",
    transaction_date: new Date().toISOString().split("T")[0]
  });

  // Salary Calculator temporary values
  const [calcUnits, setCalcUnits] = useState<Record<string, number>>({});
  const [editingProfConfig, setEditingProfConfig] = useState<string | null>(null);
  const [profConfigForm, setProfConfigForm] = useState({
    payment_type: "per_class" as "fixed" | "per_class" | "per_hour",
    rate: ""
  });

  // Provider Form State
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [providerForm, setProviderForm] = useState({
    provider_name: "",
    amount: "",
    due_date: new Date().toISOString().split("T")[0],
    status: "pending" as "paid" | "pending",
    notes: ""
  });

  // Patrimonio Form State
  const [editingAsset, setEditingAsset] = useState<FinanceAsset | null>(null);
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [assetForm, setAssetForm] = useState({
    name: "",
    type: "asset" as "asset" | "liability",
    value: "",
    purchase_date: new Date().toISOString().split("T")[0],
    notes: ""
  });

  useEffect(() => {
    loadAllFinancialData();
  }, [boxId, activeTab]);

  async function loadAllFinancialData() {
    setLoading(true);
    const supabase = createClient();

    try {
      if (activeTab === "pyl") {
        const { data: txData } = await supabase
          .from("finance_transactions")
          .select("*")
          .eq("box_id", boxId)
          .order("transaction_date", { ascending: false });
        setTransactions(txData || []);
      } else if (activeTab === "sueldos") {
        const [profRes, configsRes, salariesRes] = await Promise.all([
          supabase.from("users").select("id, full_name, email").eq("box_id", boxId).eq("role", "professor"),
          supabase.from("professor_payment_configs").select("*"),
          supabase.from("finance_salaries").select("*").eq("box_id", boxId).order("payment_date", { ascending: false })
        ]);

        const profList: Professor[] = (profRes.data || []).map((p: any) => {
          const cfg = (configsRes.data || []).find((c: any) => c.professor_id === p.id);
          return {
            id: p.id,
            full_name: p.full_name || p.email,
            email: p.email,
            payment_config: cfg ? { id: cfg.id, payment_type: cfg.payment_type, rate: Number(cfg.rate) } : null
          };
        });

        setProfessors(profList);
        setSalaryPayments(salariesRes.data || []);
      } else if (activeTab === "proveedores") {
        const { data: provData } = await supabase
          .from("finance_provider_payments")
          .select("*")
          .eq("box_id", boxId)
          .order("due_date", { ascending: true });
        setProviderPayments(provData || []);
      } else if (activeTab === "patrimonio") {
        const { data: assetData } = await supabase
          .from("finance_assets")
          .select("*")
          .eq("box_id", boxId)
          .order("created_at", { ascending: false });
        setAssets(assetData || []);
      }
    } catch (e: any) {
      toast.error("Error cargando datos: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  // ─── TRANSACTIONS (PyL) ACTIONS ─────────────────────────────
  async function handleAddTransaction(e: React.FormEvent) {
    e.preventDefault();
    if (!txForm.amount || Number(txForm.amount) <= 0) {
      toast.error("Ingresá un monto válido");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("finance_transactions").insert({
      box_id: boxId,
      type: txForm.type,
      category: txForm.category,
      amount: Number(txForm.amount),
      description: txForm.description.trim() || null,
      transaction_date: txForm.transaction_date
    });

    if (error) {
      toast.error("Error al registrar transacción: " + error.message);
    } else {
      toast.success("Transacción registrada");
      setShowAddTx(false);
      setTxForm({
        type: "expense",
        category: "rent",
        amount: "",
        description: "",
        transaction_date: new Date().toISOString().split("T")[0]
      });
      await loadAllFinancialData();
    }
    setSaving(false);
  }

  async function handleDeleteTransaction(id: string) {
    if (!confirm("¿Eliminar este registro de caja?")) return;

    const supabase = createClient();
    const { error } = await supabase.from("finance_transactions").delete().eq("id", id);
    if (error) {
      toast.error("Error al eliminar: " + error.message);
    } else {
      toast.success("Transacción eliminada");
      await loadAllFinancialData();
    }
  }

  // ─── SALARY ACTIONS ─────────────────────────────────────────
  async function handleSaveProfConfig(profId: string) {
    if (!profConfigForm.rate || Number(profConfigForm.rate) < 0) {
      toast.error("Monto inválido");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const existing = professors.find(p => p.id === profId)?.payment_config;

    let error;
    if (existing) {
      const res = await supabase
        .from("professor_payment_configs")
        .update({ payment_type: profConfigForm.payment_type, rate: Number(profConfigForm.rate) })
        .eq("id", existing.id);
      error = res.error;
    } else {
      const res = await supabase.from("professor_payment_configs").insert({
        professor_id: profId,
        payment_type: profConfigForm.payment_type,
        rate: Number(profConfigForm.rate)
      });
      error = res.error;
    }

    if (error) {
      toast.error("Error al guardar configuración: " + error.message);
    } else {
      toast.success("Configuración de sueldo guardada");
      setEditingProfConfig(null);
      await loadAllFinancialData();
    }
    setSaving(false);
  }

  async function handlePaySalary(prof: Professor) {
    const cfg = prof.payment_config;
    if (!cfg) {
      toast.error("Primero configura el sueldo del profesor");
      return;
    }

    const units = calcUnits[prof.id] || 0;
    const finalAmount = cfg.payment_type === "fixed" ? cfg.rate : cfg.rate * units;

    if (finalAmount <= 0) {
      toast.error("El monto calculado debe ser mayor a 0");
      return;
    }

    const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const curDate = new Date();
    const periodLabel = `${months[curDate.getMonth()]} ${curDate.getFullYear()}`;

    if (!confirm(`¿Confirmar cobro de sueldo de ${prof.full_name} por ${formatCurrency(finalAmount)} para el período ${periodLabel}?`)) {
      return;
    }

    setSaving(true);
    const supabase = createClient();

    // 1. Insert salary history record
    const { data: salaryData, error: salErr } = await supabase
      .from("finance_salaries")
      .insert({
        box_id: boxId,
        professor_id: prof.id,
        employee_name: prof.full_name,
        amount: finalAmount,
        period: periodLabel,
        notes: cfg.payment_type === "fixed" ? "Sueldo Fijo Mensual" : `${units} ${cfg.payment_type === "per_class" ? "clases" : "horas"} dictadas`
      })
      .select()
      .single();

    if (salErr) {
      toast.error("Error al registrar sueldo: " + salErr.message);
      setSaving(false);
      return;
    }

    // 2. Insert expense record into transactions
    const { error: txErr } = await supabase.from("finance_transactions").insert({
      box_id: boxId,
      type: "expense",
      category: "salary",
      amount: finalAmount,
      description: `Pago Sueldo: ${prof.full_name} (${periodLabel})`,
      reference_id: salaryData.id,
      transaction_date: new Date().toISOString().split("T")[0]
    });

    if (txErr) {
      toast.error("Advertencia: Se guardó el sueldo pero no se registró en transacciones de caja: " + txErr.message);
    } else {
      toast.success("Sueldo liquidado y registrado en libro diario");
    }

    // Reset units input
    setCalcUnits({ ...calcUnits, [prof.id]: 0 });
    await loadAllFinancialData();
    setSaving(false);
  }

  // ─── PROVIDER ACTIONS ───────────────────────────────────────
  async function handleAddProviderPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!providerForm.provider_name.trim() || !providerForm.amount || Number(providerForm.amount) <= 0) {
      toast.error("Faltan datos obligatorios");
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const payload = {
      box_id: boxId,
      provider_name: providerForm.provider_name.trim(),
      amount: Number(providerForm.amount),
      status: providerForm.status,
      due_date: providerForm.due_date,
      payment_date: providerForm.status === "paid" ? new Date().toISOString().split("T")[0] : null,
      notes: providerForm.notes.trim() || null
    };

    const { data: newProv, error: provErr } = await supabase
      .from("finance_provider_payments")
      .insert(payload)
      .select()
      .single();

    if (provErr) {
      toast.error("Error al registrar pago de proveedor: " + provErr.message);
      setSaving(false);
      return;
    }

    // If it was created as PAID, sync to finance transactions
    if (providerForm.status === "paid") {
      await supabase.from("finance_transactions").insert({
        box_id: boxId,
        type: "expense",
        category: "provider_payment",
        amount: Number(providerForm.amount),
        description: `Pago Proveedor: ${payload.provider_name}`,
        reference_id: newProv.id,
        transaction_date: payload.due_date
      });
    }

    toast.success("Proveedor registrado");
    setShowAddProvider(false);
    setProviderForm({
      provider_name: "",
      amount: "",
      due_date: new Date().toISOString().split("T")[0],
      status: "pending",
      notes: ""
    });
    await loadAllFinancialData();
    setSaving(false);
  }

  async function handleMarkProviderPaid(prov: ProviderPayment) {
    if (!confirm(`¿Marcar el pago a "${prov.provider_name}" de ${formatCurrency(prov.amount)} como Pagado?`)) return;

    setSaving(true);
    const supabase = createClient();
    const today = new Date().toISOString().split("T")[0];

    const { error: updateErr } = await supabase
      .from("finance_provider_payments")
      .update({ status: "paid", payment_date: today })
      .eq("id", prov.id);

    if (updateErr) {
      toast.error("Error al actualizar estado: " + updateErr.message);
      setSaving(false);
      return;
    }

    // Insert transaction
    const { error: txErr } = await supabase.from("finance_transactions").insert({
      box_id: boxId,
      type: "expense",
      category: "provider_payment",
      amount: prov.amount,
      description: `Pago Proveedor: ${prov.provider_name}`,
      reference_id: prov.id,
      transaction_date: today
    });

    if (txErr) {
      toast.error("Sincronización a caja fallida: " + txErr.message);
    } else {
      toast.success("Proveedor marcado como pagado e ingresado a caja");
    }

    await loadAllFinancialData();
    setSaving(false);
  }

  async function handleDeleteProvider(id: string) {
    if (!confirm("¿Eliminar este pago de proveedor? (Esto no borrará la transacción de caja si ya se pagó)")) return;

    const supabase = createClient();
    const { error } = await supabase.from("finance_provider_payments").delete().eq("id", id);

    if (error) {
      toast.error("Error al eliminar: " + error.message);
    } else {
      toast.success("Registro eliminado");
      await loadAllFinancialData();
    }
  }

  // ─── PATRIMONIO ACTIONS ─────────────────────────────────────
  async function handleAddAsset(e: React.FormEvent) {
    e.preventDefault();
    if (!assetForm.name.trim() || !assetForm.value || Number(assetForm.value) <= 0) {
      toast.error("Faltan datos obligatorios");
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const payload = {
      box_id: boxId,
      name: assetForm.name.trim(),
      type: assetForm.type,
      value: Number(assetForm.value),
      purchase_date: assetForm.purchase_date || null,
      notes: assetForm.notes.trim() || null
    };

    let error;
    if (editingAsset) {
      const res = await supabase
        .from("finance_assets")
        .update(payload)
        .eq("id", editingAsset.id);
      error = res.error;
    } else {
      const res = await supabase.from("finance_assets").insert(payload);
      error = res.error;
    }

    if (error) {
      toast.error("Error al guardar en patrimonio: " + error.message);
    } else {
      toast.success(editingAsset ? "Bien/Obligación actualizado" : "Elemento patrimonial guardado");
      resetAssetForm();
      await loadAllFinancialData();
    }
    setSaving(false);
  }

  function handleEditAsset(asset: FinanceAsset) {
    setEditingAsset(asset);
    setAssetForm({
      name: asset.name,
      type: asset.type,
      value: String(asset.value),
      purchase_date: asset.purchase_date || new Date().toISOString().split("T")[0],
      notes: asset.notes || ""
    });
    setShowAddAsset(true);
  }

  async function handleDeleteAsset(id: string) {
    if (!confirm("¿Eliminar este registro de patrimonio?")) return;

    const supabase = createClient();
    const { error } = await supabase.from("finance_assets").delete().eq("id", id);

    if (error) {
      toast.error("Error al eliminar: " + error.message);
    } else {
      toast.success("Registro eliminado");
      await loadAllFinancialData();
    }
  }

  function resetAssetForm() {
    setEditingAsset(null);
    setShowAddAsset(false);
    setAssetForm({
      name: "",
      type: "asset",
      value: "",
      purchase_date: new Date().toISOString().split("T")[0],
      notes: ""
    });
  }

  // ─── RENDER ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6 pt-4 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-white rounded-2xl border border-border" />)}
        </div>
        <div className="h-64 bg-white rounded-2xl border border-border" />
      </div>
    );
  }

  // ─── TAB 1: FLUJO DE CAJA (PyL) ──────────────────────────────
  if (activeTab === "pyl") {
    const totalIncome = transactions.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
    const netEarnings = totalIncome - totalExpense;

    return (
      <div className="space-y-6">
        {/* Resumen KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-border flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase">Ingresos Totales</span>
              <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(totalIncome)}</p>
            </div>
            <div className="bg-green-50 p-2.5 rounded-xl"><TrendingUp className="w-5 h-5 text-green-600" /></div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-border flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase">Egresos Totales</span>
              <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(totalExpense)}</p>
            </div>
            <div className="bg-red-50 p-2.5 rounded-xl"><TrendingDown className="w-5 h-5 text-red-600" /></div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-border flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase">Resultado Neto (PyL)</span>
              <p className={`text-2xl font-bold mt-1 ${netEarnings >= 0 ? "text-primary" : "text-red-700"}`}>
                {formatCurrency(netEarnings)}
              </p>
            </div>
            <div className="bg-orange-55 p-2.5 rounded-xl"><DollarSign className="w-5 h-5 text-primary" /></div>
          </div>
        </div>

        {/* Form dialog / inline */}
        {showAddTx ? (
          <div className="bg-white rounded-2xl p-6 border border-border shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-foreground">Agregar Movimiento Manual</h3>
              <button onClick={() => setShowAddTx(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleAddTransaction} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-end">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Tipo</label>
                <Select
                  value={txForm.type}
                  onChange={(val) =>
                    setTxForm({
                      ...txForm,
                      type: val as any,
                      category: val === "income" ? "membership" : "rent",
                    })
                  }
                  options={[
                    { value: "expense", label: "Egreso (Gasto)" },
                    { value: "income", label: "Ingreso (Caja)" },
                  ]}
                  triggerClassName="py-2 px-3 text-xs bg-white h-[38px] flex items-center justify-between"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Categoría</label>
                <Select
                  value={txForm.category}
                  onChange={(val) => setTxForm({ ...txForm, category: val as any })}
                  options={
                    txForm.type === "income"
                      ? [
                          { value: "membership", label: "Cuotas" },
                          { value: "pos_sale", label: "Venta POS" },
                          { value: "other", label: "Otros Ingresos" },
                        ]
                      : [
                          { value: "rent", label: "Alquiler" },
                          { value: "services", label: "Servicios (Luz/Gas/Net)" },
                          { value: "salary", label: "Sueldos" },
                          { value: "provider_payment", label: "Proveedores" },
                          { value: "other", label: "Otros Gastos" },
                        ]
                  }
                  triggerClassName="py-2 px-3 text-xs bg-white h-[38px] flex items-center justify-between"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Monto (ARS)</label>
                <input
                  type="number"
                  min="0"
                  value={txForm.amount}
                  onChange={e => setTxForm({ ...txForm, amount: e.target.value })}
                  placeholder="Monto"
                  className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Fecha</label>
                <input
                  type="date"
                  value={txForm.transaction_date}
                  onChange={e => setTxForm({ ...txForm, transaction_date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div className="col-span-1 sm:col-span-2 md:col-span-5 flex gap-2">
                <input
                  type="text"
                  value={txForm.description}
                  onChange={e => setTxForm({ ...txForm, description: e.target.value })}
                  placeholder="Descripción del movimiento (opcional)"
                  className="flex-1 px-3 py-2 rounded-xl border border-border text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-primary hover:bg-primary/90 text-white px-5 py-2 rounded-xl font-bold text-sm"
                >
                  {saving ? "Guardando..." : "Confirmar"}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="flex justify-end">
            <button
              onClick={() => setShowAddTx(true)}
              className="bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Registrar Movimiento
            </button>
          </div>
        )}

        {/* Libro Diario */}
        <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-semibold text-foreground">Libro Diario / Historial de Caja</h3>
          </div>
          {transactions.length > 0 ? (
            <div className="divide-y divide-border">
              {transactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between px-5 py-4 hover:bg-muted/10 transition-colors">
                  <div>
                    <p className="font-medium text-foreground text-sm">
                      {tx.description || `Transacción de ${tx.category}`}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 uppercase">
                      {tx.category === "membership" ? "Cuotas Alumnos" : tx.category === "pos_sale" ? "Venta POS" : tx.category === "rent" ? "Alquiler" : tx.category === "services" ? "Servicios" : tx.category === "salary" ? "Sueldo Personal" : tx.category === "provider_payment" ? "Proveedores" : "Otros"}
                      {" · "}{formatDate(tx.transaction_date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`font-semibold text-sm ${tx.type === "income" ? "text-green-600" : "text-red-500"}`}>
                      {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
                    </span>
                    {/* Delete button (only allow delete manual ones - i.e. without reference_id, to avoid mismatching with invoice syncs) */}
                    {!tx.reference_id && (
                      <button
                        onClick={() => handleDeleteTransaction(tx.id)}
                        className="p-1 rounded text-muted-foreground hover:bg-red-50 hover:text-red-600 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Sin movimientos de caja registrados.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── TAB 2: SUELDOS ──────────────────────────────────────────
  if (activeTab === "sueldos") {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coach configurator list */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-border shadow-sm space-y-4">
          <h3 className="font-bold text-foreground">Profesores e Instructores ({professors.length})</h3>
          <p className="text-xs text-muted-foreground">
            Configurá las condiciones salariales de tu personal y liquidá sus honorarios según las clases dictadas.
          </p>

          <div className="divide-y divide-border">
            {professors.map(prof => {
              const cfg = prof.payment_config;
              const isEditing = editingProfConfig === prof.id;

              return (
                <div key={prof.id} className="py-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-foreground text-sm">{prof.full_name}</h4>
                      <p className="text-xs text-muted-foreground">{prof.email}</p>
                      <div className="mt-1 flex items-center gap-2">
                        {cfg ? (
                          <span className="text-[10px] font-bold bg-green-50 text-green-700 px-2 py-0.5 rounded border border-green-200/50">
                            {cfg.payment_type === "fixed" ? "Fijo" : cfg.payment_type === "per_class" ? "Por clase" : "Por hora"}: {formatCurrency(cfg.rate)}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200/50">
                            Sueldo sin configurar
                          </span>
                        )}
                      </div>
                    </div>

                    {!isEditing && (
                      <button
                        onClick={() => {
                          setEditingProfConfig(prof.id);
                          setProfConfigForm({
                            payment_type: cfg?.payment_type || "per_class",
                            rate: cfg?.rate ? String(cfg.rate) : ""
                          });
                        }}
                        className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-muted"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="bg-muted/40 p-4 rounded-xl space-y-3 border border-border">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Modalidad de Pago</label>
                          <Select
                            value={profConfigForm.payment_type}
                            onChange={(val) => setProfConfigForm({ ...profConfigForm, payment_type: val as any })}
                            options={[
                              { value: "fixed", label: "Sueldo Fijo Mensual" },
                              { value: "per_class", label: "Pago por Clase Dictada" },
                              { value: "per_hour", label: "Pago por Hora de Clase" }
                            ]}
                            triggerClassName="mt-1 py-1.5 px-3 text-xs bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Tarifa (ARS)</label>
                          <input
                            type="number"
                            value={profConfigForm.rate}
                            onChange={e => setProfConfigForm({ ...profConfigForm, rate: e.target.value })}
                            placeholder="Monto"
                            className="w-full mt-1 px-3 py-1.5 rounded-lg border border-border text-xs"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleSaveProfConfig(prof.id)}
                          disabled={saving}
                          className="bg-primary text-white text-[11px] font-bold px-3 py-1.5 rounded-lg"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={() => setEditingProfConfig(null)}
                          className="bg-white text-muted-foreground border border-border text-[11px] font-bold px-3 py-1.5 rounded-lg"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    cfg && (
                      <div className="flex items-center gap-3 bg-muted/20 p-3 rounded-xl border border-border/40">
                        {cfg.payment_type !== "fixed" && (
                          <div className="w-32 shrink-0">
                            <label className="text-[9px] font-bold text-muted-foreground uppercase block mb-1">
                              {cfg.payment_type === "per_class" ? "Clases" : "Horas"} en el mes
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={calcUnits[prof.id] || ""}
                              onChange={e => setCalcUnits({ ...calcUnits, [prof.id]: Number(e.target.value) })}
                              placeholder="Cant."
                              className="w-full px-2 py-1.5 rounded-lg border border-border text-xs bg-white"
                            />
                          </div>
                        )}
                        <div className="flex-1 text-right">
                          <span className="text-[10px] text-muted-foreground block">Monto a liquidar</span>
                          <span className="font-bold text-sm text-foreground">
                            {formatCurrency(cfg.payment_type === "fixed" ? cfg.rate : cfg.rate * (calcUnits[prof.id] || 0))}
                          </span>
                        </div>
                        <button
                          onClick={() => handlePaySalary(prof)}
                          disabled={saving}
                          className="bg-primary/10 text-primary hover:bg-primary hover:text-white px-3 py-2 rounded-xl text-xs font-bold transition shrink-0 self-end"
                        >
                          Registrar Liquidación
                        </button>
                      </div>
                    )
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* History of salary payouts */}
        <div className="bg-white rounded-2xl p-6 border border-border shadow-sm space-y-4 h-fit">
          <h3 className="font-bold text-foreground">Historial de Liquidaciones</h3>
          {salaryPayments.length > 0 ? (
            <div className="space-y-3">
              {salaryPayments.map(sal => (
                <div key={sal.id} className="p-3 bg-muted/30 border border-border/55 rounded-xl text-xs space-y-1">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-foreground">{sal.employee_name}</span>
                    <span className="font-black text-foreground">{formatCurrency(sal.amount)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                    <span>{sal.period}</span>
                    <span>{formatDate(sal.payment_date)}</span>
                  </div>
                  {sal.notes && <p className="text-[10px] italic text-muted-foreground pt-1 border-t border-border/30 mt-1">{sal.notes}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-8">No hay registros cargados este mes.</p>
          )}
        </div>
      </div>
    );
  }

  // ─── TAB 3: PROVEEDORES ───────────────────────────────────────
  if (activeTab === "proveedores") {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form to add provider */}
        <div className="bg-white rounded-2xl p-6 border border-border shadow-sm h-fit space-y-4">
          <h3 className="font-bold text-foreground">Registrar Compra / Proveedor</h3>
          <form onSubmit={handleAddProviderPayment} className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Nombre Proveedor</label>
              <input
                type="text"
                value={providerForm.provider_name}
                onChange={e => setProviderForm({ ...providerForm, provider_name: e.target.value })}
                placeholder="Ej. Distribuidor Suplementos"
                className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Monto (ARS)</label>
              <input
                type="number"
                value={providerForm.amount}
                onChange={e => setProviderForm({ ...providerForm, amount: e.target.value })}
                placeholder="Monto"
                className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Vencimiento de Factura</label>
              <input
                type="date"
                value={providerForm.due_date}
                onChange={e => setProviderForm({ ...providerForm, due_date: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Estado de Pago</label>
              <Select
                value={providerForm.status}
                onChange={(val) => setProviderForm({ ...providerForm, status: val as any })}
                options={[
                  { value: "pending", label: "Pendiente de Pago" },
                  { value: "paid", label: "Pagado" }
                ]}
                triggerClassName="py-2.5 px-3 text-xs bg-white h-[38px] flex items-center justify-between"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Notas / Detalle</label>
              <textarea
                value={providerForm.notes}
                onChange={e => setProviderForm({ ...providerForm, notes: e.target.value })}
                rows={2}
                placeholder="Ej. Compra de 10 tarros de proteína"
                className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-primary text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/95 transition shadow-sm"
            >
              {saving ? "Guardando..." : "Guardar Proveedor"}
            </button>
          </form>
        </div>

        {/* List of provider payments */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-border shadow-sm space-y-4">
          <h3 className="font-bold text-foreground">Pagos de Proveedores e Inventario</h3>
          {providerPayments.length > 0 ? (
            <div className="divide-y divide-border">
              {providerPayments.map(prov => (
                <div key={prov.id} className="py-4 flex items-center justify-between group">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground text-sm">{prov.provider_name}</span>
                      <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                        prov.status === "paid" ? "bg-green-50 text-green-700 border border-green-200/50" : "bg-yellow-50 text-yellow-700 border border-yellow-200/50"
                      }`}>
                        {prov.status === "paid" ? "Pagado" : "Pendiente"}
                      </span>
                    </div>
                    {prov.notes && <p className="text-xs text-muted-foreground mt-0.5">{prov.notes}</p>}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {prov.status === "paid" && prov.payment_date
                        ? `Liquidado el ${formatDate(prov.payment_date)}`
                        : `Vence el ${formatDate(prov.due_date)}`
                      }
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-black text-sm">{formatCurrency(prov.amount)}</span>
                    {prov.status === "pending" && (
                      <button
                        onClick={() => handleMarkProviderPaid(prov)}
                        className="bg-green-600 hover:bg-green-700 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                        title="Marcar como pagado"
                      >
                        <Check className="w-3 h-3" /> Cobrar
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteProvider(prov.id)}
                      className="p-1 rounded text-muted-foreground hover:bg-red-50 hover:text-red-600 transition opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No hay pagos a proveedores registrados.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── TAB 4: PATRIMONIO ───────────────────────────────────────
  if (activeTab === "patrimonio") {
    const totalAssets = assets.filter(a => a.type === "asset").reduce((sum, a) => sum + a.value, 0);
    const totalLiabilities = assets.filter(a => a.type === "liability").reduce((sum, a) => sum + a.value, 0);
    const netWorth = totalAssets - totalLiabilities;

    return (
      <div className="space-y-6">
        {/* Patrimonio KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-border flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase">Total Activos (Bienes)</span>
              <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(totalAssets)}</p>
            </div>
            <div className="bg-green-50 p-2.5 rounded-xl"><Layers className="w-5 h-5 text-green-600" /></div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-border flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase">Total Pasivos (Deudas)</span>
              <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(totalLiabilities)}</p>
            </div>
            <div className="bg-red-50 p-2.5 rounded-xl"><TrendingDown className="w-5 h-5 text-red-600" /></div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-border flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase">Patrimonio Neto</span>
              <p className={`text-2xl font-bold mt-1 ${netWorth >= 0 ? "text-primary" : "text-red-700"}`}>
                {formatCurrency(netWorth)}
              </p>
            </div>
            <div className="bg-orange-55 p-2.5 rounded-xl"><DollarSign className="w-5 h-5 text-primary" /></div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add/Edit Asset Form */}
          <div className="bg-white rounded-2xl p-6 border border-border shadow-sm h-fit space-y-4">
            <h3 className="font-bold text-foreground">
              {editingAsset ? "Editar Registro" : "Agregar Activo / Pasivo"}
            </h3>
            <p className="text-xs text-muted-foreground">
              Registrá el valor de tus bienes (máquinas, barras, efectivo, mejoras de local) u obligaciones (préstamos, deudas fiscales) para obtener el balance neto.
            </p>
            <form onSubmit={handleAddAsset} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Nombre / Elemento</label>
                <input
                  type="text"
                  value={assetForm.name}
                  onChange={e => setFormName(e.target.value)} // wait, use state binder!
                  // Let's make sure we bind correctly
                  className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  // wait, let's look at the binder:
                  // Oh, we should write: onChange={e => setAssetForm({ ...assetForm, name: e.target.value })}
                  onChange={e => setAssetForm({ ...assetForm, name: e.target.value })}
                  placeholder="Ej: Lote de 10 Barras Olímpicas"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Tipo de Cuenta</label>
                <Select
                  value={assetForm.type}
                  onChange={(val) => setAssetForm({ ...assetForm, type: val as any })}
                  options={[
                    { value: "asset", label: "Activo (Bien / Valor)" },
                    { value: "liability", label: "Pasivo (Deuda / Obligación)" }
                  ]}
                  triggerClassName="py-2 px-3 text-xs bg-white h-[38px] flex items-center justify-between"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Valor Estimado (ARS)</label>
                <input
                  type="number"
                  value={assetForm.value}
                  onChange={e => setAssetForm({ ...assetForm, value: e.target.value })}
                  placeholder="Monto estimado"
                  className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Fecha de Registro</label>
                <input
                  type="date"
                  value={assetForm.purchase_date}
                  onChange={e => setAssetForm({ ...assetForm, purchase_date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Notas (opcional)</label>
                <textarea
                  value={assetForm.notes}
                  onChange={e => setAssetForm({ ...assetForm, notes: e.target.value })}
                  rows={2}
                  placeholder="Detalle o marca de equipamiento..."
                  className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-primary text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/95 transition shadow-sm"
                >
                  {saving ? "Guardando..." : editingAsset ? "Guardar Cambios" : "Agregar"}
                </button>
                {editingAsset && (
                  <button
                    type="button"
                    onClick={resetAssetForm}
                    className="px-4 py-2.5 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-muted"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Patrimonio Balance Table */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-border shadow-sm space-y-4">
            <h3 className="font-bold text-foreground">Libro de Balance Patrimonial</h3>
            {assets.length > 0 ? (
              <div className="divide-y divide-border">
                {assets.map(asset => (
                  <div key={asset.id} className="py-4 flex items-center justify-between group">
                    <div>
                      <h4 className="font-bold text-foreground text-sm flex items-center gap-2">
                        {asset.name}
                        <span className={`text-[8px] px-2 py-0.5 rounded font-bold uppercase tracking-wide ${
                          asset.type === "asset" ? "bg-green-50 text-green-700 border border-green-200/50" : "bg-red-50 text-red-700 border border-red-200/50"
                        }`}>
                          {asset.type === "asset" ? "Activo" : "Pasivo"}
                        </span>
                      </h4>
                      {asset.notes && <p className="text-xs text-muted-foreground mt-0.5">{asset.notes}</p>}
                      {asset.purchase_date && <p className="text-[10px] text-muted-foreground mt-1">Registrado el {formatDate(asset.purchase_date)}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`font-black text-sm ${asset.type === "asset" ? "text-green-600" : "text-red-500"}`}>
                        {formatCurrency(asset.value)}
                      </span>
                      <button
                        onClick={() => handleEditAsset(asset)}
                        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition opacity-0 group-hover:opacity-100"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteAsset(asset.id)}
                        className="p-1 rounded text-muted-foreground hover:bg-red-50 hover:text-red-600 transition opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <Layers className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Sin registros en el libro patrimonial.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
