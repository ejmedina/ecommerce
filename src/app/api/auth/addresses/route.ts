import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "No autorizado" },
        { status: 401 }
      )
    }

    const addresses = await db.address.findMany({
      where: { userId: session.user.id },
      orderBy: { isDefault: "desc" },
    })

    return NextResponse.json(addresses)
  } catch (error) {
    console.error("Get addresses error:", error)
    return NextResponse.json(
      { message: "Error al obtener las direcciones" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "No autorizado" },
        { status: 401 }
      )
    }

    const { 
      label, 
      street, 
      number, 
      floor, 
      apartment, 
      city, 
      state, 
      postalCode, 
      country = "AR",
      instructions,
      isDefault = false 
    } = await req.json()

    // Validation
    if (!label || !street || !number || !city || !state || !postalCode) {
      return NextResponse.json(
        { message: "Todos los campos requeridos deben completarse" },
        { status: 400 }
      )
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await db.address.updateMany({
        where: { userId: session.user.id, isDefault: true },
        data: { isDefault: false },
      })
    }

    const address = await db.address.create({
      data: {
        userId: session.user.id,
        label,
        street,
        number,
        floor,
        apartment,
        city,
        state,
        postalCode,
        country,
        instructions,
        isDefault,
      },
    })

    return NextResponse.json(address)
  } catch (error) {
    console.error("Create address error:", error)
    return NextResponse.json(
      { message: "Error al crear la dirección" },
      { status: 500 }
    )
  }
}
