// Service Worker — EntrenAPP
// Este archivo se genera con una versión que cambia en cada deploy.
// Cuando cambia, el browser descarga el nuevo SW y limpia el caché viejo.

const CACHE_VERSION = "v4"; // ← cambiá esto en cada deploy para forzar refresh
const CACHE_NAME = `entrenapp-${CACHE_VERSION}`;

// Assets a cachear en instalación (shell de la PWA)
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
];

// ── Instalación: cachea solo el shell ──────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  // Forzar activación inmediata sin esperar a que las pestañas viejas cierren
  self.skipWaiting();
});

// ── Activación: borra cachés viejos ────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => {
            console.log("[SW] Borrando caché viejo:", key);
            return caches.delete(key);
          })
      )
    )
  );
  // Tomar control de todas las pestañas inmediatamente
  self.clients.claim();
});

// ── Fetch: Network-first para todo (no cachear páginas dinámicas) ──
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Solo interceptar requests al mismo origen
  if (url.origin !== self.location.origin) return;

  // Para navegación (páginas HTML): siempre ir a la red primero
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match("/") // Fallback offline a la home
      )
    );
    return;
  }

  // Para assets estáticos (_next/static): cache-first con fallback de red
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) => cached || fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
      )
    );
    return;
  }

  // Todo lo demás: red directa (API, Supabase, etc.)
  // No cachear para evitar datos desactualizados
});
