import { describe, expect, it } from "vitest"
import { normalizeOrderPhone } from "./order-phone"

describe("normalizeOrderPhone", () => {
  it("accepts an existing or entered phone and preserves its formatting", () => {
    expect(normalizeOrderPhone("  +54 11 1234-5678  ")).toBe("+54 11 1234-5678")
  })

  it("rejects missing, whitespace-only and incomplete phone numbers", () => {
    expect(normalizeOrderPhone(null)).toBeNull()
    expect(normalizeOrderPhone("   ")).toBeNull()
    expect(normalizeOrderPhone("1234567")).toBeNull()
  })
})
