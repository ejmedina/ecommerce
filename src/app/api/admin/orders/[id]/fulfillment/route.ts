import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/admin-auth"

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: RouteParams) {
  const authError = await requireAuth()
  if (authError) return authError

  try {
    const { id: orderId } = await params
    const { items } = await request.json()

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: "Se requieren items válidos" }, { status: 400 })
    }

    // Update submitted items, then recalculate the whole order from persisted data.
    await db.$transaction(async (tx) => {
      for (const item of items) {
        const { itemId, quantityFulfilled, missingReason } = item
        const fulfilled = Math.max(0, Number(quantityFulfilled) || 0)
        const ordered = Math.max(0, Number(item.ordered) || 0)
        
        await tx.orderItem.update({
          where: { id: itemId },
          data: {
            quantityFulfilled: Math.min(fulfilled, ordered),
            quantityMissing: Math.max(0, ordered - fulfilled),
            missingReason: missingReason || null,
            fulfilledAt: new Date(),
          }
        })
      }

      const orderItems = await tx.orderItem.findMany({
        where: { orderId },
        select: {
          price: true,
          quantityOrdered: true,
          quantityFulfilled: true,
          fulfilledAt: true,
        },
      })

      const fulfilledTotal = orderItems.reduce((sum, orderItem) => {
        const fulfilled = orderItem.fulfilledAt
          ? orderItem.quantityFulfilled ?? orderItem.quantityOrdered
          : orderItem.quantityOrdered
        return sum + Number(orderItem.price) * fulfilled
      }, 0)

      await tx.order.update({
        where: { id: orderId },
        data: {
          fulfilledTotal,
          orderStatus: "PREPARING"
        }
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating fulfillment:", error)
    return NextResponse.json(
      { error: "Error al actualizar el cumplimiento del pedido" },
      { status: 500 }
    )
  }
}
