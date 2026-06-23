import NextAuth from "next-auth"
import { authConfig } from "./auth.config"
import { NextResponse } from "next/server"

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth
  const isAuthRoute = nextUrl.pathname.startsWith("/login")
  
  if (isAuthRoute) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/dashboard", nextUrl))
    }
    return NextResponse.next()
  }

  if (!isLoggedIn) {
    let callbackUrl = nextUrl.pathname
    if (nextUrl.search) {
      callbackUrl += nextUrl.search
    }
    const encodedCallbackUrl = encodeURIComponent(callbackUrl)
    return NextResponse.redirect(new URL(`/login?callbackUrl=${encodedCallbackUrl}`, nextUrl))
  }

  // Block non-GET requests for viewonly account
  if (req.method !== "GET" && req.auth?.user?.email === "viewonly@bubbleso2.com" && !nextUrl.pathname.startsWith("/api/auth")) {
    return new NextResponse(
      JSON.stringify({ success: false, error: "View Only account cannot modify data" }),
      { status: 403, headers: { "content-type": "application/json" } }
    )
  }

  // Map routes to required modules
  const routeModules: Record<string, string> = {
    "/tickets": "TICKETS",
    "/calendar": "EVENTS",
    "/forms": "FORMS",
    "/assets": "WAREHOUSE",
    "/users": "USERS",
    "/organization": "USERS",
    "/settings": "SETTINGS",
  }

  // Check if the current route requires a specific module
  const requiredModule = Object.entries(routeModules).find(([route]) => 
    nextUrl.pathname.startsWith(route)
  )?.[1]

  if (requiredModule && req.auth?.user.role !== "SUPERADMIN") {
    const userModules = (req.auth?.user as any).modules || []
    if (!userModules.includes(requiredModule)) {
      return NextResponse.redirect(new URL("/dashboard", nextUrl))
    }
  }

  // Legacy RBAC for admin routes
  if (nextUrl.pathname.startsWith("/admin") && req.auth?.user.role !== "SUPERADMIN") {
    return NextResponse.redirect(new URL("/dashboard", nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
