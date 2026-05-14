"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Dumbbell, LogOut, Loader2, CheckCircle2, Trophy, Send } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function NoBoxState({ fullName }: { fullName: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [isLoadingBox, setIsLoadingBox] = useState(true);
  
  const [boxId, setBoxId] = useState<string | null>(null);
  const [boxName, setBoxName] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState("");

  // 🔍 Detectar tokens de invitación en el navegador o cuenta
  useEffect(() => {
    const scanForInvitations = async () => {
      try {
        setIsLoadingBox(true);
        let foundBoxId = null;

        // 1. Intentar leer de la metadata real del usuario Supabase (La fuente de verdad definitiva)
        const supabase = createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (user && user.user_metadata?.box_id) {
          foundBoxId = user.user_metadata.box_id;
        }

        // 2. Fallback: Intentar leer de localStorage
        if (!foundBoxId) {
          foundBoxId = localStorage.getItem("pending_invite_box_id");
        }
        
        // 3. Fallback: Intentar leer de las Cookies
        if (!foundBoxId && typeof document !== "undefined") {
          const match = document.cookie.match(new RegExp('(^| )pending_invite_box_id=([^;]+)'));
          if (match) foundBoxId = match[2];
        }

        if (foundBoxId) {
          // Limpiar cualquier espacio o caracter raro
          const cleanId = foundBoxId.replace(/[^a-zA-Z0-9-]/g, "").trim();
          await fetchBoxDetails(cleanId, true); // silent initial load
        }
      } catch (err) {
        console.error("Error escaneando invitaciones:", err);
      } finally {
        setIsLoadingBox(false);
      }
    };

    scanForInvitations();
  }, []);

  // 📞 Traer el nombre real del Box desde nuestra API segura
  const fetchBoxDetails = async (id: string, silent: boolean = false) => {
    // Validar formato UUID básico antes de pegarle a la API
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      if (!silent) toast.error("El formato del código de invitación no es válido.");
      setBoxId(null);
      setBoxName(null);
      return;
    }

    try {
      if (!silent) setIsLoadingBox(true);
      const res = await fetch(`/api/join-box?boxId=${id}`);
      const data = await res.json();

      if (res.ok && data.name) {
        setBoxId(id);
        setBoxName(data.name);
        if (!silent) toast.success(`¡Box "${data.name}" identificado con éxito!`);
      } else {
        setBoxId(null);
        setBoxName(null);
        if (!silent) toast.error(data.error || "No pudimos encontrar un Box con ese enlace.");
      }
    } catch (err) {
      console.error("Error cargando datos del box:", err);
      if (!silent) toast.error("Fallo de conexión al servidor.");
    } finally {
      if (!silent) setIsLoadingBox(false);
    }
  };

  // 🤝 Ejecutar la vinculación real en el Servidor
  const handleConfirmJoin = async (idToJoin: string = boxId || "") => {
    if (!idToJoin) return;
    
    setIsLinking(true);
    try {
      const res = await fetch("/api/join-box", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boxId: idToJoin }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(`¡Bienvenido a ${boxName || "tu Box"}!`);
        
        // Limpiar tokens locales tras éxito
        localStorage.removeItem("pending_invite_box_id");
        document.cookie = "pending_invite_box_id=; path=/; max-age=0";
        
        // Forzar recarga completa para renderizar el panel del Alumno
        setTimeout(() => {
          window.location.reload();
        }, 800);
      } else {
        toast.error(data.error || "Error al vincular. Intenta de nuevo.");
        setIsLinking(false);
      }
    } catch (err) {
      toast.error("Ocurrió un fallo en la conexión.");
      setIsLinking(false);
    }
  };

  // ⌨️ Procesar input manual de ID o Link
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawInput = manualInput.trim();
    if (!rawInput) return;

    // ⚡ REGEX DE ÉLITE: Extrae el UUID exacto de 36 caracteres de cualquier URL o texto!
    const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const match = rawInput.match(uuidRegex);

    if (match && match[0]) {
      const cleanUuid = match[0];
      await fetchBoxDetails(cleanUuid);
    } else {
      toast.error("El texto ingresado no contiene un código de invitación válido.");
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  };

  const handleRejectInvite = () => {
    setBoxId(null);
    setBoxName(null);
    localStorage.removeItem("pending_invite_box_id");
    document.cookie = "pending_invite_box_id=; path=/; max-age=0";
  };

  const firstName = fullName ? fullName.split(" ")[0] : "atleta";

  return (
    <div className="min-h-screen bg-[#050509] text-white flex flex-col items-center justify-center p-4 select-none relative overflow-hidden">
      {/* Luces ambientales */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
      <div className="absolute -top-48 -left-48 w-96 h-96 bg-primary/10 rounded-full blur-[120px]" />
      
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 text-center relative overflow-hidden border border-border animate-in fade-in duration-500">
        {/* Fondo interior */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50/50 to-white pointer-events-none" />

        <div className="relative z-10 text-slate-900">
          
          {/* ESTADO CARGANDO DETALLES DEL BOX */}
          {isLoadingBox ? (
            <div className="py-12 flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <p className="text-sm font-medium text-slate-500">Buscando invitaciones en la nube...</p>
            </div>
          ) : boxId && boxName ? (
            
            /* 😍 ESTADO 1: CONFIRMAR INVITACIÓN ENCONTRADA */
            <div className="animate-in zoom-in-95 duration-300">
              <div className="w-20 h-20 mx-auto bg-green-100 rounded-[28px] flex items-center justify-center mb-6 shadow-inner">
                <Trophy className="w-10 h-10 text-green-600" />
              </div>

              <h1 className="text-2xl font-black tracking-tight text-slate-900 mb-2">
                ¡Invitación Recibida!
              </h1>
              <p className="text-sm text-slate-500 leading-relaxed mb-6">
                Detectamos que fuiste invitado a formar parte de:
              </p>

              {/* Tarjeta Informativa del Box */}
              <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-xl mb-8 flex flex-col items-center gap-1">
                <span className="text-[10px] uppercase tracking-widest font-black text-primary">Centro de Entrenamiento</span>
                <h3 className="text-xl font-extrabold">{boxName}</h3>
              </div>

              {/* Botones de Vinculación */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => handleConfirmJoin(boxId)}
                  disabled={isLinking}
                  className="w-full py-4 bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition shadow-lg shadow-primary/25 hover:scale-[1.02] disabled:opacity-70"
                >
                  {isLinking ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Conectando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      Confirmar y Unirme Ahora
                    </>
                  )}
                </button>
                
                <button
                  onClick={handleRejectInvite}
                  disabled={isLinking}
                  className="text-xs font-semibold text-slate-400 hover:text-red-500 transition py-2"
                >
                  Esta no es mi invitación / Ignorar
                </button>
              </div>
            </div>
          ) : (
            
            /* 🛠️ ESTADO 2: VISTA VACÍA CON INPUT MANUAL */
            <div className="animate-in fade-in duration-500">
              <div className="w-16 h-16 mx-auto bg-slate-100 rounded-2xl flex items-center justify-center mb-6">
                <Dumbbell className="w-8 h-8 text-slate-400 animate-pulse" />
              </div>

              <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
                ¡Hola, {firstName}!
              </h1>
              <p className="text-sm text-slate-500 leading-relaxed mb-8">
                Tu cuenta está lista, pero aún no estás vinculado a ningún Box.
              </p>

              {/* Formulario Manual */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left mb-8">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                  Vincular Manualmente
                </h3>
                <form onSubmit={handleManualSubmit} className="flex gap-2">
                  <input 
                    type="text"
                    placeholder="Pega el ID o enlace aquí"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    className="flex-grow bg-white border border-slate-200 text-slate-900 text-sm px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition placeholder:text-slate-400"
                  />
                  <button 
                    type="submit"
                    className="bg-slate-900 hover:bg-slate-800 text-white p-3 rounded-xl transition shrink-0"
                    title="Verificar"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
                <p className="text-[10px] text-slate-400 mt-2 leading-tight">
                  Pídele a tu profesor que te envíe el <strong>enlace de invitación</strong> y pégalo arriba.
                </p>
              </div>

              <button
                onClick={handleLogout}
                disabled={loading}
                className="w-full py-3.5 border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-slate-600 rounded-2xl font-semibold text-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <LogOut className="w-4 h-4" />
                {loading ? "Cerrando..." : "Cerrar Sesión"}
              </button>
            </div>
          )}

        </div>
      </div>
      
      <p className="text-white/20 text-[9px] mt-8 font-bold tracking-widest uppercase">
        ENTRENAPP CORE V2
      </p>
    </div>
  );
}
