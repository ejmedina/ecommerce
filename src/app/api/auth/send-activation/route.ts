import { NextResponse } from "next/server"
import { sendActivationForEmail } from "@/lib/account-activation"

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : ""

    if (!normalizedEmail) {
      return NextResponse.json(
        { message: "Email requerido" },
        { status: 400 }
      )
    }

    const result = await sendActivationForEmail(normalizedEmail)

    if (result.reason === "already_active") {
      return NextResponse.json(
        { message: "Esta cuenta ya está activa. Podés iniciar sesión normalmente." },
        { status: 400 }
      )
    }

    if (result.sent) {
      return NextResponse.json({
        success: true,
        flow: result.reason,
        message:
          result.reason === "migrated_account"
            ? "Te enviamos un link para validar tu email y crear tu contraseña."
            : "Te reenviamos el email para activar tu cuenta.",
      })
    }

    return NextResponse.json({
      success: true,
      flow: "generic",
      message:
        "Si encontramos una cuenta pendiente para ese email, te vamos a enviar un link para continuar.",
    })
  } catch (error) {
    console.error("Send activation error:", error)
    return NextResponse.json(
      { message: "No pudimos reenviar el email en este momento. Probá nuevamente en unos segundos." },
      { status: 500 }
    )
  }
}
