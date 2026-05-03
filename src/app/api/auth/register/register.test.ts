import { beforeEach, describe, expect, it, vi } from "vitest"

const mockDb = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
}

const mockSendActivationForUser = vi.fn()
const mockIsMigratedUserPendingActivation = vi.fn()

vi.mock("@/lib/db", () => ({
  db: mockDb,
}))

vi.mock("@/lib/account-activation", () => ({
  sendActivationForUser: mockSendActivationForUser,
  isMigratedUserPendingActivation: mockIsMigratedUserPendingActivation,
}))

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("starts activation flow instead of creating a duplicate for migrated users", async () => {
    const { POST } = await import("./route")

    const existingUser = {
      id: "user-1",
      email: "cliente@example.com",
      name: "Cliente",
      isActive: false,
      importedFromWooCommerce: true,
      requiresPasswordSetup: true,
      passwordHash: null,
    }

    mockDb.user.findUnique.mockResolvedValue(existingUser)
    mockIsMigratedUserPendingActivation.mockReturnValue(true)

    const response = await POST(
      new Request("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: "Cliente",
          email: "cliente@example.com",
          password: "123456",
          phone: "11223344",
        }),
      }) as never
    )

    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.flow).toBe("migrated")
    expect(mockDb.user.create).not.toHaveBeenCalled()
    expect(mockSendActivationForUser).toHaveBeenCalledWith(existingUser)
  })

  it("keeps normal registration flow for new users", async () => {
    const { POST } = await import("./route")

    mockDb.user.findUnique.mockResolvedValue(null)
    mockDb.user.create.mockResolvedValue({
      id: "user-2",
      email: "nuevo@example.com",
      name: "Nuevo",
      passwordHash: "hashed-password",
    })
    mockIsMigratedUserPendingActivation.mockReturnValue(false)

    const response = await POST(
      new Request("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: "Nuevo",
          email: "nuevo@example.com",
          password: "123456",
          phone: "11223344",
        }),
      }) as never
    )

    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.flow).toBe("new")
    expect(mockDb.user.create).toHaveBeenCalled()
    expect(mockSendActivationForUser).toHaveBeenCalled()
  })
})
