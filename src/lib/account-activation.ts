import { db } from "@/lib/db"
import { sendVerificationEmail } from "@/lib/email"
import { createVerificationTokenRecord } from "@/lib/verification-tokens"

const ACTIVATION_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000

export function isMigratedUserPendingActivation(user: {
  importedFromWooCommerce: boolean
  requiresPasswordSetup: boolean
  passwordHash: string | null
}) {
  return user.importedFromWooCommerce && (user.requiresPasswordSetup || !user.passwordHash)
}

export function isAccountPendingEmailVerification(user: {
  isActive: boolean
  requiresPasswordSetup: boolean
  importedFromWooCommerce: boolean
  passwordHash: string | null
}) {
  return !user.isActive && !isMigratedUserPendingActivation(user)
}

export async function sendActivationForUser(user: {
  email: string
  importedFromWooCommerce: boolean
  requiresPasswordSetup: boolean
  passwordHash: string | null
}) {
  const expires = new Date(Date.now() + ACTIVATION_EXPIRATION_MS)
  const migratedAccount = isMigratedUserPendingActivation(user)

  const token = await createVerificationTokenRecord({
    identifier: user.email,
    expires,
    type: migratedAccount ? "PASSWORD_SETUP" : "EMAIL_VERIFICATION",
  })

  await sendVerificationEmail({
    to: user.email,
    token,
    type: migratedAccount ? "migrated_account" : "email_verification",
  })

  return {
    email: user.email,
    migratedAccount,
  }
}

export async function sendActivationForEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase()
  const user = await db.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      email: true,
      isActive: true,
      importedFromWooCommerce: true,
      requiresPasswordSetup: true,
      passwordHash: true,
    },
  })

  if (!user) {
    return {
      sent: false,
      reason: "not_found" as const,
    }
  }

  if (user.isActive && !isMigratedUserPendingActivation(user)) {
    return {
      sent: false,
      reason: "already_active" as const,
    }
  }

  const activation = await sendActivationForUser(user)

  return {
    sent: true,
    reason: activation.migratedAccount ? "migrated_account" as const : "email_verification" as const,
  }
}
