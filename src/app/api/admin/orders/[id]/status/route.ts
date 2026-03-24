import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/admin-auth"

interface RouteParams {
  params: Promise<{ id: string }>
}

// Valid status values for each axis
const validOrderStatuses = [
  "RECEIVED", "CONFIRMED", "PREPARING", "READY_FOR_DELIVERY",
  "OUT_FOR_DELIVERY", "DELIVERED", "NOT_DELIVERED", "CANCELLED"
]

const validPaymentStatuses = [
  "PENDING", "AUTHORIZED", "PAID", "PARTIALLY_REFUNDED",
  "REFUNDED", "FAILED", "VOIDED"
]

export async function PATCH(request: Request, { params }: RouteParams) {
  const authError = await requireAuth()
  if (authError) return authError

  try {
    const { id } = await params
    const body = await request.json()
    
    const { orderStatus, paymentStatus, failureReason } = body

    // Validate at least one status is provided
    if (!orderStatus && !paymentStatus) {
      return NextResponse.json(
        { error: "Se requiere al menos un estado (orderStatus o paymentStatus)" },
        { status: 400 }
      )
    }

    // Build update data
    const updateData: any = {}

    // Validate and set orderStatus
    if (orderStatus !== undefined) {
      if (!validOrderStatuses.includes(orderStatus)) {
        return NextResponse.json(
          { error: `Estado de pedido inválido: ${orderStatus}` },
          { status: 400 }
        )
      }
      updateData.orderStatus = orderStatus
      
      // Set timestamps based on order status
      if (orderStatus === "CANCELLED") {
        updateData.cancelledAt = new Date()
      }
      if (orderStatus === "NOT_DELIVERED") {
        // Guardar el motivo en adminNotes si se proporciona
        if (failureReason) {
          updateData.adminNotes = failureReason
        }
      }
    }

    // Validate and set paymentStatus
    if (paymentStatus !== undefined) {
      if (!validPaymentStatuses.includes(paymentStatus)) {
        return NextResponse.json(
          { error: `Estado de pago inválido: ${paymentStatus}` },
          { status: 400 }
        )
      }
      updateData.paymentStatus = paymentStatus
      
      // Set timestamp based on payment status
      if (paymentStatus === "PAID") {
        updateData.paidAt = new Date()
      }
    }

    const order = await db.order.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
      }
    })
  } catch (error) {
    console.error("Error updating order status:", error)
    return NextResponse.json(
      { error: "Error al actualizar el estado del pedido" },
      { status: 500 }
    )
  }
}
