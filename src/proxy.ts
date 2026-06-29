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
  let requiredModules: string[] = []
  if (nextUrl.pathname.startsWith("/forms/warehouse")) {
    requiredModules = ["WAREHOUSE"]
  } else if (nextUrl.pathname.startsWith("/forms")) {
    requiredModules = ["FORMS"]
  } else if (nextUrl.pathname.startsWith("/tickets")) {
    requiredModules = ["TICKETS"]
  } else if (nextUrl.pathname.startsWith("/calendar")) {
    requiredModules = ["EVENTS"]
  } else if (nextUrl.pathname.startsWith("/assets")) {
    requiredModules = ["WAREHOUSE"]
  } else if (nextUrl.pathname.startsWith("/users") || nextUrl.pathname.startsWith("/organization")) {
    requiredModules = ["USERS"]
  } else if (nextUrl.pathname.startsWith("/settings")) {
    requiredModules = ["SETTINGS"]
  }

  if (requiredModules.length > 0 && req.auth?.user.role !== "SUPERADMIN") {
    const userModules = (req.auth?.user as any).modules || []
    const hasAccess = requiredModules.some(m => userModules.includes(m))
    if (!hasAccess) {
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
