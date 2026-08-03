import { Suspense } from "react"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { TransferInForm } from "@/components/forms/TransferInForm"

export const metadata = {
  title: "Delivery Order (Transfer In)",
}

function FormSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm space-y-6 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-12 bg-gray-100 rounded-xl"></div>
        <div className="h-12 bg-gray-100 rounded-xl"></div>
      </div>
      <div className="h-40 bg-gray-100 rounded-xl"></div>
    </div>
  )
}

export default async function TransferInPage() {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex justify-end">
          <Link href="/forms/production/transfer-in/history" className="bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50 px-4 py-2 rounded-lg font-bold text-sm transition-colors shadow-sm inline-flex items-center">
            View History
          </Link>
        </div>
        <Suspense fallback={<FormSkeleton />}>
          <TransferInForm userName={session.user?.name || "Unknown"} />
        </Suspense>
      </div>
    </div>
  )
}
