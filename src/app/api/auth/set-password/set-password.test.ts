import { beforeEach, describe, expect, it, vi } from "vitest"

const mockDb = {
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}

const mockFindVerificationTokenRecord = vi.fn()
const mockDeleteVerificationTokenRecord = vi.fn()

vi.mock("@/lib/db", () => ({
  db: mockDb,
}))

vi.mock("@/lib/verification-tokens", () => ({
  findVerificationTokenRecord: mockFindVerificationTokenRecord,
  deleteVerificationTokenRecord: mockDeleteVerificationTokenRecord,
}))

describe("POST /api/auth/set-password", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("requires a valid token", async () => {
    const { POST } = await import("./route")

    mockFindVerificationTokenRecord.mockResolvedValue(null)

    const response = await POST(
      new Request("http://localhost:3000/api/auth/set-password", {
        method: "POST",
        body: JSON.stringify({
          token: "invalid",
          password: "123456",
          name: "Cliente",
        }),
      }) as never
    )

    expect(response.status).toBe(404)
  })

  it("activates a migrated account, hashes the password and clears the setup flag", async () => {
    const { POST } = await import("./route")

    mockFindVerificationTokenRecord.mockResolvedValue({
      identifier: "cliente@example.com",
      type: "PASSWORD_SETUP",
      expires: new Date(Date.now() + 60_000),
    })
    mockDb.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "cliente@example.com",
      name: "Cliente Demo",
      phone: null,
    })
    mockDb.user.update.mockResolvedValue({
      id: "user-1",
    })

    const response = await POST(
      new Request("http://localhost:3000/api/auth/set-password", {
        method: "POST",
        body: JSON.stringify({
          token: "valid-token",
          password: "123456",
        }),
      }) as never
    )

    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(mockDb.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: expect.objectContaining({
          isActive: true,
          requiresPasswordSetup: false,
          emailVerifiedAt: expect.any(Date),
          passwordHash: expect.any(String),
        }),
      })
    )
    expect(mockDeleteVerificationTokenRecord).toHaveBeenCalledWith("valid-token")
  })
})
