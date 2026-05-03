import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

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

describe("GET /api/auth/verify-email", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetModules()
  })

  it("should return 400 if no token provided", async () => {
    const { GET } = await import("./route")

    const req = new NextRequest("http://localhost:3000/api/auth/verify-email")
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.message).toBe("Token requerido")
  })

  it("should return 400 for invalid token", async () => {
    const { GET } = await import("./route")

    mockFindVerificationTokenRecord.mockResolvedValue(null)

    const req = new NextRequest("http://localhost:3000/api/auth/verify-email?token=invalid")
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.message).toBe("Token inválido")
  })

  it("should return 400 for expired token", async () => {
    const { GET } = await import("./route")

    mockFindVerificationTokenRecord.mockResolvedValue({
      token: "expired-token",
      identifier: "test@example.com",
      type: "EMAIL_VERIFICATION",
      expires: new Date("2020-01-01"),
    })

    const req = new NextRequest("http://localhost:3000/api/auth/verify-email?token=expired-token")
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.message).toBe("Token expirado")
  })

  it("should return 400 for invalid token type", async () => {
    const { GET } = await import("./route")

    mockFindVerificationTokenRecord.mockResolvedValue({
      token: "wrong-type-token",
      identifier: "test@example.com",
      type: "PASSWORD_RESET",
      expires: new Date(Date.now() + 86400000),
    })

    const req = new NextRequest("http://localhost:3000/api/auth/verify-email?token=wrong-type-token")
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.message).toBe("Tipo de token inválido")
  })

  it("should return 404 if user not found", async () => {
    const { GET } = await import("./route")

    mockFindVerificationTokenRecord.mockResolvedValue({
      token: "valid-token",
      identifier: "test@example.com",
      type: "EMAIL_VERIFICATION",
      expires: new Date(Date.now() + 86400000),
    })
    mockDb.user.findUnique.mockResolvedValue(null)

    const req = new NextRequest("http://localhost:3000/api/auth/verify-email?token=valid-token")
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.message).toBe("No se encontró el usuario")
  })

  it("should return 400 if user is already active", async () => {
    const { GET } = await import("./route")

    mockFindVerificationTokenRecord.mockResolvedValue({
      token: "valid-token",
      identifier: "test@example.com",
      type: "EMAIL_VERIFICATION",
      expires: new Date(Date.now() + 86400000),
    })
    mockDb.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      isActive: true,
    })

    const req = new NextRequest("http://localhost:3000/api/auth/verify-email?token=valid-token")
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.message).toBe("La cuenta ya está activa")
  })

  it("should activate user and delete token on success", async () => {
    const { GET } = await import("./route")

    mockFindVerificationTokenRecord.mockResolvedValue({
      token: "valid-token",
      identifier: "test@example.com",
      type: "EMAIL_VERIFICATION",
      expires: new Date(Date.now() + 86400000),
    })
    mockDb.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      isActive: false,
    })
    mockDb.user.update.mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      isActive: true,
    })
    mockDeleteVerificationTokenRecord.mockResolvedValue(true)

    const req = new NextRequest("http://localhost:3000/api/auth/verify-email?token=valid-token")
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toBe("Cuenta activada correctamente")
    expect(mockDb.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { isActive: true, emailVerifiedAt: expect.any(Date) },
    })
    expect(mockDeleteVerificationTokenRecord).toHaveBeenCalledWith("valid-token")
  })
})
