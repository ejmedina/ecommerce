"use server"

import { db } from "@/lib/db"
import { slugify } from "@/lib/utils"
import { revalidatePath } from "next/cache"
import { Prisma } from "@prisma/client"

interface ParsedProductOption {
  name: string
  values: string[]
}

interface ParsedProductVariant {
  id?: string
  sku: string | null
  price: string | number | null
  comparePrice: string | number | null
  stock: string | number
  options: Record<string, string>
  title: string | null
  isActive?: boolean
}

interface ParsedComboComponent {
  id?: string
  productId: string
  quantity: number
  position: number
}

function parseNumericValue(value: string | number | null | undefined, fallback: number) {
  return value ? Number(value) : fallback
}

function normalizeVariantSku(value: string | null | undefined) {
  if (typeof value !== "string") return null
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function normalizeParsedVariants(
  variants: ParsedProductVariant[],
  fallbackPrice: number
) {
  return variants.map((variant) => ({
    ...variant,
    sku: normalizeVariantSku(variant.sku),
    price: parseNumericValue(variant.price, fallbackPrice),
    comparePrice: variant.comparePrice ? Number(variant.comparePrice) : null,
    stock: parseNumericValue(variant.stock, 0),
    isActive: variant.isActive ?? true,
  }))
}

function findDuplicateVariantSkus(variants: Array<{ sku: string | null }>) {
  const seen = new Set<string>()
  const duplicates = new Set<string>()

  for (const variant of variants) {
    if (!variant.sku) continue

    const skuKey = variant.sku.toUpperCase()
    if (seen.has(skuKey)) {
      duplicates.add(variant.sku)
      continue
    }

    seen.add(skuKey)
  }

  return [...duplicates]
}

function generateVariantCombinations(
  options: ParsedProductOption[],
  baseSku: string | null,
  basePrice: number,
  baseComparePrice: number | null
) {
  if (options.length === 0) {
    return []
  }

  const combinations: Record<string, string>[] = []

  const walk = (index: number, current: Record<string, string>) => {
    if (index === options.length) {
      combinations.push({ ...current })
      return
    }

    const option = options[index]
    const cleanValues = option.values.map((value) => value.trim()).filter(Boolean)

    if (cleanValues.length === 0) {
      return
    }

    for (const value of cleanValues) {
      current[option.name] = value
      walk(index + 1, current)
    }
  }

  walk(0, {})

  return combinations.map((combination) => {
    const title = Object.values(combination).join(" / ")
    return {
      sku: baseSku ? `${baseSku}-${title.replace(/\s+/g, "-").toUpperCase()}` : null,
      price: basePrice,
      comparePrice: baseComparePrice,
      stock: 0,
      options: combination,
      title,
      isActive: true,
    }
  })
}

function parseComboComponents(
  value: FormDataEntryValue | null
): ParsedComboComponent[] {
  if (typeof value !== "string" || !value.trim()) {
    return []
  }

  const parsed = JSON.parse(value) as ParsedComboComponent[]
  return parsed
    .map((component, index) => ({
      id: component.id,
      productId: component.productId,
      quantity: Math.max(1, Number(component.quantity) || 1),
      position: Number.isFinite(component.position) ? Number(component.position) : index,
    }))
    .filter((component) => Boolean(component.productId))
}

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
    const discountType = formData.get("discountType") as string || "NONE"
    const discountConfigJson = formData.get("discountConfig") as string | null
    const discountConfig = discountConfigJson ? JSON.parse(discountConfigJson) : null
    
    // VARIANTES
    const hasVariants = formData.get("hasVariants") === "1"
    const isCombo = formData.get("isCombo") === "1"
    const optionsJson = formData.get("options") as string // JSON string
    const variantsJson = formData.get("variants") as string // JSON string
    const comboComponents = parseComboComponents(formData.get("comboComponents"))

    const slug = slugify(name)

    // Check if slug exists
    const existing = await db.product.findUnique({ where: { slug } })
    const finalSlug = existing ? `${slug}-${Date.now()}` : slug

    if (isCombo && hasVariants) {
      return { error: "Un combo no puede tener variantes propias." }
    }

    if (isCombo && comboComponents.length === 0) {
      return { error: "Agregá al menos un producto al combo." }
    }

    const parsedOptions = hasVariants && optionsJson
      ? (JSON.parse(optionsJson) as ParsedProductOption[])
      : []
    const parsedVariants = hasVariants && variantsJson
      ? (JSON.parse(variantsJson) as ParsedProductVariant[])
      : []
    const normalizedVariants = hasVariants
      ? normalizeParsedVariants(
          parsedVariants.length > 0
            ? parsedVariants
            : generateVariantCombinations(parsedOptions, sku, price, comparePrice),
          price
        )
      : []

    if (hasVariants && parsedOptions.length > 0 && normalizedVariants.length === 0) {
      return { error: "Configurá al menos una variante válida antes de guardar el producto." }
    }

    const duplicateVariantSkus = findDuplicateVariantSkus(normalizedVariants)
    if (duplicateVariantSkus.length > 0) {
      return {
        error: `Hay SKUs repetidos entre las variantes: ${duplicateVariantSkus.join(", ")}.`,
      }
    }

    if (isCombo) {
      const nestedCombo = await db.product.findFirst({
        where: {
          id: { in: comboComponents.map((component) => component.productId) },
          isCombo: true,
        },
        select: { id: true },
      })

      if (nestedCombo) {
        return { error: "Los combos no pueden incluir otros combos." }
      }
    }

    const product = await db.$transaction(async (tx) => {
      const createdProduct = await tx.product.create({
        data: {
          name,
          slug: finalSlug,
          sku: hasVariants ? null : sku, // Reset product SKU if it has variants
          stock: hasVariants || isCombo ? 0 : stock, // Product stock is sum of variants or 0
          price,
          comparePrice,
          description,
          categoryId,
          metaTitle,
          metaDescription,
          isActive,
          isFeatured,
          hasPermanentStock: isCombo ? false : hasPermanentStock,
          hasVariants,
          isCombo,
          discountType,
          discountConfig,
          publishedAt: isActive ? new Date() : null,
          ...(imageUrl && {
            images: {
              create: { url: imageUrl, alt: imageAlt },
            },
          }),
          ...(hasVariants && parsedOptions.length > 0 && {
            options: {
              create: parsedOptions.map((opt, index) => ({
                name: opt.name,
                values: opt.values,
                position: index,
              })),
            },
          }),
          ...(isCombo && comboComponents.length > 0 && {
            comboComponents: {
              create: comboComponents.map((component, index) => ({
                productId: component.productId,
                quantity: component.quantity,
                position: index,
              })),
            },
          }),
        },
      })

      if (hasVariants && normalizedVariants.length > 0) {
        await tx.productVariant.createMany({
          data: normalizedVariants.map((variant) => ({
            productId: createdProduct.id,
            sku: variant.sku,
            price: variant.price,
            comparePrice: variant.comparePrice,
            stock: variant.stock,
            options: variant.options,
            title: variant.title,
            isActive: variant.isActive,
          })),
        })
      }

      return createdProduct
    })

    revalidatePath("/admin/products")
    revalidatePath("/")
    revalidatePath("/products")

    return { success: true, productId: product.id }
  } catch (error) {
    console.error("Create product error:", error)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      if (Array.isArray(error.meta?.target) && error.meta.target.includes("sku")) {
        return { error: "Ya existe una variante con ese SKU. Revisá que no haya SKUs duplicados." }
      }
    }
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
    const discountType = formData.get("discountType") as string || "NONE"
    const discountConfigJson = formData.get("discountConfig") as string | null
    const discountConfig = discountConfigJson ? JSON.parse(discountConfigJson) : null

    // VARIANTES
    const hasVariants = formData.get("hasVariants") === "1"
    const isCombo = formData.get("isCombo") === "1"
    const optionsJson = formData.get("options") as string
    const variantsJson = formData.get("variants") as string
    const comboComponents = parseComboComponents(formData.get("comboComponents"))

    if (isCombo && hasVariants) {
      return { error: "Un combo no puede tener variantes propias." }
    }

    if (isCombo && comboComponents.length === 0) {
      return { error: "Agregá al menos un producto al combo." }
    }

    const parsedOptions = hasVariants && optionsJson
      ? (JSON.parse(optionsJson) as ParsedProductOption[])
      : []
    const parsedVariants = hasVariants && variantsJson
      ? (JSON.parse(variantsJson) as ParsedProductVariant[])
      : []
    const normalizedVariants = hasVariants
      ? normalizeParsedVariants(
          parsedVariants.length > 0
            ? parsedVariants
            : generateVariantCombinations(parsedOptions, sku, price, comparePrice),
          price
        )
      : []

    if (hasVariants && parsedOptions.length > 0 && normalizedVariants.length === 0) {
      return { error: "Configurá al menos una variante válida antes de guardar el producto." }
    }

    const duplicateVariantSkus = findDuplicateVariantSkus(normalizedVariants)
    if (duplicateVariantSkus.length > 0) {
      return {
        error: `Hay SKUs repetidos entre las variantes: ${duplicateVariantSkus.join(", ")}.`,
      }
    }

    if (isCombo && comboComponents.some((component) => component.productId === id)) {
      return { error: "Un combo no puede incluirse a sí mismo." }
    }

    if (isCombo) {
      const nestedCombo = await db.product.findFirst({
        where: {
          id: { in: comboComponents.map((component) => component.productId) },
          isCombo: true,
        },
        select: { id: true },
      })

      if (nestedCombo) {
        return { error: "Los combos no pueden incluir otros combos." }
      }
    }

    const product = await db.product.update({
      where: { id },
      data: {
        name,
        sku: hasVariants ? null : sku,
        stock: hasVariants || isCombo ? 0 : stock,
        price,
        comparePrice,
        description,
        categoryId,
        metaTitle,
        metaDescription,
        isActive,
        isFeatured,
        hasPermanentStock: isCombo ? false : hasPermanentStock,
        hasVariants,
        isCombo,
        discountType,
        discountConfig,
        publishedAt: isActive ? new Date() : null,
      },
    })

    // Sincronizar Opciones (Borrar y Volver a crear es más simple para este caso)
    if (hasVariants && parsedOptions.length > 0) {
      await db.productOption.deleteMany({ where: { productId: id } })
      await db.productOption.createMany({
        data: parsedOptions.map((opt, index) => ({
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
      const newVariantIds = normalizedVariants.flatMap((v) => v.id ? [v.id] : [])
      
      // Borramos las que ya no están
      await db.productVariant.deleteMany({
        where: {
          productId: id,
          id: { notIn: newVariantIds }
        }
      })

      // Actualizamos o creamos
      for (const v of normalizedVariants) {
        if (v.id) {
          await db.productVariant.update({
            where: { id: v.id },
            data: {
              sku: v.sku,
              price: v.price,
              comparePrice: v.comparePrice,
              stock: v.stock,
              options: v.options,
              title: v.title,
              isActive: v.isActive,
            }
          })
        } else {
          await db.productVariant.create({
            data: {
              productId: id,
              sku: v.sku,
              price: v.price,
              comparePrice: v.comparePrice,
              stock: v.stock,
              options: v.options,
              title: v.title,
              isActive: v.isActive,
            }
          })
        }
      }
    } else {
      await db.productVariant.deleteMany({ where: { productId: id } })
    }

    if (isCombo) {
      await db.comboComponent.deleteMany({ where: { comboProductId: id } })
      await db.comboComponent.createMany({
        data: comboComponents.map((component, index) => ({
          comboProductId: id,
          productId: component.productId,
          quantity: component.quantity,
          position: index,
        })),
      })
    } else {
      await db.comboComponent.deleteMany({ where: { comboProductId: id } })
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
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      if (Array.isArray(error.meta?.target) && error.meta.target.includes("sku")) {
        return { error: "Ya existe una variante con ese SKU. Revisá que no haya SKUs duplicados." }
      }
    }
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : error
    const code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined

    console.error("[DELETE_PRODUCT_ERROR]", {
      productId: id,
      error: message,
      code
    })
    
    if (code === 'P2003') {
      return { error: "No se puede eliminar: el producto está siendo referenciado por otros registros (carritos u órdenes)." }
    }
    
    return { error: "Error inesperado al eliminar el producto. Revisa los logs del servidor." }
  }
}
