"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      const isLocalhost =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1" ||
        window.location.hostname.startsWith("192.168.");

      if (isLocalhost) {
        // Desregistrar cualquier service worker activo en localhost para evitar problemas de caché en desarrollo
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister().then((success) => {
              if (success) {
                console.log("[SW] Desregistrado SW activo de localhost para desarrollo");
                window.location.reload();
              }
            });
          }
        });
        return;
      }

      // Registrar (o actualizar) el SW en cada carga en producción
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
