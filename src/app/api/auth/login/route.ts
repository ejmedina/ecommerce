import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { signIn } from "@/lib/auth"
import { isMigratedUserPendingActivation } from "@/lib/account-activation"

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : ""

    if (!normalizedEmail || !password) {
      return NextResponse.json(
        { error: "Email y contraseña requeridos" },
        { status: 400 }
      )
    }

    // Check if user exists and is active before attempting signIn
    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        isActive: true,
        passwordHash: true,
        status: true,
        importedFromWooCommerce: true,
        requiresPasswordSetup: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: "Credenciales inválidas" },
        { status: 401 }
      )
    }

    if (user.status === "BLOCKED") {
      return NextResponse.json(
        { error: "Tu usuario está bloqueado. Contactá al administrador para recuperar el acceso." },
        { status: 403 }
      )
    }

    if (isMigratedUserPendingActivation(user)) {
      return NextResponse.json(
        {
          error: "Encontramos tu cuenta del sitio anterior. Para ingresar por primera vez, necesitás validar tu email y crear una contraseña nueva.",
          code: "MIGRATED_ACCOUNT_ACTIVATION_REQUIRED",
        },
        { status: 401 }
      )
    }

    if (!user.isActive) {
      return NextResponse.json(
        {
          error: "Tu cuenta no está activa. Por favor verificá tu email para activar tu cuenta.",
          code: "EMAIL_VERIFICATION_REQUIRED",
        },
        { status: 401 }
      )
    }

    // Use NextAuth signIn
    const result = await signIn("credentials", {
      email: normalizedEmail,
      password,
      redirect: false,
    })

    if (result?.error) {
      return NextResponse.json(
        { error: "Credenciales inválidas" },
        { status: 401 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
