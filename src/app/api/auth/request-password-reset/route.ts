import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { sendPasswordResetEmail } from "@/lib/password-reset"

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

    const emailResult = await sendPasswordResetEmail(user.email)

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
