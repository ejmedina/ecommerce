"use server"

import { sendNewOrderNotificationEmail, sendOrderConfirmationEmail } from "@/lib/email"

import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { cookies, headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { OrderItemType, OrderStatus, PaymentMethod, PaymentStatus, Prisma } from "@prisma/client"
import { calculateCartPricing, type CartPricingItem } from "@/lib/pricing"
import { validateComboCartSelection } from "@/lib/cart-combos"
import { buildOrderItemComponentSnapshots } from "@/lib/order-combos"
import { sendMetaPurchaseEvent } from "@/lib/meta-conversions-api"
import { calculateShipping, getDefaultShippingConfig, type ProvinceId, type ShippingConfig } from "@/lib/shipping"
import { getDeliveryOptions } from "@/lib/delivery-scheduling"

type CartWithComboData = Prisma.CartGetPayload<{
  include: {
    items: {
      include: {
        product: {
          include: {
            comboComponents: {
              include: {
                product: {
                  include: {
                    variants: true
                  }
                }
              }
            }
          }
        }
        variant: true
      }
    }
  }
}>

type CartItemWithComboData = CartWithComboData["items"][number]

function logCheckoutRejection(
  reason: string,
  context: {
    cartId?: string | null
    userId?: string | null
    shippingMethod?: string | null
    city?: string | null
    state?: string | null
    settingsId?: string | null
  },
) {
  // Keep this useful for support while deliberately excluding street, phone and email.
  console.warn("Checkout rejected", { event: "checkout.rejected", reason, ...context })
}

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
    const userRole = (session.user as { role?: string }).role
    if (!userRole || !["ADMIN", "OWNER", "SUPERADMIN"].includes(userRole)) {
      return { error: "UNAUTHORIZED", message: "No tienes permisos" }
    }
    
    if (orderIds.length === 0) {
      return { error: "No hay pedidos seleccionados" }
    }

    // Actualizar pedidos
    const updateData: {
      orderStatus?: OrderStatus
      cancelledAt?: Date
      paymentStatus?: PaymentStatus
    } = {}
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
  let transactionContext: {
    cartId?: string
    orderNumber?: string
    startedAt?: number
  } = {}

  try {
    const cartId = formData.get("cartId") as string
    const rawShippingMethod = formData.get("shippingMethod") as string
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
    const scheduledDeliveryDate = formData.get("scheduledDeliveryDate") as string
    const deliveryScheduleRuleId = formData.get("deliveryScheduleRuleId") as string

    // Get cart items
    const cart = await db.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          include: { 
            product: {
              include: {
                comboComponents: {
                  orderBy: { position: "asc" },
                  include: {
                    product: {
                      include: {
                        variants: {
                          where: { isActive: true },
                        },
                      },
                    },
                  },
                },
              },
            },
            variant: true
          }
        }
      }
    })

    if (!cart || cart.items.length === 0) {
      logCheckoutRejection("empty_or_missing_cart", { cartId, shippingMethod: rawShippingMethod })
      return { error: "El carrito está vacío" }
    }

    // Calculate totals securely via pricing engine
    const pricingItems: CartPricingItem[] = cart.items.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      productId: item.productId,
      product: {
        id: item.product.id,
        name: item.product.name,
        price: Number(item.product.price),
        discountType: item.product.discountType,
        discountConfig: item.product.discountConfig,
      },
      variant: item.variant ? {
        price: item.variant.price ? Number(item.variant.price) : null,
      } : null,
    }))

    const pricingResult = calculateCartPricing(pricingItems)
    const subtotal = pricingResult.rawSubtotal
    const discountAmount = pricingResult.discountAmount

    const orderItemsToCreate = cart.items.map((item: CartItemWithComboData) => {
      const itemPrice = item.variant?.price ? Number(item.variant.price) : Number(item.product.price)

      if (item.product.isCombo) {
        const validatedSelection = validateComboCartSelection({
          product: item.product,
          rawConfiguration: item.comboConfiguration,
          quantity: item.quantity,
        })

        return {
          productId: item.productId,
          variantId: null,
          itemType: OrderItemType.COMBO,
          name: item.product.name,
          sku: item.product.sku,
          price: itemPrice,
          quantityOrdered: item.quantity,
          unitTotal: itemPrice * item.quantity,
          components: {
            create: buildOrderItemComponentSnapshots({
              configuration: validatedSelection.configuration,
              comboComponents: item.product.comboComponents,
              comboQuantity: item.quantity,
            }),
          },
        }
      }

      if (item.variantId) {
        if (!item.variant) {
          throw new Error("La variante de un producto del carrito ya no existe.")
        }

        if (!item.product.hasPermanentStock && item.variant.stock < item.quantity) {
          throw new Error(`No hay suficiente stock de ${item.variant.title || item.product.name}.`)
        }
      } else if (!item.product.hasPermanentStock && item.product.stock < item.quantity) {
        throw new Error(`No hay suficiente stock de ${item.product.name}.`)
      }

      const itemName = item.variant?.title ? `${item.product.name} - ${item.variant.title}` : item.product.name

      return {
        productId: item.productId,
        variantId: item.variantId,
        itemType: OrderItemType.PRODUCT,
        name: itemName,
        sku: item.variant?.sku || item.product.sku,
        price: itemPrice,
        quantityOrdered: item.quantity,
        unitTotal: itemPrice * item.quantity,
      }
    })

    // Get settings for shipping
    const settings = await db.storeSettings.findFirst({
      include: { deliveryScheduleRules: { orderBy: { position: "asc" } } },
    })
    
    const storePickupEnabled = settings?.storePickupEnabled !== false
    const shippingMethod =
      rawShippingMethod === "pickup" && !storePickupEnabled
        ? "shipping"
        : rawShippingMethod

    if (shippingMethod !== "pickup" && shippingMethod !== "shipping") {
      logCheckoutRejection("invalid_shipping_method", { cartId, userId: cart.userId, shippingMethod })
      return { error: "Método de envío inválido" }
    }

    if (shippingMethod === "shipping") {
      if (!street || !number || !city || !state || !postalCode) {
        logCheckoutRejection("incomplete_address", { cartId, userId: cart.userId, shippingMethod, city, state, settingsId: settings?.id })
        return { error: "Completá la dirección de entrega para continuar." }
      }
    }

    // Check minimum order amount for shipping
    const minShippingAmount = settings?.minShippingOrderAmount ? Number(settings.minShippingOrderAmount) : 0
    if (shippingMethod === "shipping" && minShippingAmount > 0 && subtotal < minShippingAmount) {
      logCheckoutRejection("minimum_shipping_amount_not_reached", { cartId, userId: cart.userId, shippingMethod, city, state, settingsId: settings?.id })
      return { error: `El monto mínimo para envío a domicilio es $${minShippingAmount}` }
    }

    let selectedDelivery: ReturnType<typeof getDeliveryOptions>[number] | null = null
    let deliveryZone: { id: string; name: string } | null = null
    const configuredShipping = (settings?.shippingConfig as ShippingConfig | null) || getDefaultShippingConfig()
    const shipping = shippingMethod === "shipping"
      ? calculateShipping(state as ProvinceId, city, pricingResult.totalToPay, configuredShipping)
      : null

    if (shippingMethod === "shipping" && !shipping) {
      logCheckoutRejection("address_outside_delivery_area", { cartId, userId: cart.userId, shippingMethod, city, state, settingsId: settings?.id })
      return { error: "No encontramos una zona de entrega para esta dirección. Corregí la provincia y localidad para continuar." }
    }

    const shippingCost = shipping?.cost || 0
    const total = pricingResult.totalToPay + shippingCost

    if (shipping) {
      deliveryZone = { id: shipping.zone.id, name: shipping.zone.name }
    }

    if (shippingMethod === "shipping" && settings?.deliverySchedulingEnabled) {
      // The early rejection above guarantees this branch has a delivery zone.
      if (!shipping) {
        throw new Error("No se pudo resolver la zona de entrega.")
      }
      const options = getDeliveryOptions({
        rules: settings.deliveryScheduleRules,
        shippingZoneId: shipping.zone.id,
        timeZone: settings.timeZone,
        limit: settings.deliveryDateOptionsLimit,
      })
      selectedDelivery = options.find(
        (option) => option.date === scheduledDeliveryDate && option.ruleId === deliveryScheduleRuleId,
      ) || null
      if (!selectedDelivery) {
        logCheckoutRejection("scheduled_delivery_unavailable", { cartId, userId: cart.userId, shippingMethod, city, state, settingsId: settings?.id })
        return { error: "La fecha de entrega elegida ya no está disponible. Elegí una nueva opción." }
      }
    }

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

    // Get user - first check NextAuth session, then fallback to cart's user
    const session = await auth()
    let userId = session?.user?.id || cart.userId

    // If no userId still, check sessionId cookie
    if (!userId) {
      const cookieStore = await cookies()
      const sessionId = cookieStore.get("cart_session_id")?.value
      if (sessionId) {
        const existingCart = await db.cart.findUnique({
          where: { sessionId },
          select: { userId: true }
        })
        userId = existingCart?.userId || null
      }
    }

    // If still no userId, but we have an email, use/create that user
    if (!userId && email) {
      let guestUser = await db.user.findUnique({
        where: { email }
      })
      if (!guestUser) {
        guestUser = await db.user.create({
          data: {
            email,
            name: name || "Invitado",
            role: "CUSTOMER",
            status: "PENDING",
            isActive: false
          }
        })
      } else {
        // If guest user exists but has generic name, update it
        if (guestUser.name === "Guest" || guestUser.name === "Cliente Guest" || !guestUser.name) {
          await db.user.update({
            where: { id: guestUser.id },
            data: { name: name || guestUser.name || "Invitado" }
          })
        }
      }
      userId = guestUser.id
    }

    // Last resort: generic guest user (if somehow no email provided)
    if (!userId) {
      let genericGuest = await db.user.findFirst({
        where: { email: "guest@tienda.com" }
      })
      if (!genericGuest) {
        genericGuest = await db.user.create({
          data: {
            email: "guest@tienda.com",
            name: "Invitado",
            role: "CUSTOMER"
          }
        })
      }
      userId = genericGuest.id
    }

    let finalPaymentMethod = paymentMethod
    if (finalPaymentMethod === "MERCADOPAGO") {
      finalPaymentMethod = "ONLINE_CARD"
    }

    // Determine initial status based on settings
    const initialStatus: OrderStatus = settings?.autoConfirmOrders ? "CONFIRMED" : "RECEIVED"

    // Create order
    transactionContext = {
      cartId,
      orderNumber,
      startedAt: Date.now(),
    }
    console.info("Order transaction started", {
      cartId,
      orderNumber,
      itemCount: orderItemsToCreate.length,
      timeoutMs: 15_000,
    })

    const order = await db.$transaction(async (tx) => {
      const createStartedAt = Date.now()
      console.info("Order transaction callback started", {
        cartId,
        orderNumber,
        transactionQueueMs: createStartedAt - transactionContext.startedAt!,
      })
      const createdOrder = await tx.order.create({
        data: {
          orderNumber,
          userId: userId!,
          orderStatus: initialStatus,
          subtotal,
          shippingCost,
          taxAmount: 0,
          discountAmount: discountAmount,
          total,
          shippingMethod,
          deliveryZoneId: deliveryZone?.id || null,
          deliveryZoneName: deliveryZone?.name || null,
          scheduledDeliveryDate: selectedDelivery ? new Date(`${selectedDelivery.date}T12:00:00Z`) : null,
          deliveryScheduleRuleId: selectedDelivery?.ruleId || null,
          deliverySlotLabel: selectedDelivery?.label || null,
          deliveryWindowStart: selectedDelivery?.startTime || null,
          deliveryWindowEnd: selectedDelivery?.endTime || null,
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
          paymentMethod: finalPaymentMethod as PaymentMethod,
          paymentStatus: "PENDING",
          items: {
            create: orderItemsToCreate,
          },
        },
        include: {
          items: {
            include: {
              components: true,
            },
          },
          user: true,
        },
      })

      const orderCreateDurationMs = Date.now() - createStartedAt
      console.info("Order transaction order created", {
        cartId,
        orderId: createdOrder.id,
        orderNumber,
        durationMs: orderCreateDurationMs,
        transactionElapsedMs: Date.now() - transactionContext.startedAt!,
      })

      const clearCartStartedAt = Date.now()
      const deletedCartItems = await tx.cartItem.deleteMany({
        where: { cartId },
      })
      console.info("Order transaction cart cleared", {
        cartId,
        orderId: createdOrder.id,
        orderNumber,
        deletedItemCount: deletedCartItems.count,
        durationMs: Date.now() - clearCartStartedAt,
        transactionElapsedMs: Date.now() - transactionContext.startedAt!,
      })

      return createdOrder
    }, {
      timeout: 15_000,
    })

    console.info("Order transaction committed", {
      cartId,
      orderId: order.id,
      orderNumber,
      durationMs: Date.now() - transactionContext.startedAt!,
    })

    // Send confirmation email
    try {
      await sendOrderConfirmationEmail(order)
    } catch (emailError) {
      console.error("Failed to send order confirmation email:", emailError)
      // We don't fail the whole process if email fails
    }

    if (settings?.newOrderEmailNotificationsEnabled && settings.newOrderNotificationEmails.length > 0) {
      try {
        await sendNewOrderNotificationEmail(order, settings.newOrderNotificationEmails, settings.timeZone)
      } catch (emailError) {
        console.error("Failed to send new order notification email:", emailError)
      }
    }

    try {
      const requestHeaders = await headers()
      await sendMetaPurchaseEvent({
        storeSettingsId: settings?.id,
        orderId: order.id,
        orderNumber: order.orderNumber,
        total: order.total,
        shippingCost: order.shippingCost,
        taxAmount: order.taxAmount,
        items: order.items,
        email,
        phone,
        clientIpAddress: requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
        clientUserAgent: requestHeaders.get("user-agent"),
      })
    } catch (analyticsError) {
      // A marketing integration must never prevent a confirmed order.
      console.error("Meta Conversions API purchase error:", analyticsError)
    }

    return { orderId: order.id, paymentUrl: undefined }
  } catch (error) {
    const prismaError = error instanceof Prisma.PrismaClientKnownRequestError
      ? {
          code: error.code,
          meta: error.meta,
        }
      : undefined

    console.error("Order creation error", {
      cartId: transactionContext.cartId,
      orderNumber: transactionContext.orderNumber,
      transactionElapsedMs: transactionContext.startedAt
        ? Date.now() - transactionContext.startedAt
        : undefined,
      prismaError,
      error,
    })
    return {
      error: error instanceof Error
        ? error.message
        : "Error al procesar el pedido. Intentalo de nuevo.",
    }
  }
}

// ============================================
// UPDATE ORDER COORDINATES (Logistics)
// ============================================

export async function updateOrderCoordinates(orderId: string, lat: number, lng: number) {
  try {
    const session = await auth()
    if (!session?.user || !["ADMIN", "OWNER", "SUPERADMIN"].includes((session.user as { role?: string }).role || "")) {
      return { error: "AUTH_REQUIRED", message: "No autorizado" }
    }

    const order = await db.order.findUnique({
      where: { id: orderId },
      select: { shippingAddress: true }
    })

    if (!order) return { error: "ORDER_NOT_FOUND", message: "Pedido no encontrado" }

    const shippingAddress = {
      ...((order.shippingAddress as Record<string, unknown> | null) ?? {}),
      lat,
      lng
    }

    await db.order.update({
      where: { id: orderId },
      data: { shippingAddress }
    })

    revalidatePath(`/admin/orders/${orderId}`)
    revalidatePath("/admin/routes")
    
    return { success: true }
  } catch (error: unknown) {
    console.error("Update coordinates error:", error)
    return {
      error: "SERVER_ERROR",
      message: error instanceof Error ? error.message : "Error al actualizar coordenadas",
    }
  }
}

// ============================================
// UPDATE ORDER SHIPPING ADDRESS (Admin)
// ============================================

interface OrderShippingAddressInput {
  street: string
  number: string
  floor?: string
  apartment?: string
  city: string
  state: string
  postalCode: string
  country?: string
  instructions?: string
}

export async function updateOrderShippingAddress(orderId: string, addressData: OrderShippingAddressInput) {
  try {
    const session = await auth()
    if (!session?.user || !["ADMIN", "OWNER", "SUPERADMIN"].includes((session.user as { role?: string }).role || "")) {
      return { error: "AUTH_REQUIRED", message: "No autorizado" }
    }

    const order = await db.order.findUnique({
      where: { id: orderId },
      select: {
        shippingMethod: true,
        shippingAddress: true,
        routeSheetItems: {
          select: {
            routeSheetId: true,
          },
        },
      },
    })

    if (!order) {
      return { error: "ORDER_NOT_FOUND", message: "Pedido no encontrado" }
    }

    if (order.shippingMethod === "pickup") {
      return { error: "INVALID_SHIPPING_METHOD", message: "Los pedidos con retiro en tienda no tienen domicilio editable." }
    }

    const street = addressData.street.trim()
    const number = addressData.number.trim()
    const city = addressData.city.trim()
    const state = addressData.state.trim()
    const postalCode = addressData.postalCode.trim()

    if (!street || !number || !city || !state || !postalCode) {
      return { error: "INVALID_ADDRESS", message: "Completá calle, número, ciudad, provincia y código postal." }
    }

    const currentShippingAddress =
      order.shippingAddress && typeof order.shippingAddress === "object" && !Array.isArray(order.shippingAddress)
        ? (order.shippingAddress as Record<string, unknown>)
        : {}

    const shippingAddress = {
      ...currentShippingAddress,
      street,
      number,
      floor: addressData.floor?.trim() || null,
      apartment: addressData.apartment?.trim() || null,
      city,
      state,
      postalCode,
      country: addressData.country?.trim() || currentShippingAddress.country || "AR",
      instructions: addressData.instructions?.trim() || null,
      lat: null,
      lng: null,
    }

    await db.order.update({
      where: { id: orderId },
      data: { shippingAddress },
    })

    revalidatePath(`/admin/orders/${orderId}`)
    revalidatePath("/admin/orders")
    revalidatePath("/admin/routes")

    for (const routeSheetItem of order.routeSheetItems) {
      revalidatePath(`/admin/routes/${routeSheetItem.routeSheetId}`)
    }

    return { success: true }
  } catch (error: unknown) {
    console.error("Update shipping address error:", error)
    return {
      error: "SERVER_ERROR",
      message: error instanceof Error ? error.message : "Error al actualizar domicilio",
    }
  }
}
