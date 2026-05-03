import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getDefaultShippingConfig } from "@/lib/shipping"
import { requireAuth } from "@/lib/admin-auth"

export async function GET() {
  const authError = await requireAuth()
  if (authError) return authError

  try {
    let settings = await db.storeSettings.findFirst()

    const defaultPaymentMethods = {
      ONLINE_CARD: { isActive: true, label: "Mercado Pago", description: "Pago online seguro" },
      BANK_TRANSFER: { isActive: true, label: "Transferencia bancaria", description: "Confirmación manual" },
      CASH_ON_DELIVERY: { isActive: true, label: "Efectivo contra entrega", description: "Al recibir el pedido" },
      TRANSFER_ON_DELIVERY: { isActive: false, label: "Transferencia contra entrega", description: "Transferís al momento de recibir" },
      CARD_ON_DELIVERY: { isActive: false, label: "Tarjeta contra entrega", description: "Llevamos posnet para crédito/débito" }
    }

    // If no settings exist, create with defaults
    if (!settings) {
      settings = await db.storeSettings.create({
        data: {
          storeName: "Mi Tienda",
          shippingConfig: getDefaultShippingConfig(),
          paymentMethods: defaultPaymentMethods,
          whatsappWidgetEnabled: false,
          whatsappWidgetPhone: null,
          whatsappWidgetMessage: null,
        },
      })
    } else if (!(settings as any).paymentMethods) {
      (settings as any).paymentMethods = defaultPaymentMethods as any
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error("Settings GET error:", error)
    return NextResponse.json({ error: "Error al obtener configuración" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const authError = await requireAuth()
  if (authError) return authError

  try {
    const body = await req.json()
    const { 
      id, 
      storeName, 
      storeEmail, 
      storePhone, 
      storeAddress,
      logo,
      logoWidth,
      logoHeight,
      favicon,
      faviconWidth,
      faviconHeight,
      shippingConfig,
      freeShippingMin,
      fixedShippingCost,
      bankAccount,
      whatsappPreArrivalMessage,
      whatsappWidgetEnabled,
      whatsappWidgetPhone,
      whatsappWidgetMessage,
      autoConfirmOrders,
      requiresPaymentToFulfill,
      minShippingOrderAmount,
      storeUrl,
      // Store Pickup
      storePickupEnabled,
      // Home page fields
      heroSliderEnabled,
      heroSlides,
      categoryCardsEnabled,
      categoryCards,
      bestSellersEnabled,
      bestSellersLimit,
      infoCardsEnabled,
      infoCards,
      // Theme colors
      themeColors,
      paymentMethods,
    } = body

    // Get existing settings to check if shippingConfig needs default
    const existing = await db.storeSettings.findFirst()
    
    // If no shipping config provided, use default
    const finalShippingConfig = shippingConfig || (!existing ? getDefaultShippingConfig() : null)

    const updateData: any = {
      storeName,
      storeEmail,
      storePhone,
      storeAddress,
      freeShippingMin,
      fixedShippingCost,
      bankAccount,
      autoConfirmOrders,
      requiresPaymentToFulfill,
      minShippingOrderAmount,
      whatsappPreArrivalMessage,
      whatsappWidgetEnabled,
      whatsappWidgetPhone,
      whatsappWidgetMessage,
      storePickupEnabled,
    }

    // Only update logo/favicon if provided
    if (logo !== undefined) updateData.logo = logo
    if (logoWidth !== undefined) updateData.logoWidth = logoWidth
    if (logoHeight !== undefined) updateData.logoHeight = logoHeight
    if (favicon !== undefined) updateData.favicon = favicon
    if (faviconWidth !== undefined) updateData.faviconWidth = faviconWidth
    if (faviconHeight !== undefined) updateData.faviconHeight = faviconHeight
    
    // Update shipping config if provided
    if (finalShippingConfig) {
      updateData.shippingConfig = finalShippingConfig
    }

    // Update home page fields if provided
    if (heroSliderEnabled !== undefined) updateData.heroSliderEnabled = heroSliderEnabled
    if (heroSlides !== undefined) updateData.heroSlides = heroSlides
    if (categoryCardsEnabled !== undefined) updateData.categoryCardsEnabled = categoryCardsEnabled
    if (categoryCards !== undefined) updateData.categoryCards = categoryCards
    if (bestSellersEnabled !== undefined) updateData.bestSellersEnabled = bestSellersEnabled
    if (bestSellersLimit !== undefined) updateData.bestSellersLimit = bestSellersLimit
    if (infoCardsEnabled !== undefined) updateData.infoCardsEnabled = infoCardsEnabled
    if (infoCards !== undefined) updateData.infoCards = infoCards

    // Update theme colors if provided
    if (themeColors !== undefined) updateData.themeColors = themeColors

    // Update payment methods if provided
    if (paymentMethods !== undefined) updateData.paymentMethods = paymentMethods

    // Update store URL if provided
    if (storeUrl !== undefined) updateData.storeUrl = storeUrl

    await db.storeSettings.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Settings update error:", error)
    return NextResponse.json({ error: "Error al guardar" }, { status: 500 })
  }
}
