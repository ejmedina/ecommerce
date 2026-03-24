import { auth, canAccessAdmin } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function requireAuth() {
  const session = await auth()
  
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }
  
  if (!canAccessAdmin(session.user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }
  
  return null // Return null if authorized
}
