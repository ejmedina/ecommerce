"use server"

import { db } from "@/lib/db"
import { slugify } from "@/lib/utils"
import { revalidatePath } from "next/cache"

export async function createProduct(formData: FormData) {
  try {
    const name = formData.get("name") as string
    const sku = formData.get("sku") as string || null
    const stock = parseInt(formData.get("stock") as string) || 0
    const price = parseFloat(formData.get("price") as string) || 0
    const comparePrice = formData.get("comparePrice") ? parseFloat(formData.get("comparePrice") as string) : null
    const description = formData.get("description") as string || null
    const categoryId = formData.get("categoryId") as string || null
    const brandId = formData.get("brandId") as string || null
    const metaTitle = formData.get("metaTitle") as string || null
    const metaDescription = formData.get("metaDescription") as string || null
    const imageUrl = formData.get("imageUrl") as string || null
    const imageAlt = formData.get("imageAlt") as string || null
    const isActive = formData.get("isActive") === "1"
    const isFeatured = formData.get("isFeatured") === "1"
    const hasPermanentStock = formData.get("hasPermanentStock") === "1"

    const slug = slugify(name)

    // Check if slug exists
    const existing = await db.product.findUnique({ where: { slug } })
    const finalSlug = existing ? `${slug}-${Date.now()}` : slug

    const product = await db.product.create({
      data: {
        name,
        slug: finalSlug,
        sku,
        stock,
        price,
        comparePrice,
        description,
        categoryId,
        brandId,
        metaTitle,
        metaDescription,
        isActive,
        isFeatured,
        hasPermanentStock,
        publishedAt: isActive ? new Date() : null,
        ...(imageUrl && {
          images: {
            create: { url: imageUrl, alt: imageAlt },
          },
        }),
      },
    })

    revalidatePath("/admin/products")
    revalidatePath("/")
    revalidatePath("/products")

    return { success: true, productId: product.id }
  } catch (error) {
    console.error("Create product error:", error)
    return { error: "Error al crear el producto" }
  }
}

export async function updateProduct(formData: FormData) {
  try {
    const id = formData.get("id") as string
    const name = formData.get("name") as string
    const sku = formData.get("sku") as string || null
    const stock = parseInt(formData.get("stock") as string) || 0
    const price = parseFloat(formData.get("price") as string) || 0
    const comparePrice = formData.get("comparePrice") ? parseFloat(formData.get("comparePrice") as string) : null
    const description = formData.get("description") as string || null
    const categoryId = formData.get("categoryId") as string || null
    const brandId = formData.get("brandId") as string || null
    const metaTitle = formData.get("metaTitle") as string || null
    const metaDescription = formData.get("metaDescription") as string || null
    const imageUrl = formData.get("imageUrl") as string || null
    const imageAlt = formData.get("imageAlt") as string || null
    const isActive = formData.get("isActive") === "1"
    const isFeatured = formData.get("isFeatured") === "1"
    const hasPermanentStock = formData.get("hasPermanentStock") === "1"

    const product = await db.product.update({
      where: { id },
      data: {
        name,
        sku,
        stock,
        price,
        comparePrice,
        description,
        categoryId,
        brandId,
        metaTitle,
        metaDescription,
        isActive,
        isFeatured,
        hasPermanentStock,
        publishedAt: isActive ? new Date() : null,
      },
    })

    // Update image if provided
    if (imageUrl) {
      await db.productImage.deleteMany({ where: { productId: id } })
      await db.productImage.create({
        data: { productId: id, url: imageUrl, alt: imageAlt, order: 0 },
      })
    }

    revalidatePath("/admin/products")
    revalidatePath("/")
    revalidatePath("/products")
    revalidatePath(`/products/${product.slug}`)

    return { success: true }
  } catch (error) {
    console.error("Update product error:", error)
    return { error: "Error al actualizar el producto" }
  }
}

export async function deleteProduct(id: string) {
  try {
    await db.product.delete({ where: { id } })
    revalidatePath("/admin/products")
    revalidatePath("/")
    revalidatePath("/products")
    return { success: true }
  } catch (error) {
    console.error("Delete product error:", error)
    return { error: "Error al eliminar el producto" }
  }
}
