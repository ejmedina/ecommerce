import { Resend } from "resend"

const resendApiKey = process.env.RESEND_API_KEY
const resend = resendApiKey ? new Resend(resendApiKey) : null

const FROM_EMAIL = process.env.EMAIL_FROM || "Tienda <noreply@resend.dev>"

interface EmailOptions {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: EmailOptions) {
  if (!resend) {
    console.warn("Resend not configured - email not sent")
    return { success: false, error: "Resend not configured" }
  }

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    })
    return { success: true, data: result }
  } catch (error) {
    console.error("Email send error:", error)
    return { success: false, error }
  }
}

export async function sendVerificationEmail({
  to,
  token,
  type,
}: {
  to: string
  token: string
  type: "email_change" | "guest_checkout" | "email_verification"
}) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  let verifyUrl: string
  let subject: string
  let description: string

  if (type === "email_change") {
    verifyUrl = `${baseUrl}/auth/verify-email-change?token=${token}`
    subject = "Verificá tu nuevo email"
    description = "Hacé clic en el enlace para confirmar tu nuevo email."
  } else if (type === "guest_checkout") {
    verifyUrl = `${baseUrl}/auth/set-password?token=${token}`
    subject = "Completá tu registro"
    description = "Hacé clic en el enlace para configurar tu contraseña."
  } else {
    // email_verification - new user registration
    verifyUrl = `${baseUrl}/auth/verify-email?token=${token}`
    subject = "Verificá tu cuenta"
    description = "Hacé clic en el enlace para activar tu cuenta y completar el registro."
  }

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333;">${subject}</h1>
      <p style="color: #666; font-size: 16px;">${description}</p>
      <p style="color: #666; font-size: 14px;">
        Si no solicitaste este email, podés ignorarlo.
      </p>
      <a href="${verifyUrl}" style="display: inline-block; background-color: #0a0a0a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin-top: 16px;">
        Verificar Email
      </a>
      <p style="color: #999; font-size: 12px; margin-top: 24px;">
        O copiá este enlace: ${verifyUrl}
      </p>
    </div>
  `

  return sendEmail({ to, subject, html })
}
