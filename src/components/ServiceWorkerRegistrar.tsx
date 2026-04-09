"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      // Registrar (o actualizar) el SW en cada carga
      navigator.serviceWorker
        .register("/sw.js", { updateViaCache: "none" })
        .then((reg) => {
          console.log("[SW] Registrado:", reg.scope);

          // Forzar chequeo de actualización inmediatamente
          reg.update();

          // Si hay un SW en espera, activarlo de inmediato y recargar
          if (reg.waiting) {
            reg.waiting.postMessage({ type: "SKIP_WAITING" });
            window.location.reload();
          }

          // Cuando un nuevo SW toma el control, recargamos para mostrar la versión nueva
          navigator.serviceWorker.addEventListener("controllerchange", () => {
            window.location.reload();
          });
        })
        .catch((err) => console.error("[SW] Error al registrar:", err));
    }
  }, []);

  return null;
}
