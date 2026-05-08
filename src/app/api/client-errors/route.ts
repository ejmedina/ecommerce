import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

type ClientErrorPayload = {
  source?: unknown
  path?: unknown
  message?: unknown
  name?: unknown
  digest?: unknown
  stack?: unknown
  userAgent?: unknown
}

function asLogString(value: unknown, maxLength = 2000) {
  if (typeof value !== "string") return undefined
  return value.slice(0, maxLength)
}

export async function POST(request: Request) {
  let payload: ClientErrorPayload

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const session = await auth().catch(() => null)

  console.error("[CLIENT_ERROR_REPORT]", {
    source: asLogString(payload.source, 120),
    path: asLogString(payload.path, 500),
    name: asLogString(payload.name, 120),
    message: asLogString(payload.message, 1000),
    digest: asLogString(payload.digest, 120),
    stack: asLogString(payload.stack, 4000),
    userAgent: asLogString(payload.userAgent, 500),
    userId: session?.user?.id,
    userRole: session?.user?.role,
  })

  return NextResponse.json({ ok: true })
}
