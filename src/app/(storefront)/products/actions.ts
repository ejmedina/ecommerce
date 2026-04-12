"use server"

import { db } from "@/lib/db"

export async function getProductsAction({ 
  category, 
  s, 
  page = 1, 
  limit = 12 
}: { 
  category?: string
  s?: string
  page?: number
  limit?: number
}) {
  const skip = (page - 1) * limit
  const where: any = { isActive: true }

  if (category) {
    where.category = { slug: category }
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
      { hasPermanentStock: true }
    ]
  }

  const products = await db.product.findMany({
    where,
    include: {
      images: { take: 1, orderBy: { order: "asc" } },
      category: true,
    },
    orderBy: { createdAt: "desc" },
    skip,
    take: limit,
  })

  // Total count for identifying if there's more
  const total = await db.product.count({ where })

  // Sort out of stock items at the end if searching
  let sortedProducts = products
  if (s) {
    sortedProducts = [...products].sort((a, b) => {
      const aInStock = a.stock > 0 || a.hasPermanentStock
      const bInStock = b.stock > 0 || b.hasPermanentStock
      if (aInStock && !bInStock) return -1
      if (!aInStock && bInStock) return 1
      return 0
    })
  }

  return {
    products: sortedProducts.map(p => ({
      ...p,
      price: p.price.toString(),
      comparePrice: p.comparePrice?.toString() || null,
    })),
    hasMore: skip + limit < total,
    total
  }
}
