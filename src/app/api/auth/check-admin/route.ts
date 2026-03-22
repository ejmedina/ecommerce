import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ isAdmin: false })
    }
    
    const userRole = session.user.role
    const isAdmin = userRole && ["SUPERADMIN", "OWNER", "ADMIN"].includes(userRole)
    
    return NextResponse.json({ isAdmin: !!isAdmin })
  } catch (error) {
    console.error("Check admin error:", error)
    return NextResponse.json({ isAdmin: false })
  }
}
