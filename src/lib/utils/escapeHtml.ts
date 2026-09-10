/**
 * Escapa caracteres especiales HTML para prevenir inyecciones HTML (XSS)
 * en plantillas de correo y otras salidas de texto en HTML.
 *
 * @param str - El texto a escapar
 * @returns El texto con caracteres peligrosos reemplazados por sus entidades HTML
 *
 * @example
 * escapeHtml('<script>alert("xss")</script>')
 * // → '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
 */
export function escapeHtml(str: string): string {
  if (!str || typeof str !== "string") return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}
