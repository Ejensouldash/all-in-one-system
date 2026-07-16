"use server"

import { signIn } from "@/auth"
import { AuthError } from "next-auth"

function isSafeCallbackUrl(url: string | null): url is string {
  return !!url && url.startsWith("/") && !url.startsWith("//")
}

export async function loginWithCredentials(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const callbackUrl = formData.get("callbackUrl") as string | null

  try {
    // This will throw a redirect error on success, which Next.js expects!
    await signIn("credentials", {
      email,
      password,
      redirect: true,
      redirectTo: isSafeCallbackUrl(callbackUrl) ? callbackUrl : "/dashboard"
    })
    return { success: true }
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { success: false, error: "Invalid email or password." }
        default:
          return { success: false, error: "A server error occurred. Please try again." }
      }
    }
    // Rethrow all other errors (including Next.js NEXT_REDIRECT errors)
    throw error
  }
}
