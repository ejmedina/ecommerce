import { db } from "@/lib/db"
import bcrypt from "bcryptjs"

const ADMIN_EMAIL = process.env.ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD

export async function ensureAdminExists() {
  // Skip if env vars are not configured
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.log("Admin setup: ADMIN_EMAIL or ADMIN_PASSWORD not configured, skipping")
    return
  }

  // Check if admin already exists
  const existingAdmin = await db.user.findFirst({
    where: {
      email: ADMIN_EMAIL,
      role: "ADMIN",
    },
  })

  if (existingAdmin) {
    console.log(`Admin already exists: ${ADMIN_EMAIL}`)
    return
  }

  // Create admin user
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10)

  await db.user.create({
    data: {
      email: ADMIN_EMAIL,
      name: "Admin",
      passwordHash,
      role: "ADMIN",
    },
  })

  console.log(`Admin created: ${ADMIN_EMAIL}`)
}

// Call this function early in the app lifecycle
// It will run automatically on server start/deploy
let initialized = false

export async function initAdmin() {
  if (initialized) return
  initialized = true
  
  try {
    await ensureAdminExists()
  } catch (error) {
    console.error("Failed to ensure admin exists:", error)
  }
}
