import { beforeEach, describe, expect, it, vi } from "vitest"

const transactionClient = {
  user: { update: vi.fn() },
  verificationToken: { deleteMany: vi.fn() },
  auditLog: { create: vi.fn() },
}
const mockDb = {
  user: { findUnique: vi.fn() },
  auditLog: { create: vi.fn() },
  $transaction: vi.fn(),
}
const mockAuth = vi.fn()
const mockHash = vi.fn()
const mockSendPasswordResetEmail = vi.fn()

vi.mock("@/lib/db", () => ({ db: mockDb }))
vi.mock("@/lib/auth", () => ({ auth: mockAuth }))
vi.mock("@/lib/password-reset", () => ({ sendPasswordResetEmail: mockSendPasswordResetEmail }))
vi.mock("bcryptjs", () => ({ hash: mockHash }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

const customer = {
  id: "customer-id",
  email: "customer@example.com",
  role: "CUSTOMER",
  isActive: true,
  status: "ACTIVE",
  passwordHash: "old-hash",
}

describe("admin password actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ user: { id: "admin-id", role: "ADMIN" } })
    mockDb.$transaction.mockImplementation(async (operation) => operation(transactionClient))
    mockSendPasswordResetEmail.mockResolvedValue({ success: true })
    mockHash.mockResolvedValue("new-hash")
  })

  it("sends the recovery email and writes an audit event", async () => {
    const { sendUserPasswordReset } = await import("./actions")
    mockDb.user.findUnique.mockResolvedValue(customer)

    const result = await sendUserPasswordReset(customer.id)

    expect(result).toEqual({ success: true })
    expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(customer.email)
    expect(mockDb.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entity: "USER",
        entityId: customer.id,
        action: "ADMIN_PASSWORD_RESET_EMAIL",
        userId: "admin-id",
        data: { delivery: "email" },
      }),
    })
  })

  it("stores only a hash, revokes pending reset links, and writes an audit event", async () => {
    const { setUserPasswordByAdmin } = await import("./actions")
    mockDb.user.findUnique.mockResolvedValue(customer)

    const result = await setUserPasswordByAdmin(customer.id, "new-password")

    expect(result).toEqual({ success: true })
    expect(mockHash).toHaveBeenCalledWith("new-password", 12)
    expect(transactionClient.user.update).toHaveBeenCalledWith({
      where: { id: customer.id },
      data: { passwordHash: "new-hash" },
    })
    expect(transactionClient.verificationToken.deleteMany).toHaveBeenCalledWith({
      where: { identifier: customer.email, type: "PASSWORD_RESET" },
    })
    expect(transactionClient.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "ADMIN_PASSWORD_SET", data: { delivery: "manual" } }),
    })
  })

  it("does not allow an admin to manage another admin's password", async () => {
    const { sendUserPasswordReset } = await import("./actions")
    mockDb.user.findUnique.mockResolvedValue({ ...customer, role: "ADMIN" })

    const result = await sendUserPasswordReset(customer.id)

    expect(result).toEqual({ error: "No tenés permisos para gestionar la contraseña de este usuario" })
    expect(mockSendPasswordResetEmail).not.toHaveBeenCalled()
    expect(mockDb.auditLog.create).not.toHaveBeenCalled()
  })
})
