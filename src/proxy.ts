import NextAuth from "next-auth"
import { authConfig } from "./auth.config"
import { NextResponse } from "next/server"

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth
  const isAuthRoute = nextUrl.pathname.startsWith("/login")
  const isPublicRoute = nextUrl.pathname.startsWith("/public/")

  // Public portal links (Maintenance Work Requests, Gatepass, Assets) are deliberately public without login.
  if (isPublicRoute) {
    return NextResponse.next()
  }
  
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

  // Module-level authorization is NOT enforced here. The JWT's "modules"
  // array is a snapshot from login time and goes stale as soon as an admin
  // edits a user's access, which caused users to be kicked from pages they
  // were just granted. Every route family is gated in its server
  // component/layout with live DB data instead (see src/lib/access.ts).

  // Legacy RBAC for admin routes
  if (nextUrl.pathname.startsWith("/admin") && req.auth?.user.role !== "SUPERADMIN") {
    return NextResponse.redirect(new URL("/dashboard", nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
