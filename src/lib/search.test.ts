import { describe, expect, it } from "vitest"
import { normalizeSearchQuery } from "@/lib/search"

describe("normalizeSearchQuery", () => {
  it("normalizes whitespace, casing, and diacritics", () => {
    expect(normalizeSearchQuery("  Budín   de  Limón ")).toBe("budin de limon")
  })

  it("treats accented and unaccented queries identically", () => {
    expect(normalizeSearchQuery("budín")).toBe(normalizeSearchQuery("budin"))
  })
})
