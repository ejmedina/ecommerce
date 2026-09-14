import { deleteVerificationTokenRecord, createVerificationTokenRecord } from "@/lib/verification-tokens"
import { sendVerificationEmail } from "@/lib/email"

const PASSWORD_RESET_EXPIRATION_MS = 60 * 60 * 1000

export async function sendPasswordResetEmail(email: string) {
  const token = await createVerificationTokenRecord({
    identifier: email,
    type: "PASSWORD_RESET",
    expires: new Date(Date.now() + PASSWORD_RESET_EXPIRATION_MS),
  })

  const result = await sendVerificationEmail({
    to: email,
    token,
    type: "password_reset",
  })

  if (!result.success) {
    try {
      await deleteVerificationTokenRecord(token)
    } catch (error) {
      console.error("Could not revoke an undelivered password reset token", { error })
    }
  }

  return result
}
