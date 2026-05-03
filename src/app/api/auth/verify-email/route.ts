import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { deleteVerificationTokenRecord, findVerificationTokenRecord } from "@/lib/verification-tokens"

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
    const verification = await findVerificationTokenRecord(token)

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
    if (verification.type !== "EMAIL_VERIFICATION") {
      return NextResponse.json(
        { message: "Tipo de token inválido" },
        { status: 400 }
      )
    }

    const email = verification.identifier

    // Find user with this email
    const user = await db.user.findUnique({
      where: { email },
    })

    if (!user) {
      return NextResponse.json(
        { message: "No se encontró el usuario" },
        { status: 404 }
      )
    }

    // Check if user is already active
    if (user.isActive) {
      return NextResponse.json(
        { message: "La cuenta ya está activa" },
        { status: 400 }
      )
    }

    // Activate user
    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: {
        isActive: true,
        emailVerifiedAt: new Date(),
      },
    })

    // Delete the verification token
    await deleteVerificationTokenRecord(token)

    return NextResponse.json({
      message: "Cuenta activada correctamente",
      email: updatedUser.email,
    })
  } catch (error) {
    console.error("Verify email error:", error)
    return NextResponse.json(
      { message: "Error al verificar el email" },
      { status: 500 }
    )
  }
}
