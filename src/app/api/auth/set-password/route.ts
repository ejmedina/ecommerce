import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { hash } from "bcryptjs"

/**
 * GET /api/auth/set-password?token=XYZ
 * Checks if a password setup token is valid and returns the associated email.
 */
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
        { status: 404 }
      )
    }

    // Check if token is expired
    if (verification.expires < new Date()) {
      return NextResponse.json(
        { message: "El token ha expirado" },
        { status: 400 }
      )
    }

    // Check token type
    if (verification.type !== "PASSWORD_SETUP") {
      return NextResponse.json(
        { message: "Tipo de token inválido" },
        { status: 400 }
      )
    }

    return NextResponse.json({
      email: verification.identifier,
    })
  } catch (error) {
    console.error("Set password GET error:", error)
    return NextResponse.json(
      { message: "Error al verificar el token" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/auth/set-password
 * Completes the registration for a guest checkout user.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, password, name, phone } = body

    if (!token || !password || !name) {
      return NextResponse.json(
        { message: "Faltan datos requeridos (token, nombre y contraseña)" },
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
        { status: 404 }
      )
    }

    // Check if token is expired
    if (verification.expires < new Date()) {
      return NextResponse.json(
        { message: "El token ha expirado" },
        { status: 400 }
      )
    }

    if (verification.type !== "PASSWORD_SETUP") {
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
        { message: "No se encontró el usuario asociado a este token" },
        { status: 404 }
      )
    }

    // Hash the new password with bcrypt for consistency with NextAuth
    const passwordHash = await hash(password, 10)

    // Update user info and activate account
    await db.user.update({
      where: { id: user.id },
      data: {
        name,
        phone,
        passwordHash,
        status: "ACTIVE",
        isActive: true,
      },
    })

    // Delete the used token
    await db.verificationToken.delete({
      where: { token },
    })

    return NextResponse.json({
      success: true,
      message: "Registro completado con éxito. Ahora podés iniciar sesión.",
    })
  } catch (error) {
    console.error("Set password POST error:", error)
    return NextResponse.json(
      { message: "Error interno al completar el registro" },
      { status: 500 }
    )
  }
}
