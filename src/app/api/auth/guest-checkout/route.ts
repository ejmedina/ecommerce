import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { sendVerificationEmail } from "@/lib/email"
import { hash } from "bcryptjs"

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email requerido" }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      // User exists, they should login instead
      return NextResponse.json(
        { error: "Este email ya está registrado. Por favor iniciá sesión." },
        { status: 400 }
      )
    }

    // Create a pending guest user
    // Generate a random temporary password
    const tempPassword = crypto.randomUUID()
    const passwordHash = await hash(tempPassword, 10)

    const user = await db.user.create({
      data: {
        email,
        passwordHash,
        name: "Guest",
        role: "CUSTOMER",
        status: "PENDING",
        isActive: false, // Start as inactive until they set their password
      },
    })

    // Generate a token for password setup
    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    await db.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires: expiresAt,
        type: "PASSWORD_SETUP",
      },
    })

    // Send verification email
    await sendVerificationEmail({
      to: email,
      token,
      type: "guest_checkout",
    })

    return NextResponse.json({
      success: true,
      message: "Email de verificación enviado",
    })
  } catch (error) {
    console.error("Guest checkout error:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

