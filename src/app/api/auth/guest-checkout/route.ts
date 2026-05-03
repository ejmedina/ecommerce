import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { sendVerificationEmail } from "@/lib/email"
import { hash } from "bcryptjs"
import { isMigratedUserPendingActivation, sendActivationForUser } from "@/lib/account-activation"
import { createVerificationTokenRecord } from "@/lib/verification-tokens"

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : ""

    if (!normalizedEmail) {
      return NextResponse.json({ error: "Email requerido" }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existingUser) {
      if (isMigratedUserPendingActivation(existingUser)) {
        await sendActivationForUser(existingUser)
        return NextResponse.json({
          success: true,
          activationFlow: "migrated_account",
          message:
            "Ya tenemos una cuenta asociada a este email por compras anteriores. Te enviamos un link para validar tu email y crear tu contraseña.",
        })
      }

      if (!existingUser.isActive) {
        await sendActivationForUser(existingUser)
        return NextResponse.json({
          success: true,
          activationFlow: "email_verification",
          message: "Te reenviamos el email para activar tu cuenta.",
        })
      }

      return NextResponse.json(
        { error: "Este email ya está registrado. Por favor iniciá sesión." },
        { status: 400 }
      )
    }

    // Create a pending guest user
    // Generate a random temporary password
    const tempPassword = crypto.randomUUID()
    const passwordHash = await hash(tempPassword, 10)

    await db.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        name: "Invitado",
        role: "CUSTOMER",
        status: "PENDING",
        isActive: false, // Start as inactive until they set their password
      },
    })

    // Generate a token for password setup
    const token = await createVerificationTokenRecord({
      identifier: normalizedEmail,
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      type: "PASSWORD_SETUP",
    })

    // Send verification email
    await sendVerificationEmail({
      to: normalizedEmail,
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
