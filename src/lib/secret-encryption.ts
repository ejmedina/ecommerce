import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"

export interface EncryptedSecret {
  ciphertext: string
  iv: string
  authTag: string
}

function getEncryptionKey(): Buffer {
  const rawKey = process.env.ANALYTICS_ENCRYPTION_KEY
  if (!rawKey) {
    throw new Error("Falta ANALYTICS_ENCRYPTION_KEY para guardar secretos de analytics.")
  }

  const key = /^[a-f\d]{64}$/i.test(rawKey)
    ? Buffer.from(rawKey, "hex")
    : Buffer.from(rawKey, "base64")

  if (key.length !== 32) {
    throw new Error("ANALYTICS_ENCRYPTION_KEY debe tener 32 bytes (base64 o hexadecimal).")
  }

  return key
}

export function encryptSecret(value: string): EncryptedSecret {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()])

  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  }
}

export function decryptSecret(secret: EncryptedSecret): string {
  const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), Buffer.from(secret.iv, "base64"))
  decipher.setAuthTag(Buffer.from(secret.authTag, "base64"))
  return Buffer.concat([
    decipher.update(Buffer.from(secret.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8")
}
