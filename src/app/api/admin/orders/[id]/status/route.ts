import { NextResponse } from "next/server"
import { db } from "@/lib/db"

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status } = body

    if (!status) {
      return NextResponse.json(
        { error: "El estado es requerido" },
        { status: 400 }
      )
    }

    // Build update data with timestamps
    const updateData: any = { status }
    
    // Set timestamps based on status
    switch (status) {
      case "PAID":
        updateData.paidAt = new Date()
        break
      case "SHIPPED":
        updateData.shippedAt = new Date()
        break
      case "DELIVERED":
        updateData.deliveredAt = new Date()
        break
      case "CANCELLED":
        updateData.cancelledAt = new Date()
        break
      case "REFUNDED":
        updateData.paymentStatus = "REFUNDED"
        break
    }

    const order = await db.order.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(order)
  } catch (error) {
    console.error("Error updating order status:", error)
    return NextResponse.json(
      { error: "Error al actualizar el estado del pedido" },
      { status: 500 }
    )
  }
}
