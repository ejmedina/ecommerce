import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { calculateCartPricing } from "@/lib/pricing"

export async function GET() {
  try {
    const session = await auth()
    const cookieStore = await cookies()
    const sessionId = cookieStore.get("cart_session_id")?.value

    let cart

    if (session?.user?.id) {
      cart = await db.cart.findUnique({
        where: { userId: session.user.id },
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
      return NextResponse.json({ id: null, items: [], pricingResult: null })
    }

    // Convert Decimal to number for JSON serialization
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

    // Compute pricing and append to payload
    const pricingResult = calculateCartPricing(serializedCart.items)

    return NextResponse.json({ ...serializedCart, pricingResult })
  } catch (error) {
    console.error("Error fetching cart:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
