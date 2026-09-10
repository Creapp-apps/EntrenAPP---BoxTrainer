/**
 * Rate Limiter en memoria simple para APIs de Next.js.
 *
 * Implementación basada en ventana deslizante por IP.
 * Funciona por instancia de servidor (no persistido entre instancias de Vercel).
 * Para producción con múltiples instancias se puede migrar a Upstash/Redis.
 *
 * @example
 * const result = rateLimiter.check(request, { maxRequests: 5, windowMs: 60_000 });
 * if (!result.allowed) return NextResponse.json({ error: result.error }, { status: 429 });
 */

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

// Mapa IP → historial de solicitudes. Se limpia automáticamente.
const store = new Map<string, RateLimitEntry>();

// Limpiar entradas antiguas cada 5 minutos para evitar memory leaks
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now - entry.windowStart > CLEANUP_INTERVAL_MS) {
      store.delete(key);
    }
  }
}, CLEANUP_INTERVAL_MS);

export interface RateLimitOptions {
  /** Número máximo de solicitudes en la ventana */
  maxRequests: number;
  /** Tamaño de la ventana en milisegundos */
  windowMs: number;
  /** Identificador extra para segmentar por ruta/acción, además de la IP */
  keyPrefix?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  error?: string;
}

/**
 * Extrae la IP real del cliente desde los headers de Next.js.
 */
function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export const rateLimiter = {
  check(request: Request, options: RateLimitOptions): RateLimitResult {
    const { maxRequests, windowMs, keyPrefix = "default" } = options;
    const ip = getClientIp(request);
    const key = `${keyPrefix}:${ip}`;
    const now = Date.now();

    const entry = store.get(key);

    if (!entry || now - entry.windowStart > windowMs) {
      // Nueva ventana
      store.set(key, { count: 1, windowStart: now });
      return { allowed: true, remaining: maxRequests - 1 };
    }

    if (entry.count >= maxRequests) {
      const retryAfterSec = Math.ceil((entry.windowStart + windowMs - now) / 1000);
      return {
        allowed: false,
        remaining: 0,
        error: `Demasiadas solicitudes. Intentá de nuevo en ${retryAfterSec} segundos.`,
      };
    }

    entry.count++;
    return { allowed: true, remaining: maxRequests - entry.count };
  },
};
