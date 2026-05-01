import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { auth } from "@/lib/auth"
import { getCartState } from "@/lib/cart"

export async function GET() {
  try {
    const session = await auth()
    const cookieStore = await cookies()
    const sessionId = cookieStore.get("cart_session_id")?.value

    const cartData = await getCartState(session?.user?.id, sessionId)

    return NextResponse.json(cartData)
  } catch (error) {
    console.error("Error fetching cart:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
