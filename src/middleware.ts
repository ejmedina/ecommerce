import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { nextUrl, auth: session } = req
  const isLoggedIn = !!session?.user
  const isAdminRoute = nextUrl.pathname.startsWith("/admin")
  const isAccountRoute = nextUrl.pathname.startsWith("/account")
  const role = session?.user?.role

  // Admin routes - require ADMIN role or higher
  if (isAdminRoute) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", nextUrl))
    }
    if (!["SUPERADMIN", "OWNER", "ADMIN"].includes(role ?? "")) {
      return NextResponse.redirect(new URL("/", nextUrl))
    }
  }

  // Account routes - require CUSTOMER role
  if (isAccountRoute) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", nextUrl))
    }
    if (role !== "CUSTOMER") {
      return NextResponse.redirect(new URL("/admin/dashboard", nextUrl))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/admin/:path*", "/account/:path*"],
}
