import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

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
            },
          },
        },
      })
    }

    if (!cart) {
      return NextResponse.json({ id: null, items: [] })
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
      })),
    }

    return NextResponse.json(serializedCart)
  } catch (error) {
    console.error("Error fetching cart:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
