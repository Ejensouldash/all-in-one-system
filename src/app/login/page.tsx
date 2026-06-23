"use client"

import { useState } from "react"
import { loginWithCredentials } from "@/app/actions/auth"
import { CheckCircle2, Loader2 } from "lucide-react"

export default function LoginPage() {
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const clientSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)
    
    try {
      const res = await loginWithCredentials(formData)
      if (res && !res.success) {
        setError(res.error || "Login failed.")
        setIsLoading(false)
      } else {
        // Since redirect is handled by Next.js in the action natively, we won't hit here on success.
        // But wait! If redirect is set to false in NextAuth or we intercept it?
        // Let's actually show the animation before the redirect triggers!
      }
    } catch (err: any) {
      if (err.message && err.message.includes('NEXT_REDIRECT')) {
        // This means login was SUCCESSFUL! Next.js throws this error to redirect.
        setIsSuccess(true)
        // Let the animation play for 1.5 seconds, then let Next.js handle the actual redirect via window location.
        setTimeout(() => {
          window.location.href = "/dashboard"
        }, 1500)
      } else {
        setError("An unexpected error occurred.")
        setIsLoading(false)
      }
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden transition-colors">
      
      {/* Full Screen Success Overlay Animation */}
      {isSuccess && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white dark:bg-gray-900 animate-in fade-in duration-500">
          <div className="relative flex items-center justify-center mb-6">
            <div className="absolute w-32 h-32 bg-emerald-500/20 dark:bg-emerald-500/10 rounded-full animate-ping"></div>
            <div className="absolute w-24 h-24 bg-emerald-500/40 dark:bg-emerald-500/20 rounded-full animate-pulse"></div>
            <CheckCircle2 className="h-20 w-20 text-emerald-500 relative z-10 animate-in zoom-in-50 spin-in-12 duration-700" />
          </div>
          <h2 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white animate-in slide-in-from-bottom-5 duration-500 delay-150">Login Successful</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium animate-in slide-in-from-bottom-5 duration-500 delay-300 flex items-center">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Redirecting to Dashboard...
          </p>
        </div>
      )}

      <div className={`w-full max-w-md space-y-8 bg-white dark:bg-gray-900 p-10 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 relative overflow-hidden transition-all duration-500 ${isSuccess ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}>
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-emerald-400"></div>
        
        <div className="text-center">
          <h1 className="text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-emerald-400 mb-2">
            BubbleO2
          </h1>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
            IT Smart Ticketing
          </h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 font-medium">
            Enter your credentials to continue
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={clientSubmit}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label htmlFor="email-address" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="relative block w-full appearance-none rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 focus:z-10 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm transition-colors"
                placeholder="you@bubbleo2.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 mt-4">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="relative block w-full appearance-none rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 focus:z-10 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm transition-colors"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center font-medium bg-red-50 dark:bg-red-900/30 py-3 rounded-lg border border-red-100 dark:border-red-800 flex items-center justify-center">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative flex w-full justify-center rounded-xl border border-transparent bg-gradient-to-r from-blue-600 to-indigo-600 py-3.5 px-4 text-sm font-bold text-white hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all shadow-md hover:shadow-lg disabled:opacity-70"
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Sign in to Workspace"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
