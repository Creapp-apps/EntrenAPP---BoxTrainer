"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Download, Upload, FileSpreadsheet, X, Check, AlertCircle, Loader2 } from "lucide-react";

const CSV_HEADERS = ["nombre", "email", "telefono", "fecha_nacimiento", "peso_kg", "altura_cm", "precio_mensual", "dia_pago", "modalidad", "objetivos", "lesiones"];

const TEMPLATE_ROWS = [
  CSV_HEADERS.join(","),
  'Juan Perez,juan@email.com,+5491112345678,1995-03-15,75,178,15000,1,presencial,Ganar masa muscular,Tendinitis hombro',
  'Maria Lopez,maria@email.com,+5491198765432,1990-07-22,60,165,12000,5,mixto,Tonificar,',
];

type ImportResult = {
  total: number;
  success: number;
  errors: { row: number; name: string; error: string }[];
};

export default function AlumnosCSV() {
  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [csvPreview, setCsvPreview] = useState<string[][]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Export current students to CSV
  async function exportCSV() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: students } = await supabase
      .from("users")
      .select("full_name, email, phone, birth_date, weight_kg, height_cm, monthly_price, payment_due_day, modality, goals, injuries")
      .eq("role", "student")
      
      .order("full_name");

    if (!students || students.length === 0) {
      toast.error("No hay alumnos para exportar");
      return;
    }

    const rows = [CSV_HEADERS.join(",")];
    for (const s of students) {
      rows.push([
        s.full_name || "",
        s.email || "",
        s.phone || "",
        s.birth_date || "",
        s.weight_kg || "",
        s.height_cm || "",
        s.monthly_price || "",
        s.payment_due_day || "",
        s.modality || "",
        (s.goals || "").replace(/,/g, ";"),
        (s.injuries || "").replace(/,/g, ";"),
      ].map(v => '"' + String(v).replace(/"/g, '""') + '"').join(","));
    }

    const blob = new Blob(["\uFEFF" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "alumnos_" + new Date().toISOString().split("T")[0] + ".csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success(students.length + " alumnos exportados");
  }

  // Download template
  function downloadTemplate() {
    const blob = new Blob(["\uFEFF" + TEMPLATE_ROWS.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla_alumnos.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Plantilla descargada");
  }

  // Parse CSV file
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) {
        toast.error("El archivo esta vacio o solo tiene encabezados");
        return;
      }

      const parsed: string[][] = [];
      for (let i = 1; i < lines.length; i++) {
        // Simple CSV parse handling quoted fields
        const row = parseCSVLine(lines[i]);
        if (row.length >= 2 && row[0].trim()) {
          parsed.push(row);
        }
      }

      if (parsed.length === 0) {
        toast.error("No se encontraron filas validas");
        return;
      }

      setCsvPreview(parsed);
      setResult(null);
      setShowImport(true);
    };
    reader.readAsText(file, "utf-8");
    e.target.value = "";
  }

  function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
        else if (ch === '"') { inQuotes = false; }
        else { current += ch; }
      } else {
        if (ch === '"') { inQuotes = true; }
        else if (ch === ',') { result.push(current.trim()); current = ""; }
        else { current += ch; }
      }
    }
    result.push(current.trim());
    return result;
  }

  // Import parsed rows
  async function runImport() {
    setImporting(true);
    const importResult: ImportResult = { total: csvPreview.length, success: 0, errors: [] };

    for (let i = 0; i < csvPreview.length; i++) {
      const row = csvPreview[i];
      const name = row[0] || "";
      const email = row[1] || "";

      if (!name || !email) {
        importResult.errors.push({ row: i + 2, name: name || "Sin nombre", error: "Nombre o email vacio" });
        continue;
      }

      try {
        const res = await fetch("/api/students/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            full_name: name,
            email: email,
            password: "Alumno" + Math.random().toString(36).slice(2, 8) + "!",
            phone: row[2] || "",
            birth_date: row[3] || "",
            weight_kg: row[4] ? parseFloat(row[4]) : null,
            height_cm: row[5] ? parseFloat(row[5]) : null,
            monthly_price: row[6] ? parseFloat(row[6]) : null,
            payment_due_day: row[7] ? parseInt(row[7]) : 1,
            modality: row[8] || "presencial",
            goals: row[9] || "",
            injuries: row[10] || "",
            trainer_id: null,  // Will be set by API from auth
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          importResult.errors.push({ row: i + 2, name, error: data.error || "Error desconocido" });
        } else {
          importResult.success++;
        }
      } catch (err: any) {
        importResult.errors.push({ row: i + 2, name, error: err.message });
      }
    }

    setResult(importResult);
    setImporting(false);

    if (importResult.success > 0) {
      toast.success(importResult.success + " alumnos importados");
    }
    if (importResult.errors.length > 0) {
      toast.error(importResult.errors.length + " errores");
    }
  }

  return (
    <div>
      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <button onClick={downloadTemplate}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-muted/50 text-muted-foreground hover:bg-muted transition" title="Descargar plantilla CSV">
          <FileSpreadsheet className="w-3.5 h-3.5" />
          Plantilla
        </button>
        <button onClick={exportCSV}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-muted/50 text-muted-foreground hover:bg-muted transition" title="Exportar alumnos a CSV">
          <Download className="w-3.5 h-3.5" />
          Exportar
        </button>
        <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition cursor-pointer" title="Importar desde CSV">
          <Upload className="w-3.5 h-3.5" />
          Importar
          <input ref={fileInputRef} type="file" accept=".csv,.txt" onChange={handleFile} className="hidden" />
        </label>
      </div>

      {/* Import modal */}
      {showImport && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { if (!importing) { setShowImport(false); setCsvPreview([]); setResult(null); } }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl border border-border shadow-xl max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">Importar alumnos</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{csvPreview.length} filas detectadas</p>
              </div>
              {!importing && (
                <button onClick={() => { setShowImport(false); setCsvPreview([]); setResult(null); }}
                  className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Preview table */}
            {!result && (
              <div className="overflow-auto flex-1 rounded-xl border border-border mb-4">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      <th className="text-left px-3 py-2 font-semibold text-muted-foreground">#</th>
                      <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Nombre</th>
                      <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Email</th>
                      <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Tel</th>
                      <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Mod.</th>
                      <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Precio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {csvPreview.map((row, i) => (
                      <tr key={i} className="hover:bg-muted/30">
                        <td className="px-3 py-2 text-muted-foreground">{i + 2}</td>
                        <td className="px-3 py-2 font-medium text-foreground">{row[0]}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row[1]}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row[2] || "-"}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row[8] || "presencial"}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row[6] ? "$" + row[6] : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Result */}
            {result && (
              <div className="space-y-3 flex-1 overflow-auto mb-4">
                <div className="flex gap-3">
                  <div className="flex-1 p-3 rounded-xl bg-green-50 border border-green-100">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-bold text-green-700">{result.success}</span>
                    </div>
                    <p className="text-[10px] text-green-600 mt-0.5">importados</p>
                  </div>
                  {result.errors.length > 0 && (
                    <div className="flex-1 p-3 rounded-xl bg-red-50 border border-red-100">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600" />
                        <span className="text-sm font-bold text-red-700">{result.errors.length}</span>
                      </div>
                      <p className="text-[10px] text-red-600 mt-0.5">errores</p>
                    </div>
                  )}
                </div>
                {result.errors.length > 0 && (
                  <div className="space-y-1">
                    {result.errors.map((err, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2">
                        <span className="text-red-400 font-mono shrink-0">Fila {err.row}</span>
                        <span className="font-medium">{err.name}:</span>
                        <span className="text-red-500">{err.error}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              {!result ? (
                <button onClick={runImport} disabled={importing}
                  className="flex-1 bg-primary text-white py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition inline-flex items-center justify-center gap-2">
                  {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {importing ? "Importando..." : "Importar " + csvPreview.length + " alumnos"}
                </button>
              ) : (
                <button onClick={() => { setShowImport(false); setCsvPreview([]); setResult(null); window.location.reload(); }}
                  className="flex-1 bg-primary text-white py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition">
                  Listo
                </button>
              )}
              {!importing && !result && (
                <button onClick={() => { setShowImport(false); setCsvPreview([]); }}
                  className="px-4 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-muted transition">Cancelar</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
