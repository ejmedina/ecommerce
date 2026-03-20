import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { quantity } = await request.json()

    if (typeof quantity !== "number" || quantity < 1) {
      return NextResponse.json({ error: "Cantidad inválida" }, { status: 400 })
    }

    const session = await auth()
    const cookieStore = await cookies()
    const sessionId = cookieStore.get("cart_session_id")?.value

    // Verify ownership
    const item = await db.cartItem.findUnique({
      where: { id },
      include: { cart: true },
    })

    if (!item) {
      return NextResponse.json({ error: "Item no encontrado" }, { status: 404 })
    }

    const isOwner = session?.user?.id
      ? item.cart.userId === session.user.id
      : item.cart.sessionId === sessionId

    if (!isOwner) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    // Check stock
    const product = await db.product.findUnique({
      where: { id: item.productId },
    })

    if (!product || product.stock < quantity) {
      return NextResponse.json({ error: "No hay suficiente stock" }, { status: 400 })
    }

    await db.cartItem.update({
      where: { id },
      data: { quantity },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating cart item:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const session = await auth()
    const cookieStore = await cookies()
    const sessionId = cookieStore.get("cart_session_id")?.value

    // Verify ownership
    const item = await db.cartItem.findUnique({
      where: { id },
      include: { cart: true },
    })

    if (!item) {
      return NextResponse.json({ error: "Item no encontrado" }, { status: 404 })
    }

    const isOwner = session?.user?.id
      ? item.cart.userId === session.user.id
      : item.cart.sessionId === sessionId

    if (!isOwner) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    await db.cartItem.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting cart item:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
