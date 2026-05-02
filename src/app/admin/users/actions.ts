"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
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

export async function toggleUserAdminRole(userId: string) {
  const session = await requireAdminSession()

  if (session.user.id === userId) {
    throw new Error("No podés cambiar tu propio rol")
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true },
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
      isActive: !shouldBlock,
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
    select: { role: true },
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
      isActive: !shouldBlock,
    },
  })

  revalidateUserAdminPaths(userId)
}
