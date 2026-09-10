import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { getDefaultShippingConfig } from "@/lib/shipping"
import { requireAuth } from "@/lib/admin-auth"
import { normalizeTimeZone } from "@/lib/time-zone"
import { mergeThemeColors } from "@/lib/theme-colors"
import { validateNotificationEmails } from "@/lib/notification-emails"
import { encryptSecret } from "@/lib/secret-encryption"

function normalizeTrackingId(value: unknown, pattern: RegExp, label: string) {
  if (value === null || value === undefined || value === "") return null
  if (typeof value !== "string") throw new Error(`${label} inválido`)

  const normalized = value.trim().toUpperCase()
  if (!pattern.test(normalized)) throw new Error(`${label} inválido`)
  return normalized
}

export async function GET() {
  const authError = await requireAuth()
  if (authError) return authError

  try {
    let settings = await db.storeSettings.findFirst({
      include: {
        analyticsSecret: {
          select: { metaCapiAccessTokenCiphertext: true },
        },
      },
    })

    const defaultPaymentMethods = {
      ONLINE_CARD: { isActive: true, label: "Mercado Pago", description: "Pago online seguro" },
      BANK_TRANSFER: { isActive: true, label: "Transferencia bancaria", description: "Confirmación manual" },
      CASH_ON_DELIVERY: { isActive: true, label: "Efectivo contra entrega", description: "Al recibir el pedido" },
      TRANSFER_ON_DELIVERY: { isActive: false, label: "Transferencia contra entrega", description: "Transferís al momento de recibir" },
      CARD_ON_DELIVERY: { isActive: false, label: "Tarjeta contra entrega", description: "Llevamos posnet para crédito/débito" }
    }

    // If no settings exist, create with defaults
    if (!settings) {
      const createdSettings = await db.storeSettings.create({
        data: {
          storeName: "Mi Tienda",
          shippingConfig: getDefaultShippingConfig(),
          paymentMethods: defaultPaymentMethods,
          whatsappWidgetEnabled: false,
          whatsappWidgetPhone: null,
          whatsappWidgetMessage: null,
          timeZone: "America/Argentina/Buenos_Aires",
        },
      })
      return NextResponse.json({
        ...createdSettings,
        metaCapiAccessTokenConfigured: false,
      })
    }

    if (!settings.paymentMethods) {
      settings = {
        ...settings,
        paymentMethods: defaultPaymentMethods,
      }
    }

    const { analyticsSecret, ...publicSettings } = settings
    return NextResponse.json({
      ...publicSettings,
      metaCapiAccessTokenConfigured: Boolean(analyticsSecret?.metaCapiAccessTokenCiphertext),
    })
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
      newOrderEmailNotificationsEnabled,
      newOrderNotificationEmails,
      minShippingOrderAmount,
      storeUrl,
      timeZone,
      gtmContainerId,
      gaMeasurementId,
      metaPixelId,
      metaCapiAccessToken,
      clearMetaCapiAccessToken,
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
      blogEnabled,
      blogHomeLayout,
    } = body

    // Get existing settings to check if shippingConfig needs default
    const existing = await db.storeSettings.findFirst()
    
    // If no shipping config provided, use default
    const finalShippingConfig = shippingConfig || (!existing ? getDefaultShippingConfig() : null)
    const notificationEmails = validateNotificationEmails(newOrderNotificationEmails)

    if (metaCapiAccessToken !== undefined && typeof metaCapiAccessToken !== "string") {
      return NextResponse.json({ error: "Token de Conversions API inválido" }, { status: 400 })
    }
    if (clearMetaCapiAccessToken === true && metaCapiAccessToken?.trim()) {
      return NextResponse.json({ error: "No podés reemplazar y eliminar el token al mismo tiempo" }, { status: 400 })
    }

    let encryptedMetaCapiToken: ReturnType<typeof encryptSecret> | null = null
    if (metaCapiAccessToken?.trim()) {
      if (metaCapiAccessToken.trim().length > 4096) {
        return NextResponse.json({ error: "Token de Conversions API inválido" }, { status: 400 })
      }
      try {
        encryptedMetaCapiToken = encryptSecret(metaCapiAccessToken.trim())
      } catch (error) {
        console.error("Analytics secret encryption error:", error)
        return NextResponse.json(
          { error: "No se pudo guardar el token. Configurá ANALYTICS_ENCRYPTION_KEY en el servidor." },
          { status: 500 },
        )
      }
    }

    let trackingIds: {
      gtmContainerId: string | null
      gaMeasurementId: string | null
      metaPixelId: string | null
    }
    try {
      trackingIds = {
        gtmContainerId: normalizeTrackingId(gtmContainerId, /^GTM-[A-Z0-9]+$/, "ID de Google Tag Manager"),
        gaMeasurementId: normalizeTrackingId(gaMeasurementId, /^G-[A-Z0-9]+$/, "ID de medición de Google Analytics"),
        metaPixelId: normalizeTrackingId(metaPixelId, /^\d+$/, "ID de Meta Pixel"),
      }
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "IDs de tracking inválidos" },
        { status: 400 },
      )
    }

    if (notificationEmails.invalidEmails.length > 0) {
      return NextResponse.json(
        { error: `Emails inválidos: ${notificationEmails.invalidEmails.join(", ")}` },
        { status: 400 },
      )
    }

    if (newOrderEmailNotificationsEnabled && notificationEmails.emails.length === 0) {
      return NextResponse.json(
        { error: "Agregá al menos un email para activar los avisos de nuevos pedidos." },
        { status: 400 },
      )
    }

    const updateData: Prisma.StoreSettingsUpdateInput = {
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
      timeZone: normalizeTimeZone(timeZone),
      ...trackingIds,
    }

    if (newOrderEmailNotificationsEnabled !== undefined) {
      updateData.newOrderEmailNotificationsEnabled = newOrderEmailNotificationsEnabled === true
    }
    if (newOrderNotificationEmails !== undefined) {
      updateData.newOrderNotificationEmails = notificationEmails.emails
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
    
    // Update blog fields if provided
    if (blogEnabled !== undefined) updateData.blogEnabled = blogEnabled
    if (blogHomeLayout !== undefined) updateData.blogHomeLayout = blogHomeLayout

    // Update theme colors if provided
    if (themeColors !== undefined) {
      updateData.themeColors = mergeThemeColors(themeColors)
    }

    // Update payment methods if provided
    if (paymentMethods !== undefined) updateData.paymentMethods = paymentMethods

    // Update store URL if provided
    if (storeUrl !== undefined) updateData.storeUrl = storeUrl
    if (timeZone !== undefined) updateData.timeZone = timeZone

    await db.storeSettings.update({
      where: { id },
      data: updateData,
    })

    if (encryptedMetaCapiToken) {
      await db.storeAnalyticsSecret.upsert({
        where: { storeSettingsId: id },
        create: {
          storeSettingsId: id,
          metaCapiAccessTokenCiphertext: encryptedMetaCapiToken.ciphertext,
          metaCapiAccessTokenIv: encryptedMetaCapiToken.iv,
          metaCapiAccessTokenAuthTag: encryptedMetaCapiToken.authTag,
          metaCapiAccessTokenUpdatedAt: new Date(),
        },
        update: {
          metaCapiAccessTokenCiphertext: encryptedMetaCapiToken.ciphertext,
          metaCapiAccessTokenIv: encryptedMetaCapiToken.iv,
          metaCapiAccessTokenAuthTag: encryptedMetaCapiToken.authTag,
          metaCapiAccessTokenUpdatedAt: new Date(),
        },
      })
    } else if (clearMetaCapiAccessToken === true) {
      await db.storeAnalyticsSecret.upsert({
        where: { storeSettingsId: id },
        create: { storeSettingsId: id },
        update: {
          metaCapiAccessTokenCiphertext: null,
          metaCapiAccessTokenIv: null,
          metaCapiAccessTokenAuthTag: null,
          metaCapiAccessTokenUpdatedAt: null,
        },
      })
    }

    return NextResponse.json({
      success: true,
      metaCapiAccessTokenConfigured: Boolean(encryptedMetaCapiToken),
    })
  } catch (error) {
    console.error("Settings update error:", error)
    return NextResponse.json({ error: "Error al guardar" }, { status: 500 })
  }
}
