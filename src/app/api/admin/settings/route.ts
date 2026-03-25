import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getDefaultShippingConfig } from "@/lib/shipping"
import { requireAuth } from "@/lib/admin-auth"

export async function GET() {
  const authError = await requireAuth()
  if (authError) return authError

  try {
    let settings = await db.storeSettings.findFirst()

    // If no settings exist, create with defaults
    if (!settings) {
      settings = await db.storeSettings.create({
        data: {
          storeName: "Mi Tienda",
          shippingConfig: getDefaultShippingConfig(),
        },
      })
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
      autoConfirmOrders,
      requiresPaymentToFulfill,
      storeUrl,
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
      whatsappPreArrivalMessage,
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
