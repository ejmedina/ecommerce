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
    const metaTitle = formData.get("metaTitle") as string || null
    const metaDescription = formData.get("metaDescription") as string || null
    const imageUrl = formData.get("imageUrl") as string || null
    const imageAlt = formData.get("imageAlt") as string || null
    const isActive = formData.get("isActive") === "1"
    const isFeatured = formData.get("isFeatured") === "1"
    const hasPermanentStock = formData.get("hasPermanentStock") === "1"
    
    // VARIANTES
    const hasVariants = formData.get("hasVariants") === "1"
    const optionsJson = formData.get("options") as string // JSON string
    const variantsJson = formData.get("variants") as string // JSON string

    const slug = slugify(name)

    // Check if slug exists
    const existing = await db.product.findUnique({ where: { slug } })
    const finalSlug = existing ? `${slug}-${Date.now()}` : slug

    const product = await db.product.create({
      data: {
        name,
        slug: finalSlug,
        sku: hasVariants ? null : sku, // Reset product SKU if it has variants
        stock: hasVariants ? 0 : stock, // Product stock is sum of variants or 0
        price,
        comparePrice,
        description,
        categoryId,
        metaTitle,
        metaDescription,
        isActive,
        isFeatured,
        hasPermanentStock,
        hasVariants,
        publishedAt: isActive ? new Date() : null,
        ...(imageUrl && {
          images: {
            create: { url: imageUrl, alt: imageAlt },
          },
        }),
        // Create options if provided
        ...(hasVariants && optionsJson && {
          options: {
            create: JSON.parse(optionsJson).map((opt: any, index: number) => ({
              name: opt.name,
              values: opt.values,
              position: index,
            })),
          },
        }),
      },
    })

    // Create variants if provided
    if (hasVariants && variantsJson) {
      const variantsData = JSON.parse(variantsJson)
      await db.productVariant.createMany({
        data: variantsData.map((v: any) => ({
          productId: product.id,
          sku: v.sku,
          price: v.price ? parseFloat(v.price) : price,
          comparePrice: v.comparePrice ? parseFloat(v.comparePrice) : null,
          stock: parseInt(v.stock) || 0,
          options: v.options,
          title: v.title,
          isActive: v.isActive ?? true,
        })),
      })
    }

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
    const metaTitle = formData.get("metaTitle") as string || null
    const metaDescription = formData.get("metaDescription") as string || null
    const imageUrl = formData.get("imageUrl") as string || null
    const imageAlt = formData.get("imageAlt") as string || null
    const isActive = formData.get("isActive") === "1"
    const isFeatured = formData.get("isFeatured") === "1"
    const hasPermanentStock = formData.get("hasPermanentStock") === "1"

    // VARIANTES
    const hasVariants = formData.get("hasVariants") === "1"
    const optionsJson = formData.get("options") as string
    const variantsJson = formData.get("variants") as string

    const product = await db.product.update({
      where: { id },
      data: {
        name,
        sku: hasVariants ? null : sku,
        stock: hasVariants ? 0 : stock,
        price,
        comparePrice,
        description,
        categoryId,
        metaTitle,
        metaDescription,
        isActive,
        isFeatured,
        hasPermanentStock,
        hasVariants,
        publishedAt: isActive ? new Date() : null,
      },
    })

    // Sincronizar Opciones (Borrar y Volver a crear es más simple para este caso)
    if (hasVariants && optionsJson) {
      await db.productOption.deleteMany({ where: { productId: id } })
      const optionsData = JSON.parse(optionsJson)
      await db.productOption.createMany({
        data: optionsData.map((opt: any, index: number) => ({
          productId: id,
          name: opt.name,
          values: opt.values,
          position: index,
        })),
      })
    } else {
      await db.productOption.deleteMany({ where: { productId: id } })
    }

    // Sincronizar Variantes
    if (hasVariants && variantsJson) {
      const variantsData = JSON.parse(variantsJson)
      
      // Obtenemos variantes actuales para saber qué borrar
      const currentVariants = await db.productVariant.findMany({ where: { productId: id } })
      const newVariantIds = variantsData.map((v: any) => v.id).filter(Boolean)
      
      // Borramos las que ya no están
      await db.productVariant.deleteMany({
        where: {
          productId: id,
          id: { notIn: newVariantIds }
        }
      })

      // Actualizamos o creamos
      for (const v of variantsData) {
        if (v.id) {
          await db.productVariant.update({
            where: { id: v.id },
            data: {
              sku: v.sku,
              price: v.price ? parseFloat(v.price) : price,
              comparePrice: v.comparePrice ? parseFloat(v.comparePrice) : null,
              stock: parseInt(v.stock) || 0,
              options: v.options,
              title: v.title,
              isActive: v.isActive ?? true,
            }
          })
        } else {
          await db.productVariant.create({
            data: {
              productId: id,
              sku: v.sku,
              price: v.price ? parseFloat(v.price) : price,
              comparePrice: v.comparePrice ? parseFloat(v.comparePrice) : null,
              stock: parseInt(v.stock) || 0,
              options: v.options,
              title: v.title,
              isActive: v.isActive ?? true,
            }
          })
        }
      }
    } else {
      await db.productVariant.deleteMany({ where: { productId: id } })
    }

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
    // Check if product exists and if it has relations that would prevent deletion
    const product = await db.product.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            orderItems: true,
            cartItems: true
          }
        }
      }
    })

    if (!product) {
      console.error(`[DELETE_PRODUCT] Product with ID ${id} not found.`)
      return { error: "El producto no existe." }
    }

    if (product._count.orderItems > 0) {
      console.warn(`[DELETE_PRODUCT] Cannot delete product ${id} (${product.name}) because it has ${product._count.orderItems} orders associated.`)
      return { error: "No se puede eliminar el producto porque tiene pedidos asociados. Mejor márcalo como inactivo." }
    }

    await db.product.delete({ where: { id } })
    
    revalidatePath("/admin/products")
    revalidatePath("/")
    revalidatePath("/products")
    
    return { success: true }
  } catch (error: any) {
    console.error("[DELETE_PRODUCT_ERROR]", {
      productId: id,
      error: error?.message || error,
      code: error?.code
    })
    
    if (error?.code === 'P2003') {
      return { error: "No se puede eliminar: el producto está siendo referenciado por otros registros (carritos u órdenes)." }
    }
    
    return { error: "Error inesperado al eliminar el producto. Revisa los logs del servidor." }
  }
}
