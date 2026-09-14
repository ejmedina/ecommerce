import { beforeEach, describe, expect, it, vi } from "vitest"

const mockDb = {
  user: { findUnique: vi.fn() },
}
const mockSendPasswordResetEmail = vi.fn()

vi.mock("@/lib/db", () => ({ db: mockDb }))
vi.mock("@/lib/password-reset", () => ({ sendPasswordResetEmail: mockSendPasswordResetEmail }))

describe("POST /api/auth/request-password-reset", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSendPasswordResetEmail.mockResolvedValue({ success: true })
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
    expect(mockSendPasswordResetEmail).not.toHaveBeenCalled()
  })

  it("sends a password-reset token for an active account", async () => {
    const { POST } = await import("./route")
    mockDb.user.findUnique.mockResolvedValue({
      email: "customer@example.com",
      isActive: true,
      status: "ACTIVE",
      passwordHash: "hash",
    })

    const response = await POST(new Request("http://localhost:3000/api/auth/request-password-reset", {
      method: "POST",
      body: JSON.stringify({ email: "CUSTOMER@example.com" }),
    }))

    expect(response.status).toBe(200)
    expect(mockSendPasswordResetEmail).toHaveBeenCalledWith("customer@example.com")
  })
})
