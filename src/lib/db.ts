import { PrismaClient } from "@prisma/client"

const DB_RETRY_DELAYS_MS = [250, 750, 1500, 2500]

function configureDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) return

  try {
    const url = new URL(databaseUrl)
    if (!url.searchParams.has("connect_timeout")) {
      url.searchParams.set("connect_timeout", "15")
      process.env.DATABASE_URL = url.toString()
    }
  } catch {
    // Leave non-standard connection strings untouched.
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function isRetriableDatabaseError(error: unknown) {
  if (!error || typeof error !== "object") return false

  const candidate = error as {
    code?: string
    name?: string
    message?: string
    constructor?: { name?: string }
  }

  return (
    candidate.code === "P1001" ||
    candidate.code === "P1002" ||
    candidate.code === "P1008" ||
    candidate.name === "PrismaClientInitializationError" ||
    candidate.constructor?.name === "PrismaClientInitializationError" ||
    candidate.message?.includes("Can't reach database server") ||
    candidate.message?.includes("Timed out fetching a new connection from the connection pool") ||
    false
  )
}

async function withDatabaseRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  disconnect: () => Promise<void>,
) {
  for (let attempt = 0; attempt <= DB_RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await operation()
    } catch (error) {
      if (!isRetriableDatabaseError(error) || attempt === DB_RETRY_DELAYS_MS.length) {
        throw error
      }

      const delay = DB_RETRY_DELAYS_MS[attempt]
      console.warn(
        `Database connection failed during ${operationName}. Retrying in ${delay}ms...`,
      )

      await disconnect().catch(() => null)
      await sleep(delay)
    }
  }

  return operation()
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined
}

function createPrismaClient() {
  configureDatabaseUrl()

  const prisma = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  })

  return prisma.$extends({
    query: {
      async $allOperations({ model, operation, args, query }) {
        return withDatabaseRetry(
          () => query(args),
          model ? `${model}.${operation}` : operation,
          () => prisma.$disconnect(),
        )
      },
    },
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db
