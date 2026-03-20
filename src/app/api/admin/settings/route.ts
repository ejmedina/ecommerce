import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, storeName, storeEmail, storePhone, freeShippingMin, fixedShippingCost } = body

    await db.storeSettings.update({
      where: { id },
      data: {
        storeName,
        storeEmail,
        storePhone,
        freeShippingMin,
        fixedShippingCost,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Settings update error:", error)
    return NextResponse.json({ error: "Error al guardar" }, { status: 500 })
  }
}
