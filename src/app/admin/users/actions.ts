"use server"

import { revalidatePath } from "next/cache"
import { hash } from "bcryptjs"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { sendPasswordResetEmail } from "@/lib/password-reset"
import type { UserRole } from "@prisma/client"

async function requireAdminSession() {
  const session = await auth()

  if (!session?.user || !["SUPERADMIN", "OWNER", "ADMIN"].includes(session.user.role)) {
    throw new Error("No autorizado")
  }

  return session
}

function revalidateUserAdminPaths(userId?: string) {
  revalidatePath("/admin/users")
  revalidatePath("/admin/customers")
  if (userId) {
    revalidatePath(`/admin/users/${userId}/edit`)
    revalidatePath(`/admin/users/${userId}/addresses`)
  }
}

function canManageUserPassword(actorRole: UserRole, targetRole: UserRole) {
  if (["SUPERADMIN", "OWNER"].includes(targetRole)) return false
  if (targetRole === "ADMIN") return ["SUPERADMIN", "OWNER"].includes(actorRole)
  return true
}

async function getPasswordManageableUser(userId: string, actorRole: UserRole) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
      status: true,
      passwordHash: true,
    },
  })

  if (!user) throw new Error("Usuario inválido")
  if (!canManageUserPassword(actorRole, user.role)) {
    throw new Error("No tenés permisos para gestionar la contraseña de este usuario")
  }
  if (!user.isActive || user.status === "BLOCKED" || !user.passwordHash) {
    throw new Error("La cuenta debe estar activa para restablecer su contraseña")
  }

  return user
}

export async function sendUserPasswordReset(userId: string) {
  try {
    const session = await requireAdminSession()
    const user = await getPasswordManageableUser(userId, session.user.role)
    const emailResult = await sendPasswordResetEmail(user.email)

    if (!emailResult.success) {
      console.error("Admin password reset email failed", { error: emailResult.error })
      return { error: "No pudimos enviar el email de recuperación. Probá nuevamente." }
    }

    await db.auditLog.create({
      data: {
        entity: "USER",
        entityId: user.id,
        action: "ADMIN_PASSWORD_RESET_EMAIL",
        userId: session.user.id,
        userType: session.user.role,
        data: { delivery: "email" },
      },
    })
    console.info("Admin password reset email sent", { targetRole: user.role })
    revalidateUserAdminPaths(user.id)
    return { success: true }
  } catch (error) {
    console.error("Admin password reset email action failed", { error })
    return { error: error instanceof Error ? error.message : "No pudimos procesar la solicitud." }
  }
}

export async function setUserPasswordByAdmin(userId: string, password: string) {
  try {
    const session = await requireAdminSession()
    if (typeof password !== "string" || password.length < 8) {
      return { error: "La contraseña debe tener al menos 8 caracteres." }
    }

    const user = await getPasswordManageableUser(userId, session.user.role)
    const passwordHash = await hash(password, 12)

    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash },
      })
      await tx.verificationToken.deleteMany({
        where: { identifier: user.email, type: "PASSWORD_RESET" },
      })
      await tx.auditLog.create({
        data: {
          entity: "USER",
          entityId: user.id,
          action: "ADMIN_PASSWORD_SET",
          userId: session.user.id,
          userType: session.user.role,
          data: { delivery: "manual" },
        },
      })
    })

    console.info("Admin password set", { targetRole: user.role })
    revalidateUserAdminPaths(user.id)
    return { success: true }
  } catch (error) {
    console.error("Admin password set action failed", { error })
    return { error: error instanceof Error ? error.message : "No pudimos actualizar la contraseña." }
  }
}

export async function toggleUserAdminRole(userId: string) {
  const session = await requireAdminSession()

  if (session.user.id === userId) {
    throw new Error("No podés cambiar tu propio rol")
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      importedFromWooCommerce: true,
      requiresPasswordSetup: true,
    },
  })

  if (!user) {
    throw new Error("Usuario inválido")
  }

  if (!["CUSTOMER", "ADMIN"].includes(user.role)) {
    throw new Error("Este rol está protegido")
  }

  await db.user.update({
    where: { id: userId },
    data: {
      role: user.role === "ADMIN" ? "CUSTOMER" : "ADMIN",
      status: "ACTIVE",
      isActive: true,
    },
  })

  revalidateUserAdminPaths(userId)
}

export async function setUserBlockedState(userId: string, shouldBlock: boolean) {
  const session = await requireAdminSession()

  if (session.user.id === userId) {
    throw new Error("No podés bloquear tu propio usuario")
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })

  if (!user) {
    throw new Error("Usuario inválido")
  }

  if (user.role === "SUPERADMIN" || user.role === "OWNER") {
    throw new Error("Este usuario está protegido")
  }

  await db.user.update({
    where: { id: userId },
    data: {
      status: shouldBlock ? "BLOCKED" : "ACTIVE",
      isActive:
        shouldBlock
          ? false
          : !(user.importedFromWooCommerce && user.requiresPasswordSetup),
    },
  })

  revalidateUserAdminPaths(userId)
}

export async function updateUserProfile(userId: string, formData: FormData) {
  await requireAdminSession()

  const name = (formData.get("name") as string | null)?.trim() || null
  const email = (formData.get("email") as string | null)?.trim().toLowerCase()
  const phone = (formData.get("phone") as string | null)?.trim() || null
  const role = formData.get("role") as UserRole | null
  const status = formData.get("status") as string | null

  if (!email) {
    throw new Error("El email es obligatorio")
  }

  const existing = await db.user.findFirst({
    where: {
      email,
      NOT: { id: userId },
    },
    select: { id: true },
  })

  if (existing) {
    throw new Error("Ya existe otro usuario con ese email")
  }

  const currentUser = await db.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      importedFromWooCommerce: true,
      requiresPasswordSetup: true,
    },
  })

  if (!currentUser) {
    throw new Error("Usuario inválido")
  }

  const protectedRole = currentUser.role === "SUPERADMIN" || currentUser.role === "OWNER"
  const nextRole = protectedRole ? currentUser.role : role === "ADMIN" ? "ADMIN" : "CUSTOMER"
  const shouldBlock = status === "BLOCKED"

  await db.user.update({
    where: { id: userId },
    data: {
      name,
      email,
      phone,
      role: nextRole,
      status: shouldBlock ? "BLOCKED" : "ACTIVE",
      isActive:
        shouldBlock
          ? false
          : !(currentUser.importedFromWooCommerce && currentUser.requiresPasswordSetup),
    },
  })

  revalidateUserAdminPaths(userId)
}
