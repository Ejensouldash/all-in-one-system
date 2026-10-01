import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { getAccessInfo, canViewCustomerCare } from "@/lib/access"
import { ShieldAlert } from "lucide-react"
import Link from "next/link"

export const metadata = {
  title: "Customer Care — Business Development | Bubbles O2 AIO",
}

export default async function CustomerCareLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect("/login")

  const access = await getAccessInfo()
  if (!canViewCustomerCare(access)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black text-slate-800">Access Restricted</h2>
          <p className="text-sm text-slate-600">
            You do not have permission to view the Customer Care module. Please request access from a Superadmin or IT administrator.
          </p>
          <div className="pt-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      {children}
    </div>
  )
}
