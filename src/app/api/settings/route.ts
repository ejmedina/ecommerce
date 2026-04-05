import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const settings = await db.storeSettings.findFirst({
      select: {
        storeName: true,
        logo: true,
        favicon: true,
        themeColors: true,
        minShippingOrderAmount: true,
        shippingConfig: true,
      }
    })

    if (!settings) {
      return NextResponse.json({
        storeName: "Mi Tienda",
        minShippingOrderAmount: 0,
      })
    }

    // Convert Decimal to number
    const result = {
      ...settings,
      minShippingOrderAmount: Number(settings.minShippingOrderAmount) || 0,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Public settings GET error:", error)
    return NextResponse.json({ error: "Error" }, { status: 500 })
  }
}
