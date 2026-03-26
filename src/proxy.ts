import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export const proxy = auth((req) => {
  const { nextUrl, auth: session } = req
  const isLoggedIn = !!session?.user
  const pathname = nextUrl.pathname
  
  const isAdminRoute = pathname.startsWith("/admin")
  const isAccountRoute = pathname.startsWith("/account")
  const isLoginRoute = pathname.startsWith("/login")
  
  const role = session?.user?.role
  const isAdminSession = ["SUPERADMIN", "OWNER", "ADMIN"].includes(role ?? "")

  // Handle redirect loop by allowing login page if specifically requested
  if (isLoginRoute && isLoggedIn) {
    const returnUrl = nextUrl.searchParams.get("returnUrl") || "/account"
    // Only redirect from login if we are not already trying to solve a session error
    if (nextUrl.searchParams.get("error") !== "SessionExpired") {
      return NextResponse.redirect(new URL(returnUrl, nextUrl))
    }
  }

  // Admin routes - require ADMIN role or higher
  if (isAdminRoute) {
    if (!isLoggedIn) {
      const loginUrl = new URL("/login", nextUrl)
      loginUrl.searchParams.set("returnUrl", pathname)
      return NextResponse.redirect(loginUrl)
    }
    if (!isAdminSession) {
      return NextResponse.redirect(new URL("/", nextUrl))
    }
  }

  // Account routes - require being logged in
  if (isAccountRoute) {
    if (!isLoggedIn) {
      const loginUrl = new URL("/login", nextUrl)
      loginUrl.searchParams.set("returnUrl", pathname)
      return NextResponse.redirect(loginUrl)
    }
    // Redirect admins away from customer account area
    if (isAdminSession) {
      return NextResponse.redirect(new URL("/admin/profile", nextUrl))
    }
  }

  return NextResponse.next()
})

export const config = {
  // Use more inclusive matchers for root and nested paths
  matcher: ["/admin/:path*", "/account/:path*", "/login"],
}
