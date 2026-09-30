export function normalizeOrderPhone(value: unknown): string | null {
  if (typeof value !== "string") return null
  const phone = value.trim()
  return (phone.match(/\d/g)?.length ?? 0) >= 8 ? phone : null
}
