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

    // Update each item in a transaction
    await db.$transaction(async (tx) => {
      let fulfilledTotal = 0

      for (const item of items) {
        const { itemId, quantityFulfilled, missingReason } = item
        
        // Update order item
        const updatedItem = await tx.orderItem.update({
          where: { id: itemId },
          data: {
            quantityFulfilled: Number(quantityFulfilled),
            quantityMissing: Number(item.ordered) - Number(quantityFulfilled),
            missingReason: missingReason || null,
            fulfilledAt: new Date(),
          }
        })

        // Add to fulfilled total (quantity * price)
        fulfilledTotal += Number(updatedItem.price) * Number(quantityFulfilled)
      }

      // Update order status if all items are processed
      // Also update the order's fulfilledTotal field if it exists in schema
      // Note: We might need to check if the field exists, but based on page.tsx it does.
      await tx.order.update({
        where: { id: orderId },
        data: {
          fulfilledTotal: fulfilledTotal,
          // Automaticaly move to PREPARING if we are updating fulfillment
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
