import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getDefaultShippingConfig } from "@/lib/shipping"

export async function GET() {
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
      bankAccount
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
