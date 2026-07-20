"use server"

import { db } from "@/lib/db"
import type { Prisma } from "@prisma/client"

async function getCategorySlugsIncludingDescendants(slug: string) {
  const categories = await db.category.findMany({
    where: { isActive: true },
    select: {
      id: true,
      slug: true,
      parentId: true,
    },
  })

  const rootCategory = categories.find((category) => category.slug === slug)
  if (!rootCategory) {
    return [slug]
  }

  const slugs = new Set<string>([rootCategory.slug])
  const queue = [rootCategory.id]

  while (queue.length > 0) {
    const currentId = queue.shift()
    if (!currentId) continue

    for (const child of categories) {
      if (child.parentId !== currentId) continue
      if (slugs.has(child.slug)) continue

      slugs.add(child.slug)
      queue.push(child.id)
    }
  }

  return [...slugs]
}

export async function getProductsAction({ 
  category, 
  s, 
  sort = "newest",
  page = 1, 
  limit = 12 
}: { 
  category?: string
  s?: string
  sort?: "newest" | "price_asc" | "price_desc" | "name_asc" | "name_desc"
  page?: number
  limit?: number
}) {
  const skip = (page - 1) * limit
  const where: Prisma.ProductWhereInput = { isActive: true }
  const orderBy =
    sort === "price_asc" ? { price: "asc" as const } :
    sort === "price_desc" ? { price: "desc" as const } :
    sort === "name_asc" ? { name: "asc" as const } :
    sort === "name_desc" ? { name: "desc" as const } :
    { createdAt: "desc" as const }

  if (category) {
    const categorySlugs = await getCategorySlugsIncludingDescendants(category)
    where.category = { slug: { in: categorySlugs } }
  }
  
  if (s) {
    where.OR = [
      { name: { contains: s, mode: "insensitive" } },
      { description: { contains: s, mode: "insensitive" } },
    ]
  }

  // Base conditions for browsing (strictly hide out of stock)
  // EXCEPT when searching, where we show all but sort them.
  // To keep it simple for the infinite scroll, we'll apply the stock filter if not searching.
  if (!s) {
    where.OR = [
      { stock: { gt: 0 } },
      { hasPermanentStock: true },
      { hasVariants: true },
      { isCombo: true },
    ]
  }

  const products = await db.product.findMany({
    where,
    include: {
      images: { take: 1, orderBy: { order: "asc" } },
      category: true,
      variants: {
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          title: true,
          sku: true,
          stock: true,
          price: true,
        },
      },
      comboComponents: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              hasVariants: true,
              stock: true,
              hasPermanentStock: true,
              variants: {
                where: { isActive: true },
                orderBy: { createdAt: "asc" },
                select: {
                  id: true,
                  title: true,
                  sku: true,
                  stock: true,
                  price: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy,
    skip,
    take: limit,
  })

  // Total count for identifying if there's more
  const total = await db.product.count({ where })

  // Always show products with photos first, then products without photos.
  // When searching, also deprioritize out-of-stock items (within each photo group).
  const sortedProducts = [...products].sort((a, b) => {
    const aHasPhoto = a.images.length > 0
    const bHasPhoto = b.images.length > 0

    // Primary: products with photos come first
    if (aHasPhoto && !bHasPhoto) return -1
    if (!aHasPhoto && bHasPhoto) return 1

    // Secondary (only when searching): in-stock before out-of-stock
    if (s) {
      const aInStock = a.stock > 0 || a.hasPermanentStock
      const bInStock = b.stock > 0 || b.hasPermanentStock
      if (aInStock && !bInStock) return -1
      if (!aInStock && bInStock) return 1
    }

    return 0
  })

  return {
    products: sortedProducts.map(p => ({
      ...p,
      isCombo: p.isCombo,
      comboRequiresConfiguration: p.isCombo
        ? p.comboComponents.some((component) => component.product.hasVariants)
        : false,
      comboComponents: p.comboComponents.map((component) => ({
        id: component.id,
        quantity: component.quantity,
        product: {
          ...component.product,
          variants: component.product.variants.map((variant) => ({
            ...variant,
            price: variant.price?.toString() || null,
          })),
        },
      })),
      variants: p.variants.map((variant) => ({
        ...variant,
        price: variant.price?.toString() || null,
      })),
      price: p.price.toString(),
      comparePrice: p.comparePrice?.toString() || null,
    })),
    hasMore: skip + limit < total,
    total
  }
}
