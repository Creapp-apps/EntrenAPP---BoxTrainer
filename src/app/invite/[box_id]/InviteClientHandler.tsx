"use client";

import { useEffect } from "react";

export default function InviteClientHandler({ boxId }: { boxId: string }) {
  useEffect(() => {
    if (typeof window !== "undefined" && boxId) {
      // Guardar en localStorage para acceso rápido en el cliente
      localStorage.setItem("pending_invite_box_id", boxId);
      
      // Guardar en Cookie (expira en 24 horas) para persistir en el navegador y enviarlo a Supabase Auth redirects
      document.cookie = `pending_invite_box_id=${boxId}; path=/; max-age=86400; SameSite=Lax`;
      
      console.log("Invitación capturada y guardada:", boxId);
    }
  }, [boxId]);

  return null;
}
