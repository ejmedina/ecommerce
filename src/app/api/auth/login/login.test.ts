import { beforeEach, describe, expect, it, vi } from "vitest"

const mockDb = {
  user: {
    findUnique: vi.fn(),
  },
}

const mockSignIn = vi.fn()
const mockMergeGuestCartIntoUserCart = vi.fn()
const mockCookies = vi.fn()

vi.mock("@/lib/db", () => ({
  db: mockDb,
}))

vi.mock("@/lib/auth", () => ({
  signIn: mockSignIn,
}))

vi.mock("@/lib/cart", () => ({
  mergeGuestCartIntoUserCart: mockMergeGuestCartIntoUserCart,
}))

vi.mock("next/headers", () => ({
  cookies: mockCookies,
}))

vi.mock("next-auth", () => ({
  AuthError: class AuthError extends Error {
    type = "AuthError"
  },
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

  it("merges the browser cart after a successful login", async () => {
    const { POST } = await import("./route")

    mockDb.user.findUnique.mockResolvedValue({
      id: "user-1",
      isActive: true,
      passwordHash: "hash",
      status: "ACTIVE",
      importedFromWooCommerce: false,
      requiresPasswordSetup: false,
    })
    mockSignIn.mockResolvedValue({})
    mockCookies.mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: "guest-cart-session" }),
    })
    mockMergeGuestCartIntoUserCart.mockResolvedValue({
      strategy: "adopted_guest_cart",
      itemCount: 2,
    })

    const response = await POST(
      new Request("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "cliente@example.com",
          password: "123456",
        }),
      }),
    )

    expect(response.status).toBe(200)
    expect(mockMergeGuestCartIntoUserCart).toHaveBeenCalledWith("user-1", "guest-cart-session")
  })
})
