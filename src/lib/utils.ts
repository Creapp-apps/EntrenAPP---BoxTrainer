import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "ARS"): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

export function formatShortDate(date: string | Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
  }).format(new Date(date));
}

export const DAY_NAMES: Record<number, string> = {
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
  7: "Domingo",
};

export const WEEK_TYPE_LABELS: Record<string, string> = {
  carga: "Carga",
  descarga: "Descarga",
  intensificacion: "Intensificación",
  acumulacion: "Acumulación",
  test: "Test / Evaluación",
};

export const WEEK_TYPE_COLORS: Record<string, string> = {
  carga: "bg-blue-100 text-blue-700",
  descarga: "bg-green-100 text-green-700",
  intensificacion: "bg-orange-100 text-orange-700",
  acumulacion: "bg-purple-100 text-purple-700",
  test: "bg-yellow-100 text-yellow-700",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pagado: "Pagado",
  pendiente: "Pendiente",
  vencido: "Vencido",
  cancelado: "Cancelado",
};

export const PAYMENT_STATUS_COLORS: Record<string, string> = {
  pagado: "bg-green-100 text-green-700",
  pendiente: "bg-yellow-100 text-yellow-700",
  vencido: "bg-red-100 text-red-700",
  cancelado: "bg-gray-100 text-gray-700",
};

// Calcula el peso a usar dado un 1RM y un porcentaje
export function calculateWeight(oneRM: number, percentage: number): number {
  return Math.round((oneRM * percentage) / 100 / 2.5) * 2.5; // redondea a 2.5kg
}

// Obtiene el día de la semana actual (1=Lunes, 7=Domingo)
export function getCurrentDayOfWeek(): number {
  const day = new Date().getDay();
  return day === 0 ? 7 : day;
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
