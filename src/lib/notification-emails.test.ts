import { describe, expect, it } from "vitest"
import { parseNotificationEmails, validateNotificationEmails } from "./notification-emails"

describe("notification email helpers", () => {
  it("normalizes, splits and deduplicates addresses", () => {
    expect(parseNotificationEmails(" Admin@Example.com, ventas@example.com\nadmin@example.com ")).toEqual([
      "admin@example.com",
      "ventas@example.com",
    ])
  })

  it("reports invalid addresses", () => {
    expect(validateNotificationEmails(["ok@example.com", "not-an-email"]).invalidEmails).toEqual(["not-an-email"])
  })
})
