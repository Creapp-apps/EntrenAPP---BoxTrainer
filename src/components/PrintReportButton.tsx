"use client";

import { Printer } from "lucide-react";

export default function PrintReportButton() {
  return (
    <button 
      onClick={() => {
        if (typeof window !== 'undefined') window.print();
      }}
      className="flex items-center gap-2 bg-slate-900 text-white hover:bg-slate-800 px-4 py-2.5 rounded-xl text-sm font-bold transition shadow-md hover:shadow-lg"
    >
      <Printer className="w-4 h-4" />
      Imprimir / Guardar PDF
    </button>
  );
}
