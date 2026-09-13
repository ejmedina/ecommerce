import { db } from "@/lib/db"
import { calculateCartPricing } from "@/lib/pricing"

type MergeableCartItem = {
  id: string
  productId: string
  variantId: string | null
  selectionSignature: string | null
  comboConfiguration: unknown
  quantity: number
}

function cartItemMergeKey(item: MergeableCartItem) {
  const configurationKey = item.selectionSignature
    ? `signature:${item.selectionSignature}`
    : item.comboConfiguration
      ? `configuration:${JSON.stringify(item.comboConfiguration)}`
      : "standard"

  return `${item.productId}:${item.variantId ?? "none"}:${configurationKey}`
}

/**
 * Moves a browser's anonymous cart into the authenticated account.
 * The guest cart is only removed after every item has been transferred in the
 * same transaction, so a login cannot make a cart vanish midway through.
 */
export async function mergeGuestCartIntoUserCart(userId: string, sessionId?: string) {
  if (!sessionId) return { strategy: "no_guest_session" as const }

  const result = await db.$transaction(async (tx) => {
    const guestCart = await tx.cart.findUnique({
      where: { sessionId },
      include: {
        items: {
          select: {
            id: true,
            productId: true,
            variantId: true,
            selectionSignature: true,
            comboConfiguration: true,
            quantity: true,
          },
        },
      },
    })

    if (!guestCart) return { strategy: "no_guest_cart" as const }

    const userCart = await tx.cart.findUnique({
      where: { userId },
      include: {
        items: {
          select: {
            id: true,
            productId: true,
            variantId: true,
            selectionSignature: true,
            comboConfiguration: true,
            quantity: true,
          },
        },
      },
    })

    if (!userCart) {
      await tx.cart.update({
        where: { id: guestCart.id },
        data: { userId, sessionId: null },
      })
      return { strategy: "adopted_guest_cart" as const, itemCount: guestCart.items.length }
    }

    const userItemsByKey = new Map(
      userCart.items.map((item) => [cartItemMergeKey(item), { ...item }]),
    )
    let mergedItemCount = 0

    for (const guestItem of guestCart.items) {
      const itemKey = cartItemMergeKey(guestItem)
      const matchingUserItem = userItemsByKey.get(itemKey)

      if (matchingUserItem) {
        const quantity = matchingUserItem.quantity + guestItem.quantity
        await tx.cartItem.update({
          where: { id: matchingUserItem.id },
          data: { quantity },
        })
        userItemsByKey.set(itemKey, { ...matchingUserItem, quantity })
      } else {
        await tx.cartItem.update({
          where: { id: guestItem.id },
          data: { cartId: userCart.id },
        })
        userItemsByKey.set(itemKey, { ...guestItem })
      }
      mergedItemCount++
    }

    await tx.cart.delete({ where: { id: guestCart.id } })
    return { strategy: "merged_into_user_cart" as const, itemCount: mergedItemCount }
  })

  if (result.strategy === "adopted_guest_cart") {
    console.info("Guest cart adopted after login", { itemCount: result.itemCount })
  } else if (result.strategy === "merged_into_user_cart") {
    console.info("Guest cart merged after login", { itemCount: result.itemCount })
  }

  return result
}

export async function getCartState(userId?: string, sessionId?: string) {
  let cart
  let mergeFailed = false

  if (userId && sessionId) {
    try {
      await mergeGuestCartIntoUserCart(userId, sessionId)
    } catch (error) {
      mergeFailed = true
      console.error("Guest cart merge failed; preserving browser cart", { error })
    }
  }

  if (userId) {
    cart = await db.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: { take: 1, orderBy: { order: "asc" } },
                category: true,
              },
            },
            variant: true,
          },
        },
      },
    })
  }

  if ((!cart || mergeFailed) && sessionId) {
    const guestCart = await db.cart.findUnique({
      where: { sessionId },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: { take: 1, orderBy: { order: "asc" } },
                category: true,
              },
            },
            variant: true,
          },
        },
      },
    })

    if (guestCart) {
      if (mergeFailed) {
        console.warn("Returning browser cart after failed cart merge", {
          itemCount: guestCart.items.length,
        })
      }
      cart = guestCart
    }
  }

  if (!cart) {
    return { id: null, items: [], pricingResult: null }
  }

  const serializedCart = {
    ...cart,
    items: cart.items.map((item) => ({
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

  const pricingResult = calculateCartPricing(serializedCart.items)

  return { ...serializedCart, pricingResult }
}
