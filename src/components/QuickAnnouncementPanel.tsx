"use client";

import { useState } from "react";
import { Megaphone, Users, User, Pin, Sparkles, Loader2, Trash2, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type MiniUser = { id: string; full_name: string };
type Announcement = {
  id: string;
  title: string;
  content: string;
  scope: "general" | "targeted";
  pinned: boolean;
  created_at: string;
  target_user_ids?: string[] | null;
};

interface PanelProps {
  students: MiniUser[];
  initialAnnouncements: Announcement[];
}

export default function QuickAnnouncementPanel({ students, initialAnnouncements }: PanelProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>(initialAnnouncements);

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [scope, setScope] = useState<"general" | "targeted">("general");
  const [targetUserId, setTargetUserId] = useState("");
  const [pinned, setPinned] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error("El título y contenido son obligatorios");
      return;
    }
    if (scope === "targeted" && !targetUserId) {
      toast.error("Selecciona un alumno para esta nota personal");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, scope, targetUserId, pinned }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al guardar");

      toast.success("Anuncio publicado correctamente");
      
      // Reiniciar form
      setTitle("");
      setContent("");
      setScope("general");
      setTargetUserId("");
      setPinned(false);

      // Actualizar local y router
      setAnnouncements([data.data, ...announcements]);
      router.refresh();

    } catch (err: any) {
      toast.error(err.message || "Ocurrió un problema al publicar");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Seguro que quieres eliminar esta nota del feed?")) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/announcements?id=${id}`, { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Error al eliminar");

      toast.success("Nota eliminada con éxito");
      setAnnouncements(announcements.filter(a => a.id !== id));
      router.refresh();

    } catch (err: any) {
      toast.error(err.message || "Error al intentar eliminar");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* Formulario Composición */}
      <div className="xl:col-span-1 bg-white rounded-2xl border border-border shadow-sm p-6 h-fit sticky top-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
            <Megaphone className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-foreground">Nueva Nota del Día</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Scope selector */}
          <div>
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">Audiencia</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { setScope("general"); setTargetUserId(""); }}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                  scope === "general"
                    ? "bg-primary text-white border-primary shadow-sm shadow-primary/20"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Users className="w-3.5 h-3.5" /> Todo el Box
              </button>
              <button
                type="button"
                onClick={() => setScope("targeted")}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                  scope === "targeted"
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-100"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <User className="w-3.5 h-3.5" /> Nota Personal
              </button>
            </div>
          </div>

          {/* Target Student Autocomplete (solo si scope targeted) */}
          {scope === "targeted" && (
            <div className="animate-in slide-in-from-top-2 duration-200">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">Seleccionar Alumno</label>
              <select
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                className="w-full px-3 py-2.5 bg-indigo-50/50 border border-indigo-200 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">-- Seleccionar atleta --</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.full_name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Título */}
          <div>
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">Título del Comunicado</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={scope === "general" ? "Ej: WOD Clasificatorio Viernes" : "Ej: Ajustar pesos de sentadilla"}
              className="w-full px-3.5 py-2.5 border border-border rounded-xl text-sm text-foreground placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 focus:outline-none"
            />
          </div>

          {/* Contenido */}
          <div>
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">Mensaje o Anotación</label>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Escribe aquí tu nota del día detallada..."
              className="w-full px-3.5 py-2.5 border border-border rounded-xl text-sm text-foreground placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 focus:outline-none resize-none"
            />
          </div>

          {/* Toggle Pinned */}
          {scope === "general" && (
            <label className="flex items-center gap-2 cursor-pointer group py-1">
              <input
                type="checkbox"
                checked={pinned}
                onChange={(e) => setPinned(e.target.checked)}
                className="rounded text-amber-500 focus:ring-amber-500 w-4 h-4 border-slate-300"
              />
              <span className="text-xs font-medium text-slate-600 group-hover:text-slate-900 flex items-center gap-1">
                <Pin className={`w-3.5 h-3.5 ${pinned ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
                Anclar al inicio del feed (Destacado)
              </span>
            </label>
          )}

          {/* Botón enviar */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all shadow-sm hover:shadow-md text-white disabled:opacity-50 ${
              scope === "targeted" ? "bg-indigo-600 hover:bg-indigo-700" : "bg-slate-900 hover:bg-slate-800"
            }`}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Send className="w-3.5 h-3.5" /> Publicar Nota
              </>
            )}
          </button>
        </form>
      </div>

      {/* Feed de Anuncios Recientes */}
      <div className="xl:col-span-2 space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-bold text-foreground">Últimas notas publicadas</h3>
          <span className="text-[11px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">
            {announcements.length} en el feed
          </span>
        </div>

        {announcements.length === 0 ? (
          <div className="bg-white border border-dashed border-border rounded-2xl p-8 text-center text-slate-400 flex flex-col items-center justify-center min-h-[250px]">
            <Megaphone className="w-8 h-8 text-slate-300 mb-2" />
            <p className="text-sm font-medium text-slate-500">No has publicado anuncios hoy</p>
            <p className="text-xs text-slate-400 mt-0.5">Completa el formulario de la izquierda para notificar a tu comunidad.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            {announcements.map(item => {
              const isT = item.scope === "targeted";
              const isDel = deletingId === item.id;
              
              // Intentar buscar el nombre del alumno si es targeted
              let targetName = "";
              if (isT && item.target_user_ids && item.target_user_ids.length > 0) {
                targetName = students.find(s => s.id === item.target_user_ids![0])?.full_name || "Alumno";
              }

              return (
                <div
                  key={item.id}
                  className={`group bg-white rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden ${isDel ? 'opacity-50' : ''}`}
                >
                  {/* Pinned / Targeted Badge */}
                  <div className="absolute top-0 right-0 flex items-center gap-1">
                    {isT && (
                      <div className="bg-indigo-600 text-white text-[9px] font-black uppercase px-3 py-1 rounded-bl-xl flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" /> Nota: {targetName}
                      </div>
                    )}
                    {item.pinned && !isT && (
                      <div className="bg-amber-500 text-white text-[9px] font-black uppercase px-3 py-1 rounded-bl-xl flex items-center gap-1">
                        <Pin className="w-2.5 h-2.5 fill-white" /> Anclado
                      </div>
                    )}
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-semibold mb-1">
                        <span>{new Date(item.created_at).toLocaleDateString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      <h4 className="font-bold text-foreground text-lg leading-snug group-hover:text-primary transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-2 leading-relaxed whitespace-pre-wrap">
                        {item.content}
                      </p>
                    </div>

                    {/* Trash Icon visible on hover */}
                    <button
                      disabled={isDel}
                      onClick={() => handleDelete(item.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-50 hover:text-red-600 text-slate-300 rounded-xl shrink-0 self-start mt-1"
                      title="Eliminar nota"
                    >
                      {isDel ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
