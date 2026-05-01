import { db } from "@/lib/db"
import { calculateCartPricing } from "@/lib/pricing"

export async function getCartState(userId?: string, sessionId?: string) {
  let cart

  if (userId) {
    cart = await db.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: { take: 1, orderBy: { order: "asc" } },
              },
            },
            variant: true,
          },
        },
      },
    })
  } else if (sessionId) {
    cart = await db.cart.findUnique({
      where: { sessionId },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: { take: 1, orderBy: { order: "asc" } },
              },
            },
            variant: true,
          },
        },
      },
    })
  }

  if (!cart) {
    return { id: null, items: [], pricingResult: null }
  }

  // Convert Decimal to number for JSON serialization
  const serializedCart = {
    ...cart,
    items: cart.items.map((item: any) => ({
      ...item,
      product: {
        ...item.product,
        price: Number(item.product.price),
      },
      variant: item.variant ? {
        ...item.variant,
        price: item.variant.price ? Number(item.variant.price) : null,
      } : null,
    })),
  }

  // Compute pricing and append to payload
  const pricingResult = calculateCartPricing(serializedCart.items)

  return { ...serializedCart, pricingResult }
}
