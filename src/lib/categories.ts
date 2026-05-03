import { db } from "./db"
import type { Category } from "@prisma/client"

type StorefrontCategory = Category & {
  _count: {
    products: number
  }
}

/**
 * Obtiene las categorías visibles para el storefront (público).
 * Filtra categorías inactivas y aquellas que no tienen productos con stock 
 * (ni ellas ni sus descendientes).
 */
export async function getStorefrontCategories() {
  // Obtenemos todas las categorías activas con el conteo de sus productos con stock
  let allCategories: StorefrontCategory[]

  try {
    allCategories = await db.category.findMany({
      where: { 
        isActive: true 
      },
      include: {
        _count: {
          select: {
            products: {
              where: {
                isActive: true,
                OR: [
                  { stock: { gt: 0 } },
                  { hasPermanentStock: true }
                ]
              }
            }
          }
        }
      },
      orderBy: { order: "asc" }
    })
  } catch (error) {
    console.error("Failed to load storefront categories:", error)
    return []
  }

  // Función recursiva para determinar si una categoría o sus hijas tienen productos
  const hasVisibleProducts = (categoryId: string): boolean => {
    const category = allCategories.find(c => c.id === categoryId)
    if (!category) return false

    // Si tiene productos directos con stock, es visible
    if (category._count.products > 0) return true

    // Si no, revisamos si alguna de sus hijas tiene productos
    const children = allCategories.filter(c => c.parentId === categoryId)
    return children.some(child => hasVisibleProducts(child.id))
  }

  // Filtramos las categorías raíz que tengan productos o descendientes con productos
  const visibleRootCategories = allCategories
    .filter(c => c.parentId === null && hasVisibleProducts(c.id))
    .map(category => {
      // Para cada raíz visible, filtramos sus hijas visibles
      const visibleChildren = allCategories.filter(
        child => child.parentId === category.id && hasVisibleProducts(child.id)
      )
      
      return {
        ...category,
        children: visibleChildren
      }
    })

  return visibleRootCategories
}
