"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

async function requireAdminSession() {
  const session = await auth()

  if (!session?.user || !["SUPERADMIN", "OWNER", "ADMIN"].includes(session.user.role)) {
    throw new Error("No autorizado")
  }

  return session
}

export async function promoteCustomerToAdmin(userId: string) {
  await requireAdminSession()

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })

  if (!user || user.role !== "CUSTOMER") {
    throw new Error("Usuario inválido")
  }

  await db.user.update({
    where: { id: userId },
    data: {
      role: "ADMIN",
      status: "ACTIVE",
      isActive: true,
    },
  })

  revalidatePath("/admin/customers")
}

export async function setCustomerBlockedState(userId: string, shouldBlock: boolean) {
  await requireAdminSession()

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })

  if (!user || user.role !== "CUSTOMER") {
    throw new Error("Usuario inválido")
  }

  await db.user.update({
    where: { id: userId },
    data: {
      status: shouldBlock ? "BLOCKED" : "ACTIVE",
      isActive: !shouldBlock,
    },
  })

  revalidatePath("/admin/customers")
}
