import { describe, expect, it } from "vitest"
import {
  buildUserImportCandidate,
  dedupeCandidatesByEmail,
  normalizeEmail,
} from "./woo-user-migration"

describe("woo user migration helpers", () => {
  it("excludes admins and elevated roles", () => {
    const candidate = buildUserImportCandidate({
      id: 10,
      email: "admin@example.com",
      role: "administrator",
      meta_data: [{ key: "wc_last_active", value: "1776344454" }],
    })

    expect(candidate.decision).toBe("exclude_elevated_role")
  })

  it("excludes users without reliable last login within the last year", () => {
    const candidate = buildUserImportCandidate({
      id: 11,
      email: "customer@example.com",
      role: "customer",
      meta_data: [{ key: "wc_last_active", value: "1714700000" }],
    })

    expect(candidate.decision).toBe("exclude_stale_last_login")
  })

  it("deduplicates candidates by normalized email", () => {
    const primary = buildUserImportCandidate({
      id: 12,
      email: " Cliente@Example.com ",
      role: "customer",
      billing: {
        address_1: "Calle Falsa 123",
        city: "CABA",
        state: "Buenos Aires",
        postcode: "1000",
        country: "AR",
      },
      meta_data: [{ key: "wc_last_active", value: "1776344454" }],
    })

    const duplicate = buildUserImportCandidate({
      id: 13,
      email: "cliente@example.com",
      role: "customer",
      shipping: {
        address_1: "Otra Calle 456",
        city: "CABA",
        state: "Buenos Aires",
        postcode: "1000",
        country: "AR",
      },
      meta_data: [{ key: "wc_last_active", value: "1776345554" }],
    })

    const result = dedupeCandidatesByEmail([primary, duplicate])

    expect(normalizeEmail(" Cliente@Example.com ")).toBe("cliente@example.com")
    expect(result.duplicateEmails).toBe(1)
    expect(result.uniqueCandidates).toHaveLength(1)
    expect(result.uniqueCandidates[0]?.normalizedEmail).toBe("cliente@example.com")
    expect(result.uniqueCandidates[0]?.addresses).toHaveLength(2)
    expect(result.uniqueCandidates[0]?.sourceId).toBe(13)
  })
})
