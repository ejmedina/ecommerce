import { normalizeTimeZone } from "@/lib/time-zone"

export function formatCurrency(amount: number | string, currency = "ARS"): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
  }).format(num)
}

export function formatDate(
  date: Date | string,
  options?: Intl.DateTimeFormatOptions,
  timeZone?: string | null
): string {
  const d = typeof date === "string" ? new Date(date) : date
  const safeTimeZone = normalizeTimeZone(timeZone)
  const resolvedOptions = options
    ? { ...options, timeZone: options.timeZone ?? safeTimeZone }
    : {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: safeTimeZone,
      }
  return new Intl.DateTimeFormat("es-AR", resolvedOptions).format(d)
}

export function formatDateTime(date: Date | string, timeZone?: string | null): string {
  return formatDate(date, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: normalizeTimeZone(timeZone),
  }, timeZone)
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
}

export function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${timestamp}-${random}`
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + "..."
}
