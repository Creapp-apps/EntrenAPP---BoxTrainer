import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { 
  ArrowLeft, 
  TrendingUp, 
  Calendar, 
  CreditCard, 
  Activity, 
  CheckCircle2, 
  Trophy, 
  FileText,
  BarChart3
} from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";
import PrintReportButton from "@/components/PrintReportButton";
import ConsentSection from "@/components/ConsentSection";

export default async function AlumnoInformePage({ params }: { params: { id: string } }) {
  const supabase = await createClient();

  // Intentar traer datos reales del alumno para que el informe tenga su nombre real y datos base
  const { data: student } = await supabase
    .from("users")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!student) notFound();

  // 📡 Consultas auxiliares de apoyo (Pagos reales, PRs reales y Consumos reales)
  const [{ data: dbPayments }, { data: dbPRs }, { data: dbSales }] = await Promise.all([
    supabase.from("student_payments")
      .select("*")
      .eq("student_id", params.id)
      .order("due_date", { ascending: false }),
    supabase.from("personal_records")
      .select("*, exercises(name)")
      .eq("student_id", params.id)
      .order("created_at", { ascending: false }),
    supabase.from("box_product_sales")
      .select(`
        *,
        product:box_products(name)
      `)
      .eq("student_id", params.id)
      .eq("status", "completado")
      .order("created_at", { ascending: false })
  ]);

  // Mockups de asistencia complementaria y métricas visuales para el reporte de alto nivel
  const mockAttendance = {
    totalThisMonth: 14,
    averageWeekly: 3.5,
    adherenceRate: 92, // %
    monthlyBreakdown: [
      { name: "Ene", present: 12, total: 12 },
      { name: "Feb", present: 10, total: 12 },
      { name: "Mar", present: 14, total: 15 },
      { name: "Abr", present: 15, total: 16 },
      { name: "May", present: 8, total: 9 },
    ]
  };

  // Consumos en el E-commerce reales
  const storePurchases = (dbSales || []).map(sale => ({
    date: sale.created_at.split('T')[0],
    item: (sale.product as any)?.name || "Producto comprado",
    price: Number(sale.total_price),
    method: sale.payment_method === 'mercadopago' ? 'MercadoPago QR' :
            sale.payment_method === 'efectivo' ? 'Efectivo' :
            sale.payment_method === 'transferencia' ? 'Transferencia' : 'Otro'
  }));

  const totalSpentInStore = storePurchases.reduce((acc, curr) => acc + curr.price, 0);

  return (
    <div className="space-y-8 max-w-5xl pb-16 print:p-0 print:bg-white">
      
      {/* Header - Ocultar al imprimir */}
      <div className="flex items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <Link href={`/entrenador/alumnos/${params.id}`} className="p-2 rounded-xl hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Ficha de Informe</h1>
            <p className="text-sm text-muted-foreground">Analíticas de asistencia, rendimiento y finanzas consolidado.</p>
          </div>
        </div>

        <PrintReportButton />
      </div>

      {/* EL INFORME CONSOLIDADO (Cuerpo Principal) */}
      <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm relative overflow-hidden print:border-0 print:shadow-none print:p-0">
        
        {/* Membrete Superior de Diseño Ejecutivo */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-100 pb-8 mb-8 gap-4">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-white text-2xl font-black shadow-inner">
              {student.full_name?.[0]?.toUpperCase() || "A"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">{student.full_name}</h2>
                <span className="bg-primary/10 text-primary text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border border-primary/10">
                  Alumno
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">{student.email} · {student.phone || "Sin teléfono"}</p>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-2">
                <span>Modalidad: <strong className="text-slate-700 capitalize">{student.modality || 'No especificada'}</strong></span>
                <span>•</span>
                <span>Última sesión: <strong className="text-slate-700">Hoy</strong></span>
              </div>
            </div>
          </div>

          <div className="text-left md:text-right bg-slate-50 border border-slate-100 rounded-2xl p-4 md:min-w-[200px]">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Emisión del Informe</span>
            <p className="text-sm font-bold text-slate-900 mt-1">{new Date().toLocaleDateString("es-AR", { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p className="text-xs text-primary font-bold mt-0.5">Wolfpack Box Manager</p>
          </div>
        </div>

        {/* 📊 GRILA DE INDICADORES CLAVE (KPIs) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Calendar className="w-3 h-3 text-blue-600" /> Asistencia Mes
            </span>
            <div className="mt-3">
              <p className="text-3xl font-black text-slate-900 leading-none">{mockAttendance.totalThisMonth}</p>
              <p className="text-xs text-slate-500 mt-1">Clases asistidas</p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Ratio Adherencia
            </span>
            <div className="mt-3">
              <p className="text-3xl font-black text-emerald-600 leading-none">{mockAttendance.adherenceRate}%</p>
              <p className="text-xs text-slate-500 mt-1">Cercanía al plan ideal</p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <CreditCard className="w-3 h-3 text-amber-600" /> Cuotas Abonadas
            </span>
            <div className="mt-3">
              <p className="text-3xl font-black text-slate-900 leading-none">
                {dbPayments?.filter(p => p.status === 'pagado').length || 0}
              </p>
              <p className="text-xs text-slate-500 mt-1">Historial de cuotas</p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-purple-600" /> Consumos Box
            </span>
            <div className="mt-3">
              <p className="text-3xl font-black text-purple-700 leading-none">{formatCurrency(totalSpentInStore)}</p>
              <p className="text-xs text-slate-500 mt-1">Gastado en la Tienda</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* SECCION IZQUIERDA: Rendimiento Físico & PRs */}
          <div className="space-y-6">
            <div className="border border-slate-100 rounded-2xl p-5 bg-white">
              <h3 className="font-black text-slate-900 flex items-center gap-2 border-b border-slate-50 pb-3 mb-4">
                <Trophy className="w-5 h-5 text-primary" />
                Resumen de Récords Personales (PRs)
              </h3>
              
              {dbPRs && dbPRs.length > 0 ? (
                <div className="space-y-2.5">
                  {dbPRs.map((pr) => (
                    <div key={pr.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100/50">
                      <div className="min-w-0 flex-1">
                        <p className="font-extrabold text-sm text-slate-800 truncate">
                          {(pr.exercises as any)?.name}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Registrado el {formatDate(pr.created_at)}</p>
                      </div>
                      <span className="font-black text-base text-primary bg-white px-3 py-1 rounded-lg shadow-sm border border-slate-100">
                        {pr.weight_kg} kg
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Trophy className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">Aún no posee récords registrados.</p>
                </div>
              )}
            </div>

            {/* Gráfico Visual de Asistencia */}
            <div className="border border-slate-100 rounded-2xl p-5 bg-white">
              <h3 className="font-black text-slate-900 flex items-center gap-2 border-b border-slate-50 pb-3 mb-4">
                <Activity className="w-5 h-5 text-blue-600" />
                Constancia de Entrenamientos
              </h3>
              
              <div className="flex items-end gap-3 h-36 pt-6 px-2">
                {mockAttendance.monthlyBreakdown.map((month) => {
                  const pct = (month.present / month.total) * 100;
                  return (
                    <div key={month.name} className="flex-1 flex flex-col items-center justify-end h-full gap-2">
                      <span className="text-[9px] font-bold text-slate-500">{month.present} / {month.total}</span>
                      <div className="w-full bg-slate-100 rounded-t-lg relative overflow-hidden" style={{ height: '70%' }}>
                        <div 
                          className="bg-gradient-to-t from-blue-600 to-blue-400 absolute bottom-0 left-0 right-0 rounded-t-lg transition-all duration-1000"
                          style={{ height: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs font-black text-slate-700 uppercase tracking-wider">{month.name}</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground text-center mt-4 italic border-t border-slate-50 pt-3">
                Este alumno asiste un promedio de <strong>{mockAttendance.averageWeekly} veces</strong> por semana.
              </p>
            </div>
          </div>

          {/* SECCION DERECHA: Finanzas & Tienda */}
          <div className="space-y-6">
            
            {/* Consumos en la Tienda Interna */}
            <div className="border border-slate-100 rounded-2xl p-5 bg-white">
              <h3 className="font-black text-slate-900 flex items-center gap-2 border-b border-slate-50 pb-3 mb-4">
                <FileText className="w-5 h-5 text-purple-600" />
                Consumos en Mostrador / Tienda
              </h3>
              
              <div className="space-y-3">
                {storePurchases.length > 0 ? (
                  storePurchases.map((purchase, idx) => (
                    <div key={idx} className="flex justify-between items-center py-2 border-b border-dashed border-slate-100 last:border-0">
                      <div>
                        <p className="font-bold text-sm text-slate-800">{purchase.item}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-slate-400">{new Date(purchase.date + "T12:00:00").toLocaleDateString("es-AR")}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-bold border border-purple-100">{purchase.method}</span>
                        </div>
                      </div>
                      <span className="font-extrabold text-sm text-slate-900">{formatCurrency(purchase.price)}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400 py-4 text-center">Aún no posee consumos registrados en la tienda.</p>
                )}
              </div>

              <div className="mt-4 bg-purple-50 border border-purple-100 rounded-xl p-3 flex justify-between items-center text-purple-950">
                <span className="text-xs font-black uppercase tracking-wider">Total Gastado</span>
                <span className="text-lg font-black">{formatCurrency(totalSpentInStore)}</span>
              </div>
            </div>

            {/* Últimas cuotas del plan */}
            <div className="border border-slate-100 rounded-2xl p-5 bg-white">
              <h3 className="font-black text-slate-900 flex items-center gap-2 border-b border-slate-50 pb-3 mb-4">
                <BarChart3 className="w-5 h-5 text-emerald-600" />
                Estado Financiero (Cuotas)
              </h3>

              {dbPayments && dbPayments.length > 0 ? (
                <div className="space-y-2">
                  {dbPayments.slice(0, 4).map((pay) => (
                    <div key={pay.id} className="flex justify-between items-center text-sm py-2 border-b border-slate-50 last:border-0">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 truncate">{pay.period_label || "Mensualidad"}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Venció {formatDate(pay.due_date)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-extrabold text-slate-900">{formatCurrency(pay.amount)}</p>
                        <span className={`text-[9px] px-1.5 rounded font-black uppercase inline-block mt-0.5 ${
                          pay.status === 'pagado' ? 'bg-emerald-100 text-emerald-700' :
                          pay.status === 'vencido' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {pay.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Sin registro de pagos en el sistema.</p>
              )}
            </div>

          </div>
        </div>

        {/* Consentimiento Bilateral y Panel de Firmas Dobles */}
        <ConsentSection studentName={student.full_name || "Atleta"} />


      </div>

    </div>
  );
}
