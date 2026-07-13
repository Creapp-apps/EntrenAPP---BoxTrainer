"use client";

import { useState, useRef, useEffect } from "react";
import { MoreVertical, Pause, Play, UserMinus, Loader2, X } from "lucide-react";
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
  const [activeModal, setActiveModal] = useState<"pause" | "activate" | "unlink" | null>(null);
  const [pauseReason, setPauseReason] = useState("Falta de Pago / Membresía expirada");
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

  const handleActionClick = (action: "pause" | "activate" | "unlink") => {
    setIsOpen(false);
    setActiveModal(action);
  };

  const executeAction = async (action: "pause" | "activate" | "unlink") => {
    setActiveModal(null);
    setLoading(true);
    try {
      const res = await fetch("/api/students/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          action,
          reason: action === "pause" ? pauseReason.trim() : "",
        }),
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
                handleActionClick("activate");
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
                handleActionClick("pause");
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
              handleActionClick("unlink");
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <UserMinus className="w-4 h-4" />
            Desvincular del Box
          </button>
        </div>
      )}

      {/* Modern custom confirmation modal */}
      {activeModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-start justify-between">
              <h3 className="font-bold text-foreground text-lg">
                {activeModal === "pause" && "Pausar Cuenta"}
                {activeModal === "activate" && "Reactivar Acceso"}
                {activeModal === "unlink" && "⚠️ Desvincular del Box"}
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Description */}
            <div className="text-sm text-muted-foreground leading-relaxed">
              {activeModal === "pause" && (
                <div className="space-y-3">
                  <p>¿Por qué motivo deseas pausar la cuenta de <span className="font-semibold text-foreground">{studentName}</span>?</p>
                  <p className="text-xs text-muted-foreground">(Este mensaje se le mostrará al alumno al ingresar)</p>
                  <input
                    type="text"
                    value={pauseReason}
                    onChange={e => setPauseReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-background text-foreground"
                    placeholder="Escribe el motivo..."
                  />
                </div>
              )}
              {activeModal === "activate" && (
                <p>¿Reactivar el acceso de <span className="font-semibold text-foreground">{studentName}</span> ahora mismo?</p>
              )}
              {activeModal === "unlink" && (
                <p>¿Estás seguro de que deseas desvincular a <span className="font-semibold text-foreground">{studentName}</span> de tu Box? El alumno perderá acceso total de inmediato y se liberará un cupo en tu gimnasio.</p>
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setActiveModal(null)}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-sm font-semibold hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => executeAction(activeModal)}
                className={`flex-1 py-2 rounded-xl text-white text-sm font-bold shadow-sm transition-colors ${
                  activeModal === "pause"
                    ? "bg-amber-600 hover:bg-amber-700"
                    : activeModal === "activate"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
