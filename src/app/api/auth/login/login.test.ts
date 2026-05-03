import { beforeEach, describe, expect, it, vi } from "vitest"

const mockDb = {
  user: {
    findUnique: vi.fn(),
  },
}

const mockSignIn = vi.fn()

vi.mock("@/lib/db", () => ({
  db: mockDb,
}))

vi.mock("@/lib/auth", () => ({
  signIn: mockSignIn,
}))

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("blocks migrated users pending activation and returns activation guidance", async () => {
    const { POST } = await import("./route")

    mockDb.user.findUnique.mockResolvedValue({
      isActive: false,
      passwordHash: null,
      status: "ACTIVE",
      importedFromWooCommerce: true,
      requiresPasswordSetup: true,
    })

    const response = await POST(
      new Request("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "cliente@example.com",
          password: "123456",
        }),
      })
    )

    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.code).toBe("MIGRATED_ACCOUNT_ACTIVATION_REQUIRED")
    expect(mockSignIn).not.toHaveBeenCalled()
  })
})
