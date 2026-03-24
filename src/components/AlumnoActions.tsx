"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2, Loader2 } from "lucide-react";
import Link from "next/link";

export default function AlumnoActions({
  studentId,
  studentName,
}: {
  studentId: string;
  studentName: string;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (
      !confirm(
        `¿Eliminar al alumno "${studentName}"?\n\nSe borrarán todos sus ciclos, historial, pagos y datos. Esta acción no se puede deshacer.`
      )
    )
      return;

    setDeleting(true);

    try {
      const res = await fetch("/api/students/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: studentId }),
      });

      const result = await res.json();

      if (!res.ok) {
        toast.error("Error al eliminar alumno: " + (result.error || "Error desconocido"));
        setDeleting(false);
        return;
      }

      toast.success(`Alumno "${studentName}" eliminado`);
      router.push("/entrenador/alumnos");
      router.refresh();
    } catch {
      toast.error("Error al conectar con el servidor");
      setDeleting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/entrenador/alumnos/${studentId}/editar`}
        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"
      >
        <Pencil className="w-4 h-4" />
        <span className="hidden sm:inline">Editar</span>
      </Link>

      <button
        onClick={handleDelete}
        disabled={deleting}
        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-destructive hover:border-destructive/50 hover:bg-destructive/5 transition-colors disabled:opacity-50"
      >
        {deleting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Trash2 className="w-4 h-4" />
        )}
        <span className="hidden sm:inline">{deleting ? "Eliminando..." : "Eliminar"}</span>
      </button>
    </div>
  );
}
