import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const transactionClient = {
  verificationToken: {
    findUnique: vi.fn(),
    delete: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}
const mockDb = {
  $transaction: vi.fn(),
}
const mockFindVerificationTokenRecord = vi.fn()
const mockHashVerificationToken = vi.fn()
const mockHash = vi.fn()

vi.mock("@/lib/db", () => ({ db: mockDb }))
vi.mock("@/lib/verification-tokens", () => ({
  findVerificationTokenRecord: mockFindVerificationTokenRecord,
  hashVerificationToken: mockHashVerificationToken,
}))
vi.mock("bcryptjs", () => ({ hash: mockHash }))

const validToken = {
  id: "token-id",
  token: "token-hash",
  identifier: "customer@example.com",
  type: "PASSWORD_RESET",
  expires: new Date(Date.now() + 60_000),
}

describe("/api/auth/reset-password", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHash.mockResolvedValue("new-password-hash")
    mockHashVerificationToken.mockReturnValue("token-hash")
    mockDb.$transaction.mockImplementation(async (operation) => operation(transactionClient))
  })

  it("rejects expired reset links during validation", async () => {
    const { GET } = await import("./route")
    mockFindVerificationTokenRecord.mockResolvedValue({ ...validToken, expires: new Date("2020-01-01") })

    const response = await GET(new NextRequest("http://localhost:3000/api/auth/reset-password?token=raw-token"))

    expect(response.status).toBe(400)
    expect(mockDb.$transaction).not.toHaveBeenCalled()
  })

  it("changes the password and consumes the token atomically", async () => {
    const { POST } = await import("./route")
    mockFindVerificationTokenRecord.mockResolvedValue(validToken)
    transactionClient.verificationToken.findUnique.mockResolvedValue(validToken)
    transactionClient.user.findUnique.mockResolvedValue({ id: "user-id", isActive: true, status: "ACTIVE" })

    const response = await POST(new Request("http://localhost:3000/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token: "raw-token", password: "new-password" }),
    }))

    expect(response.status).toBe(200)
    expect(transactionClient.user.update).toHaveBeenCalledWith({
      where: { id: "user-id" },
      data: { passwordHash: "new-password-hash" },
    })
    expect(transactionClient.verificationToken.delete).toHaveBeenCalledWith({ where: { id: "token-id" } })
  })

  it("does not update the password when the token was already consumed", async () => {
    const { POST } = await import("./route")
    mockFindVerificationTokenRecord.mockResolvedValue(validToken)
    transactionClient.verificationToken.findUnique.mockResolvedValue(null)

    const response = await POST(new Request("http://localhost:3000/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token: "raw-token", password: "new-password" }),
    }))

    expect(response.status).toBe(400)
    expect(transactionClient.user.update).not.toHaveBeenCalled()
    expect(transactionClient.verificationToken.delete).not.toHaveBeenCalled()
  })
})
