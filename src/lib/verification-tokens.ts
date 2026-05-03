import { createHash, randomBytes } from "node:crypto"
import { db } from "@/lib/db"

const DEFAULT_TOKEN_BYTES = 32

export function hashVerificationToken(token: string) {
  return createHash("sha256").update(token).digest("hex")
}

export async function createVerificationTokenRecord({
  identifier,
  type,
  expires,
}: {
  identifier: string
  type: string
  expires: Date
}) {
  const rawToken = randomBytes(DEFAULT_TOKEN_BYTES).toString("hex")
  const hashedToken = hashVerificationToken(rawToken)

  await db.verificationToken.deleteMany({
    where: {
      identifier,
      type,
    },
  })

  await db.verificationToken.create({
    data: {
      identifier,
      token: hashedToken,
      type,
      expires,
    },
  })

  return rawToken
}

export async function findVerificationTokenRecord(rawToken: string) {
  const hashedToken = hashVerificationToken(rawToken)

  const tokenRecord =
    await db.verificationToken.findUnique({
      where: { token: hashedToken },
    }) ??
    await db.verificationToken.findUnique({
      where: { token: rawToken },
    })

  return tokenRecord
}

export async function deleteVerificationTokenRecord(rawToken: string) {
  const tokenRecord = await findVerificationTokenRecord(rawToken)
  if (!tokenRecord) return null

  await db.verificationToken.delete({
    where: { id: tokenRecord.id },
  })

  return tokenRecord
}
