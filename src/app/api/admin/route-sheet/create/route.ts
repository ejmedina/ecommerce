import { createRouteSheet } from "@/lib/actions/route-sheet-actions"
import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/admin-auth"

export async function POST(request: Request) {
  const authError = await requireAuth()
  if (authError) return authError

  try {
    const body = await request.json()
    const { name, orderIds, date } = body

    if (!name || !orderIds || !date) {
      return NextResponse.json(
        { error: "Faltan datos requeridos" },
        { status: 400 }
      )
    }

    const result = await createRouteSheet(
      name,
      orderIds,
      new Date(date)
    )

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ routeSheet: result.routeSheet })
  } catch (error) {
    console.error("Create route sheet API error:", error)
    return NextResponse.json(
      { error: "Error al crear la hoja de ruta" },
      { status: 500 }
    )
  }
}
