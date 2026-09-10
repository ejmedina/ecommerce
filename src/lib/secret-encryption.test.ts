import { afterEach, describe, expect, it } from "vitest"
import { decryptSecret, encryptSecret } from "./secret-encryption"

const originalKey = process.env.ANALYTICS_ENCRYPTION_KEY

afterEach(() => {
  if (originalKey === undefined) {
    delete process.env.ANALYTICS_ENCRYPTION_KEY
  } else {
    process.env.ANALYTICS_ENCRYPTION_KEY = originalKey
  }
})

describe("analytics secret encryption", () => {
  it("round-trips a secret with authenticated encryption", () => {
    process.env.ANALYTICS_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64")

    const encrypted = encryptSecret("meta-capi-secret")

    expect(encrypted.ciphertext).not.toContain("meta-capi-secret")
    expect(decryptSecret(encrypted)).toBe("meta-capi-secret")
  })

  it("rejects an invalid deployment key", () => {
    process.env.ANALYTICS_ENCRYPTION_KEY = "not-a-32-byte-key"

    expect(() => encryptSecret("meta-capi-secret")).toThrow("32 bytes")
  })
})
