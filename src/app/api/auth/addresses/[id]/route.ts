import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { calculateShipping, getDefaultShippingConfig, type ProvinceId, type ShippingConfig } from "@/lib/shipping"

async function isServiceableLocality(state: string, city: string) {
  const settings = await db.storeSettings.findFirst({ select: { shippingConfig: true } })
  const shippingConfig = (settings?.shippingConfig as ShippingConfig | null) || getDefaultShippingConfig()
  return Boolean(calculateShipping(state as ProvinceId, city, 0, shippingConfig))
}

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

    if (!label || !street || !number || !city || !state || !postalCode) {
      console.warn("Address rejected", { event: "address.rejected", operation: "update", userId: session.user.id, addressId: id, reason: "incomplete_address" })
      return NextResponse.json(
        { message: "Todos los campos requeridos deben completarse" },
        { status: 400 },
      )
    }

    if (!(await isServiceableLocality(state, city))) {
      console.warn("Address rejected", {
        event: "address.rejected",
        operation: "update",
        userId: session.user.id,
        addressId: id,
        reason: "outside_delivery_area",
        city,
        state,
      })
      return NextResponse.json(
        { message: "No hacemos envíos a la localidad seleccionada. Elegí una localidad habilitada." },
        { status: 400 },
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
