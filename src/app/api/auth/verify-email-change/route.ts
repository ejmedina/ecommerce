import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.json(
        { message: "Token requerido" },
        { status: 400 }
      )
    }

    // Find the verification token
    const verification = await db.verificationToken.findUnique({
      where: { token },
    })

    if (!verification) {
      return NextResponse.json(
        { message: "Token inválido" },
        { status: 400 }
      )
    }

    // Check if token is expired
    if (verification.expires < new Date()) {
      return NextResponse.json(
        { message: "Token expirado" },
        { status: 400 }
      )
    }

    // Check token type
    if (verification.type !== "EMAIL_CHANGE") {
      return NextResponse.json(
        { message: "Tipo de token inválido" },
        { status: 400 }
      )
    }

    const newEmail = verification.identifier

    // Find user with this pending email
    const user = await db.user.findFirst({
      where: { pendingEmail: newEmail },
    })

    if (!user) {
      return NextResponse.json(
        { message: "No se encontró el usuario" },
        { status: 404 }
      )
    }

    // Check if the new email is already taken
    const existingUser = await db.user.findUnique({
      where: { email: newEmail },
    })

    if (existingUser && existingUser.id !== user.id) {
      return NextResponse.json(
        { message: "El email ya está en uso por otro usuario" },
        { status: 400 }
      )
    }

    // Update user email and clear pendingEmail
    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: {
        email: newEmail,
        pendingEmail: null,
      },
    })

    // Delete the verification token
    await db.verificationToken.delete({
      where: { token },
    })

    return NextResponse.json({
      message: "Email actualizado correctamente",
      email: updatedUser.email,
    })
  } catch (error) {
    console.error("Verify email change error:", error)
    return NextResponse.json(
      { message: "Error al verificar el email" },
      { status: 500 }
    )
  }
}
