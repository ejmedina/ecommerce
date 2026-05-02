"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

async function requireAdminSession() {
  const session = await auth()

  if (!session?.user || !["SUPERADMIN", "OWNER", "ADMIN"].includes(session.user.role)) {
    throw new Error("No autorizado")
  }
}

function parsePrice(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  const normalized = trimmed.includes(",")
    ? trimmed.replace(/\./g, "").replace(",", ".")
    : trimmed
  if (!normalized) return null

  const parsed = Number.parseFloat(normalized)
  if (!Number.isFinite(parsed) || parsed < 0) return null

  return Math.round(parsed * 100) / 100
}

export async function updateProductPrice(formData: FormData) {
  await requireAdminSession()

  const productId = formData.get("productId") as string
  const price = parsePrice(formData.get("price"))
  const comparePrice = parsePrice(formData.get("comparePrice"))

  if (!productId || price === null) {
    throw new Error("Precio inválido")
  }

  const product = await db.product.update({
    where: { id: productId },
    data: {
      price,
      comparePrice,
    },
    select: { slug: true },
  })

  revalidatePath("/admin/products")
  revalidatePath("/admin/products/prices")
  revalidatePath("/products")
  revalidatePath(`/products/${product.slug}`)
}

export async function updateVariantPrice(formData: FormData) {
  await requireAdminSession()

  const variantId = formData.get("variantId") as string
  const price = parsePrice(formData.get("price"))
  const comparePrice = parsePrice(formData.get("comparePrice"))

  if (!variantId || price === null) {
    throw new Error("Precio inválido")
  }

  const variant = await db.productVariant.update({
    where: { id: variantId },
    data: {
      price,
      comparePrice,
    },
    select: {
      product: { select: { slug: true } },
    },
  })

  revalidatePath("/admin/products")
  revalidatePath("/admin/products/prices")
  revalidatePath("/products")
  revalidatePath(`/products/${variant.product.slug}`)
}
