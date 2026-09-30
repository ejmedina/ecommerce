import { beforeEach, describe, expect, it, vi } from "vitest"

const mockDb = {
  user: { findUnique: vi.fn(), create: vi.fn() },
}
const mockCreateToken = vi.fn()
const mockSendVerificationEmail = vi.fn()

vi.mock("@/lib/db", () => ({ db: mockDb }))
vi.mock("@/lib/verification-tokens", () => ({ createVerificationTokenRecord: mockCreateToken }))
vi.mock("@/lib/email", () => ({ sendVerificationEmail: mockSendVerificationEmail }))
vi.mock("@/lib/account-activation", () => ({
  isMigratedUserPendingActivation: vi.fn(() => false),
  sendActivationForUser: vi.fn(),
}))

describe("POST /api/auth/guest-checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDb.user.findUnique.mockResolvedValue(null)
    mockCreateToken.mockResolvedValue("token")
  })

  it("rejects a guest without a valid phone before creating the account", async () => {
    const { POST } = await import("./route")
    const response = await POST(new Request("http://localhost/api/auth/guest-checkout", {
      method: "POST",
      body: JSON.stringify({ email: "guest@example.com", phone: "  " }),
    }))

    expect(response.status).toBe(400)
    expect(mockDb.user.create).not.toHaveBeenCalled()
  })

  it("stores the phone on a new guest account", async () => {
    const { POST } = await import("./route")
    const response = await POST(new Request("http://localhost/api/auth/guest-checkout", {
      method: "POST",
      body: JSON.stringify({ email: "GUEST@example.com", phone: "  +54 11 1234-5678 " }),
    }))

    expect(response.status).toBe(200)
    expect(mockDb.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ email: "guest@example.com", phone: "+54 11 1234-5678" }),
    })
  })
})
