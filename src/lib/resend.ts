import { Resend } from "resend";

// Lazy init — evita crash en build time cuando la env var no existe
let _resend: Resend | null = null;

export function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) {
      throw new Error("RESEND_API_KEY no está configurada en las variables de entorno");
    }
    _resend = new Resend(key);
  }
  return _resend;
}

// Mantener export para compatibilidad, pero lazy
export const resend = new Proxy({} as Resend, {
  get(_target, prop) {
    return (getResend() as Record<string, unknown>)[prop as string];
  },
});

export const EMAIL_FROM = process.env.RESEND_FROM_EMAIL || "CreAPP <onboarding@resend.dev>";
