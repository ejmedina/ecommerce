import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

// Mercado Pago webhook handler
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, data } = body

    // Handle payment notification
    if (type === "payment") {
      const paymentId = data.id

      // In production, you would:
      // 1. Verify the webhook signature
      // 2. Fetch payment details from Mercado Pago API
      // 3. Update order status accordingly

      // For now, we'll look for orders with this mercadopagoId
      const order = await db.order.findFirst({
        where: { mercadopagoId: paymentId.toString() },
      })

      if (order) {
        // Update order status based on payment status from MP
        const paymentStatus = body.action === "payment.updated" 
          ? body.data?.status 
          : "PENDING"

        let newStatus = order.status
        let newPaymentStatus: "PENDING" | "APPROVED" | "REJECTED" | "REFUNDED" | "CANCELLED" = "PENDING"

        // Map Mercado Pago status to our status
        switch (paymentStatus) {
          case "approved":
            newPaymentStatus = "APPROVED"
            newStatus = "PROCESSING"
            break
          case "rejected":
            newPaymentStatus = "REJECTED"
            newStatus = "CANCELLED"
            break
          case "refunded":
            newPaymentStatus = "REFUNDED"
            newStatus = "REFUNDED"
            break
          case "cancelled":
            newPaymentStatus = "CANCELLED"
            newStatus = "CANCELLED"
            break
          default:
            newPaymentStatus = "PENDING"
        }

        await db.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: newPaymentStatus,
            status: newStatus,
            paidAt: newPaymentStatus === "APPROVED" ? new Date() : undefined,
            mercadopagoData: body,
          },
        })

        // Revalidate relevant pages
        revalidatePath(`/account/orders/${order.id}`)
        revalidatePath("/admin/orders")
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    )
  }
}
