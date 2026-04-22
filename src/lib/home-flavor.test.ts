import { describe, expect, it } from "vitest"
import { getHomeFlavor, getInstitutionalHomeFlavor } from "./home-flavor"

describe("getHomeFlavor", () => {
  it("should return null when HOME_FLAVOR is undefined", () => {
    expect(getHomeFlavor(undefined)).toBeNull()
  })

  it("should return null when HOME_FLAVOR is invalid", () => {
    expect(getHomeFlavor("legacy")).toBeNull()
  })

  it("should accept a known flavor case-insensitively", () => {
    expect(getHomeFlavor("pgi")).toBe("pgi")
    expect(getHomeFlavor("PGI")).toBe("pgi")
  })

  it("should trim whitespace before parsing the flavor", () => {
    expect(getHomeFlavor(" pgi ")).toBe("pgi")
  })
})

describe("getInstitutionalHomeFlavor", () => {
  it("should return null when no supported flavor is configured", () => {
    expect(getInstitutionalHomeFlavor(undefined)).toBeNull()
    expect(getInstitutionalHomeFlavor("elpan")).toBeNull()
  })

  it("should resolve the PGI preset when configured", () => {
    const flavor = getInstitutionalHomeFlavor("pgi")

    expect(flavor).not.toBeNull()
    expect(flavor?.id).toBe("pgi")
    expect(flavor?.branding.name).toBe("PGI Argentina")
    expect(flavor?.content.contactEmail).toBe("comercial@pgi.com.ar")
  })
})
