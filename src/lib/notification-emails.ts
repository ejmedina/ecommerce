import { z } from "zod"

const emailSchema = z.email()

export function parseNotificationEmails(value: unknown): string[] {
  const candidates = Array.isArray(value)
    ? value.flatMap((entry) => typeof entry === "string" ? entry.split(/[\n,;]/) : [])
    : typeof value === "string"
      ? value.split(/[\n,;]/)
      : []

  return [...new Set(candidates.map((email) => email.trim().toLowerCase()).filter(Boolean))]
}

export function validateNotificationEmails(value: unknown) {
  const emails = parseNotificationEmails(value)
  const invalidEmails = emails.filter((email) => !emailSchema.safeParse(email).success)

  return { emails, invalidEmails }
}
