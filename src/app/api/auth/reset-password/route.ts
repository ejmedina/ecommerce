import { hash } from "bcryptjs"
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { findVerificationTokenRecord, hashVerificationToken } from "@/lib/verification-tokens"

const INVALID_TOKEN_MESSAGE = "El enlace es inválido o expiró. Solicitá uno nuevo para continuar."

function isValidPasswordResetToken(token: { type: string; expires: Date } | null) {
  return Boolean(token && token.type === "PASSWORD_RESET" && token.expires >= new Date())
}

export async function GET(request: NextRequest) {
  try {
    const token = new URL(request.url).searchParams.get("token")
    if (!token) return NextResponse.json({ message: INVALID_TOKEN_MESSAGE }, { status: 400 })

    const verification = await findVerificationTokenRecord(token)
    if (!isValidPasswordResetToken(verification)) {
      return NextResponse.json({ message: INVALID_TOKEN_MESSAGE }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Password reset token validation failed", { error })
    return NextResponse.json({ message: "No pudimos validar el enlace. Probá nuevamente." }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json()
    if (typeof token !== "string" || typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { message: "Ingresá una contraseña de al menos 8 caracteres." },
        { status: 400 },
      )
    }

    const verification = await findVerificationTokenRecord(token)
    if (!isValidPasswordResetToken(verification)) {
      return NextResponse.json({ message: INVALID_TOKEN_MESSAGE }, { status: 400 })
    }

    const passwordHash = await hash(password, 12)
    const hashedToken = hashVerificationToken(token)

    const resetCompleted = await db.$transaction(async (tx) => {
      const currentToken =
        await tx.verificationToken.findUnique({ where: { token: hashedToken } }) ??
        await tx.verificationToken.findUnique({ where: { token } })

      if (!isValidPasswordResetToken(currentToken)) return false

      const user = await tx.user.findUnique({
        where: { email: currentToken.identifier },
        select: { id: true, isActive: true, status: true },
      })
      if (!user || !user.isActive || user.status === "BLOCKED") return false

      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash },
      })
      await tx.verificationToken.delete({ where: { id: currentToken.id } })
      return true
    })

    if (!resetCompleted) {
      return NextResponse.json({ message: INVALID_TOKEN_MESSAGE }, { status: 400 })
    }

    console.info("Password reset completed")
    return NextResponse.json({ success: true, message: "Tu contraseña fue actualizada. Ya podés iniciar sesión." })
  } catch (error) {
    console.error("Password reset failed", { error })
    return NextResponse.json(
      { message: "No pudimos restablecer la contraseña. Probá nuevamente en unos segundos." },
      { status: 500 },
    )
  }
}
