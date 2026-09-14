import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { sendVerificationEmail } from "@/lib/email"
import { createVerificationTokenRecord } from "@/lib/verification-tokens"

const PASSWORD_RESET_EXPIRATION_MS = 60 * 60 * 1000
const GENERIC_RESPONSE = {
  success: true,
  message: "Si existe una cuenta activa con ese email, te enviamos un enlace para restablecer la contraseña.",
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : ""

    if (!normalizedEmail) {
      return NextResponse.json({ message: "Email requerido" }, { status: 400 })
    }

    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        email: true,
        isActive: true,
        status: true,
        passwordHash: true,
      },
    })

    if (!user || !user.isActive || user.status === "BLOCKED" || !user.passwordHash) {
      console.info("Password reset requested for an ineligible account")
      return NextResponse.json(GENERIC_RESPONSE)
    }

    const token = await createVerificationTokenRecord({
      identifier: user.email,
      type: "PASSWORD_RESET",
      expires: new Date(Date.now() + PASSWORD_RESET_EXPIRATION_MS),
    })
    const emailResult = await sendVerificationEmail({
      to: user.email,
      token,
      type: "password_reset",
    })

    if (!emailResult.success) {
      console.error("Password reset email could not be sent", { error: emailResult.error })
    } else {
      console.info("Password reset email sent")
    }

    return NextResponse.json(GENERIC_RESPONSE)
  } catch (error) {
    console.error("Password reset request failed", { error })
    return NextResponse.json(
      { message: "No pudimos procesar la solicitud en este momento. Probá nuevamente en unos segundos." },
      { status: 500 },
    )
  }
}
