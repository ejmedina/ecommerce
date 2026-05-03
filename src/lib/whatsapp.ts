export function normalizeWhatsappPhone(phone: string | null | undefined) {
  if (!phone) return null

  const digits = phone.replace(/\D/g, "")
  return digits.length > 0 ? digits : null
}

export function buildWhatsappUrl({
  phone,
  message,
}: {
  phone: string | null | undefined
  message: string | null | undefined
}) {
  const normalizedPhone = normalizeWhatsappPhone(phone)
  if (!normalizedPhone) return null

  const params = new URLSearchParams()
  if (message?.trim()) {
    params.set("text", message.trim())
  }

  const query = params.toString()
  return `https://api.whatsapp.com/send?phone=${normalizedPhone}${query ? `&${query}` : ""}`
}
