"use client";

import { useState, useRef, useEffect } from "react";
import { MoreVertical, Pause, Play, UserMinus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface StudentActionProps {
  studentId: string;
  studentName: string;
  currentStatus: "active" | "paused" | "suspended";
}

export default function StudentActionMenu({ studentId, studentName, currentStatus }: StudentActionProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Cerrar menú al hacer click afuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAction = async (action: "pause" | "activate" | "unlink") => {
    setIsOpen(false);
    let reason = "";

    // 1. Confirmaciones & Diálogos
    if (action === "pause") {
      const res = window.prompt(
        `¿Por qué motivo deseas pausar la cuenta de ${studentName}?\n(Este mensaje se le mostrará al alumno al ingresar)`,
        "Falta de Pago / Membresía expirada"
      );
      if (res === null) return; // Cancelado
      reason = res.trim() || "Pausa administrativa.";
    } else if (action === "unlink") {
      const confirmed = window.confirm(
        `⚠️ ¿Estás seguro de que deseas DESVINCULAR a ${studentName} de tu Box?\n\nEl alumno perderá acceso total de inmediato y se liberará un cupo en tu gimnasio.`
      );
      if (!confirmed) return;
    } else if (action === "activate") {
      const confirmed = window.confirm(`¿Reactivar el acceso de ${studentName} ahora mismo?`);
      if (!confirmed) return;
    }

    // 2. Disparar API
    setLoading(true);
    try {
      const res = await fetch("/api/students/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, action, reason }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Ocurrió un error al procesar la solicitud");
      }

      toast.success(data.message || "Operación exitosa");
      router.refresh(); // Recargar datos del Servidor

    } catch (err: any) {
      toast.error(err.message || "Error inesperado");
    } finally {
      setLoading(false);
    }
  };

  const isPaused = currentStatus === "paused" || currentStatus === "suspended";

  return (
    <div className="absolute top-3 right-3 z-30" ref={menuRef}>
      {loading ? (
        <div className="p-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
        </div>
      ) : (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          className="p-2 rounded-lg text-muted-foreground hover:bg-slate-100 hover:text-slate-900 transition-colors"
          title="Acciones de Membresía"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      )}

      {/* Dropdown Flotante */}
      {isOpen && (
        <div className="absolute right-0 mt-1 w-56 bg-white rounded-xl shadow-xl border border-slate-200 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
          
          {isPaused ? (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleAction("activate");
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-semibold text-green-700 hover:bg-green-50 rounded-lg transition-colors"
            >
              <Play className="w-4 h-4 fill-green-700" />
              Reactivar Acceso
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleAction("pause");
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
            >
              <Pause className="w-4 h-4 fill-amber-700" />
              Pausar Cuenta
            </button>
          )}

          <div className="h-px bg-slate-100 my-1" />

          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleAction("unlink");
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <UserMinus className="w-4 h-4" />
            Desvincular del Box
          </button>
        </div>
      )}
    </div>
  );
}
