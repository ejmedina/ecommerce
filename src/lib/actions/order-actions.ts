"use server"

import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { OrderStatus, PaymentStatus } from "@prisma/client"

// ============================================
// UPDATE ORDERS STATUS (MASIVO)
// ============================================

export async function updateOrdersStatus(
  orderIds: string[],
  orderStatus?: OrderStatus,
  paymentStatus?: PaymentStatus
) {
  try {
    // Verificar autenticación
    const session = await auth()
    if (!session?.user?.id) {
      return { error: "AUTH_REQUIRED", message: "Debes iniciar sesión" }
    }
    
    // Verificar rol de admin
    const userRole = (session.user as any).role
    if (!userRole || !["ADMIN", "OWNER", "SUPERADMIN"].includes(userRole)) {
      return { error: "UNAUTHORIZED", message: "No tienes permisos" }
    }
    
    if (orderIds.length === 0) {
      return { error: "No hay pedidos seleccionados" }
    }

    // Actualizar pedidos
    const updateData: any = {}
    if (orderStatus) {
      updateData.orderStatus = orderStatus
      // Si se cancela, guardar fecha de cancelación
      if (orderStatus === "CANCELLED") {
        updateData.cancelledAt = new Date()
      }
    }
    if (paymentStatus) {
      updateData.paymentStatus = paymentStatus
    }

    await db.order.updateMany({
      where: { id: { in: orderIds } },
      data: updateData,
    })

    revalidatePath("/admin/orders")

    return { success: true, count: orderIds.length }
  } catch (error) {
    console.error("Update orders status error:", error)
    return { error: "Error al actualizar los pedidos" }
  }
}

// ============================================
// CREATE ORDER
// ============================================

export async function createOrder(formData: FormData) {
  try {
    const cartId = formData.get("cartId") as string
    const shippingMethod = formData.get("shippingMethod") as string
    const paymentMethod = formData.get("paymentMethod") as string
    
    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const phone = formData.get("phone") as string
    const street = formData.get("street") as string
    const number = formData.get("number") as string
    const floor = formData.get("floor") as string
    const apartment = formData.get("apartment") as string
    const city = formData.get("city") as string
    const state = formData.get("state") as string
    const postalCode = formData.get("postalCode") as string
    const instructions = formData.get("instructions") as string

    // Get cart items
    const cart = await db.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          include: { product: true }
        }
      }
    })

    if (!cart || cart.items.length === 0) {
      return { error: "El carrito está vacío" }
    }

    // Calculate totals
    const subtotal = cart.items.reduce(
      (sum, item) => sum + Number(item.product.price) * item.quantity,
      0
    )

    // Get settings for shipping
    const settings = await db.storeSettings.findFirst()
    const freeShippingMin = settings?.freeShippingMin ? Number(settings.freeShippingMin) : 0
    const fixedShippingCost = settings?.fixedShippingCost ? Number(settings.fixedShippingCost) : 0

    const shippingCost = shippingMethod === "shipping"
      ? (subtotal >= freeShippingMin ? 0 : fixedShippingCost)
      : 0

    const total = subtotal + shippingCost

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

    // Get user - first check NextAuth session, then fallback to cart's user
    const session = await auth()
    let userId = session?.user?.id || cart.userId

    // If no userId still, check sessionId cookie
    if (!userId) {
      const sessionId = (await cookies()).get("sessionId")?.value
      if (sessionId) {
        const existingCart = await db.cart.findUnique({
          where: { sessionId },
          select: { userId: true }
        })
        userId = existingCart?.userId || null
      }
    }

    // If still no userId, create or use guest user
    if (!userId) {
      let guestUser = await db.user.findFirst({
        where: { email: "guest@tienda.com" }
      })
      if (!guestUser) {
        guestUser = await db.user.create({
          data: {
            email: "guest@tienda.com",
            name: "Cliente Guest",
            role: "CUSTOMER"
          }
        })
      }
      userId = guestUser.id
    }

    // Determine initial status based on settings
    const initialStatus: OrderStatus = settings?.autoConfirmOrders ? "CONFIRMED" : "RECEIVED"

    // Create order
    const order = await db.order.create({
      data: {
        orderNumber,
        userId: userId!,
        orderStatus: initialStatus,
        subtotal,
        shippingCost,
        taxAmount: 0,
        discountAmount: 0,
        total,
        shippingMethod,
        shippingAddress: {
          name,
          phone,
          street,
          number,
          floor: floor || null,
          apartment: apartment || null,
          city,
          state,
          postalCode,
          instructions: instructions || null,
        },
        paymentMethod: paymentMethod as any,
        paymentStatus: "PENDING",
        items: {
          create: cart.items.map((item) => ({
            productId: item.productId,
            name: item.product.name,
            sku: item.product.sku,
            price: item.product.price,
            quantityOrdered: item.quantity,
            unitTotal: Number(item.product.price) * item.quantity,
          }))
        }
      }
    })

    // Clear cart
    await db.cartItem.deleteMany({
      where: { cartId }
    })

    // For demo: return success (in production, would integrate with payment gateway)
    return { orderId: order.id }
  } catch (error) {
    console.error("Order creation error:", error)
    return { error: "Error al procesar el pedido. Intentalo de nuevo." }
  }
}
