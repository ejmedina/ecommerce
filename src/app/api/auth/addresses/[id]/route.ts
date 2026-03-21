import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "No autorizado" },
        { status: 401 }
      )
    }

    const { id } = await params

    // Verify the address belongs to the user
    const address = await db.address.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!address) {
      return NextResponse.json(
        { message: "Dirección no encontrada" },
        { status: 404 }
      )
    }

    await db.address.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Dirección eliminada" })
  } catch (error) {
    console.error("Delete address error:", error)
    return NextResponse.json(
      { message: "Error al eliminar la dirección" },
      { status: 500 }
    )
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "No autorizado" },
        { status: 401 }
      )
    }

    const { id } = await params
    const { 
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
      isDefault 
    } = await req.json()

    // Verify the address belongs to the user
    const existingAddress = await db.address.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!existingAddress) {
      return NextResponse.json(
        { message: "Dirección no encontrada" },
        { status: 404 }
      )
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await db.address.updateMany({
        where: { userId: session.user.id, isDefault: true },
        data: { isDefault: false },
      })
    }

    const address = await db.address.update({
      where: { id },
      data: {
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
    console.error("Update address error:", error)
    return NextResponse.json(
      { message: "Error al actualizar la dirección" },
      { status: 500 }
    )
  }
}
