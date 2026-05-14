"use client";

import { useState } from "react";
import { Share2, Copy, Check, MessageCircle, X } from "lucide-react";
import { toast } from "sonner";

export default function InviteStudentModal({ boxId }: { boxId?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [copied, setCopied] = useState(false);

  if (!boxId) return null;

  const getInviteUrl = () => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/invite/${boxId}`;
  };

  const handleCopy = async () => {
    const url = getInviteUrl();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("¡Enlace de invitación copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("No se pudo copiar el enlace");
    }
  };

  const handleWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/[^\d]/g, "");
    const inviteUrl = getInviteUrl();
    const text = encodeURIComponent(
      `¡Hola! Te invito a unirte a mi Box en EntrenAPP. Registrate gratis desde el siguiente enlace para comenzar a ver tu planificación de entrenamiento:\n\n${inviteUrl}`
    );

    if (!cleanPhone) {
      // Enviar sin número específico (abre WhatsApp para elegir contacto)
      window.open(`https://wa.me/?text=${text}`, "_blank");
    } else {
      window.open(`https://wa.me/${cleanPhone}?text=${text}`, "_blank");
    }
    setIsOpen(false);
    setPhone("");
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 border border-border text-foreground bg-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition"
      >
        <Share2 className="w-4 h-4 text-muted-foreground" />
        Invitar alumno
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Share2 className="w-4 h-4 text-primary" />
                Invitar Alumno al Box
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-muted-foreground hover:bg-muted rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              <p className="text-sm text-muted-foreground">
                Envía un enlace de registro al alumno. Al registrarse mediante este link, quedará automáticamente vinculado a tu Box.
              </p>

              {/* Copy Link Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Enlace único de invitación
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={getInviteUrl()}
                    className="flex-1 min-w-0 px-3 py-2 bg-muted text-muted-foreground border border-border rounded-xl text-sm truncate select-all"
                  />
                  <button
                    onClick={handleCopy}
                    className="flex items-center justify-center w-10 h-10 border border-border rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition"
                    title="Copiar enlace"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-muted-foreground">O enviar por WhatsApp</span>
                </div>
              </div>

              {/* Form WhatsApp */}
              <form onSubmit={handleWhatsApp} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    Número de celular (Opcional)
                  </label>
                  <input
                    type="tel"
                    placeholder="Ej: 5491123456789 (con código de país)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-border bg-white text-foreground placeholder:text-muted-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition"
                  />
                  <p className="text-[10px] text-muted-foreground italic">
                    Si lo dejas vacío, podrás elegir el contacto directamente en WhatsApp.
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-semibold py-3 rounded-xl transition shadow-sm shadow-green-200"
                >
                  <MessageCircle className="w-5 h-5 fill-white" />
                  Abrir WhatsApp y Enviar
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
