import { NextRequest, NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { db } from "@/lib/db"
import { sendVerificationEmail } from "@/lib/email"

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, phone } = await req.json()

    if (!name || !email || !password) {
      return NextResponse.json(
        { message: "Todos los campos son requeridos" },
        { status: 400 }
      )
    }

    if (!phone) {
      return NextResponse.json(
        { message: "El teléfono es requerido" },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 }
      )
    }

    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { message: "El email ya está registrado" },
        { status: 400 }
      )
    }

    // Create user as inactive (except for admin)
    const passwordHash = await hash(password, 12)
    const user = await db.user.create({
      data: {
        name,
        email,
        phone,
        passwordHash,
        role: "CUSTOMER",
        isActive: false, // User must verify email to activate
      },
    })

    // Generate verification token
    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    await db.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires: expiresAt,
        type: "EMAIL_VERIFICATION",
      },
    })

    // Send verification email
    await sendVerificationEmail({
      to: email,
      token,
      type: "email_verification",
    })

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      message: "Usuario creado. Por favor verificá tu email para activar la cuenta.",
    })
  } catch (error) {
    console.error("Register error:", error)
    return NextResponse.json(
      { message: "Error al crear la cuenta" },
      { status: 500 }
    )
  }
}
