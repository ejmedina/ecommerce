import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { sendVerificationEmail } from "@/lib/email"
import { createVerificationTokenRecord } from "@/lib/verification-tokens"

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "No autorizado" },
        { status: 401 }
      )
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { message: "Usuario no encontrado" },
        { status: 404 }
      )
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error("Get profile error:", error)
    return NextResponse.json(
      { message: "Error al obtener el perfil" },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "No autorizado" },
        { status: 401 }
      )
    }

    const { name, email, phone } = await req.json()

    const user = await db.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user) {
      return NextResponse.json(
        { message: "Usuario no encontrado" },
        { status: 404 }
      )
    }

    // Check if email is being changed
    if (email && email !== user.email) {
      // Check if new email is already in use
      const existingUser = await db.user.findUnique({
        where: { email },
      })

      if (existingUser) {
        return NextResponse.json(
          { message: "El email ya está en uso" },
          { status: 400 }
        )
      }

      // Create verification token for email change
      const token = await createVerificationTokenRecord({
        identifier: email,
        type: "EMAIL_CHANGE",
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      })

      // Store pending email change (keeps old email active until verified)
      await db.user.update({
        where: { id: session.user.id },
        data: {
          name: name || user.name,
          phone: phone || user.phone,
          pendingEmail: email,
        },
      })

      // Send verification email
      await sendVerificationEmail({
        to: email,
        token,
        type: "email_change",
      })

      return NextResponse.json({
        message: "Se envió un email de verificación al nuevo correo",
        pendingEmail: email,
      })
    }

    // No email change - update directly
    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: {
        name: name || user.name,
        email: email || user.email,
        phone: phone || user.phone,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
      },
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error("Update profile error:", error)
    return NextResponse.json(
      { message: "Error al actualizar el perfil" },
      { status: 500 }
    )
  }
}
