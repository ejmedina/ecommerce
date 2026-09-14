import { PrismaClient } from "@prisma/client"

const DB_RETRY_DELAYS_MS = [250, 750, 1500, 2500]

function configureDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) return

  try {
    const url = new URL(databaseUrl)
    let modified = false
    if (!url.searchParams.has("connect_timeout")) {
      url.searchParams.set("connect_timeout", "15")
      modified = true
    }
    if (url.hostname.includes("pooler") && !url.searchParams.has("pgbouncer")) {
      url.searchParams.set("pgbouncer", "true")
      modified = true
    }
    if (modified) {
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
    candidate.message?.includes("Error in PostgreSQL connection: Error { kind: Closed") ||
    false
  )
}

function databaseErrorDetails(error: unknown) {
  if (!error || typeof error !== "object") return { type: typeof error }

  const candidate = error as {
    code?: string
    name?: string
    constructor?: { name?: string }
    message?: string
  }

  return {
    code: candidate.code,
    name: candidate.name || candidate.constructor?.name,
    reason: candidate.message?.includes("kind: Closed")
      ? "connection_closed"
      : candidate.message?.includes("connection pool")
        ? "connection_pool_timeout"
        : candidate.message?.includes("Can't reach database server")
          ? "database_unreachable"
          : undefined,
  }
}

export async function withDatabaseRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  retryDelays = DB_RETRY_DELAYS_MS,
) {
  for (let attempt = 0; attempt <= retryDelays.length; attempt++) {
    try {
      const result = await operation()
      if (attempt > 0) {
        console.info("Database operation recovered after retry", {
          operation: operationName,
          attempts: attempt,
        })
      }
      return result
    } catch (error) {
      const retriable = isRetriableDatabaseError(error)
      if (!retriable || attempt === retryDelays.length) {
        console.error("Database operation failed", {
          operation: operationName,
          attempts: attempt,
          retriable,
          ...databaseErrorDetails(error),
        })
        throw error
      }

      const delay = retryDelays[attempt]
      console.warn("Database operation retry scheduled", {
        operation: operationName,
        attempt: attempt + 1,
        maxRetries: retryDelays.length,
        delayMs: delay,
        ...databaseErrorDetails(error),
      })
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
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : [],
  })

  return prisma.$extends({
    query: {
      async $allOperations({ model, operation, args, query }) {
        return withDatabaseRetry(
          () => query(args),
          model ? `${model}.${operation}` : operation,
        )
      },
    },
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db
