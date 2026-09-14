import { beforeEach, describe, expect, it, vi } from "vitest"

const mockDb = {
  user: { findUnique: vi.fn() },
}
const mockCreateVerificationTokenRecord = vi.fn()
const mockSendVerificationEmail = vi.fn()

vi.mock("@/lib/db", () => ({ db: mockDb }))
vi.mock("@/lib/verification-tokens", () => ({ createVerificationTokenRecord: mockCreateVerificationTokenRecord }))
vi.mock("@/lib/email", () => ({ sendVerificationEmail: mockSendVerificationEmail }))

describe("POST /api/auth/request-password-reset", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSendVerificationEmail.mockResolvedValue({ success: true })
  })

  it("returns the same generic response for an unknown email without sending a token", async () => {
    const { POST } = await import("./route")
    mockDb.user.findUnique.mockResolvedValue(null)

    const response = await POST(new Request("http://localhost:3000/api/auth/request-password-reset", {
      method: "POST",
      body: JSON.stringify({ email: "unknown@example.com" }),
    }))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      success: true,
      message: "Si existe una cuenta activa con ese email, te enviamos un enlace para restablecer la contraseña.",
    })
    expect(mockCreateVerificationTokenRecord).not.toHaveBeenCalled()
    expect(mockSendVerificationEmail).not.toHaveBeenCalled()
  })

  it("creates a one-hour password-reset token for an active account", async () => {
    const { POST } = await import("./route")
    mockDb.user.findUnique.mockResolvedValue({
      email: "customer@example.com",
      isActive: true,
      status: "ACTIVE",
      passwordHash: "hash",
    })
    mockCreateVerificationTokenRecord.mockResolvedValue("raw-token")

    const response = await POST(new Request("http://localhost:3000/api/auth/request-password-reset", {
      method: "POST",
      body: JSON.stringify({ email: "CUSTOMER@example.com" }),
    }))

    expect(response.status).toBe(200)
    expect(mockCreateVerificationTokenRecord).toHaveBeenCalledWith(expect.objectContaining({
      identifier: "customer@example.com",
      type: "PASSWORD_RESET",
      expires: expect.any(Date),
    }))
    expect(mockSendVerificationEmail).toHaveBeenCalledWith({
      to: "customer@example.com",
      token: "raw-token",
      type: "password_reset",
    })
  })
})
