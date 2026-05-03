import { NextRequest, NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { db } from "@/lib/db"
import { isMigratedUserPendingActivation, sendActivationForUser } from "@/lib/account-activation"

function registrationSuccessResponse(
  user: { id: string; email: string; name: string | null },
  flow: "new" | "migrated" | "pending",
) {
  const message =
    flow === "migrated"
      ? "Ya tenemos una cuenta asociada a este email por compras anteriores. Te enviamos un link para validar tu email y crear tu contraseña."
      : "Usuario creado. Por favor verificá tu email para activar la cuenta."

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    flow,
    message,
  })
}

export async function POST(req: NextRequest) {
  let normalizedEmail = ""

  try {
    const { name, email, password, phone } = await req.json()
    normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : ""

    if (!name || !normalizedEmail || !password) {
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
      where: { email: normalizedEmail },
    })

    if (existingUser) {
      if (isMigratedUserPendingActivation(existingUser)) {
        await sendActivationForUser(existingUser)
        return registrationSuccessResponse(existingUser, "migrated")
      }

      if (!existingUser.isActive) {
        await sendActivationForUser(existingUser)
        return registrationSuccessResponse(existingUser, "pending")
      }

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
        email: normalizedEmail,
        phone,
        passwordHash,
        role: "CUSTOMER",
        isActive: false, // User must verify email to activate
        emailVerifiedAt: null,
      },
    })

    await sendActivationForUser({
      email: user.email,
      importedFromWooCommerce: false,
      requiresPasswordSetup: false,
      passwordHash: user.passwordHash,
    })

    return registrationSuccessResponse(user, "new")
  } catch (error) {
    console.error("Register error:", error)

    if (normalizedEmail) {
      try {
        const existingUser = await db.user.findUnique({
          where: { email: normalizedEmail },
        })

        if (existingUser && !existingUser.isActive) {
          await sendActivationForUser(existingUser)
          return registrationSuccessResponse(
            existingUser,
            isMigratedUserPendingActivation(existingUser) ? "migrated" : "pending",
          )
        }
      } catch (recoveryError) {
        console.error("Register recovery error:", recoveryError)
      }
    }

    return NextResponse.json(
      { message: "No pudimos completar el registro en este momento. Probá nuevamente en unos segundos." },
      { status: 500 }
    )
  }
}
