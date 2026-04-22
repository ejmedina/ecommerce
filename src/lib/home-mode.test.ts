import { describe, expect, it } from "vitest"
import { getHomeMode, isInstitutionalHomeEnabled } from "./home-mode"

describe("getHomeMode", () => {
  it("should default to storefront when HOME_MODE is undefined", () => {
    expect(getHomeMode(undefined)).toBe("storefront")
  })

  it("should default to storefront when HOME_MODE is invalid", () => {
    expect(getHomeMode("legacy")).toBe("storefront")
  })

  it("should accept institutional mode case-insensitively", () => {
    expect(getHomeMode("institutional")).toBe("institutional")
    expect(getHomeMode("INSTITUTIONAL")).toBe("institutional")
  })

  it("should trim whitespace before parsing the mode", () => {
    expect(getHomeMode(" institutional ")).toBe("institutional")
  })
})

describe("isInstitutionalHomeEnabled", () => {
  it("should return true only for institutional mode", () => {
    expect(isInstitutionalHomeEnabled("institutional")).toBe(true)
    expect(isInstitutionalHomeEnabled("storefront")).toBe(false)
    expect(isInstitutionalHomeEnabled(undefined)).toBe(false)
  })
})
