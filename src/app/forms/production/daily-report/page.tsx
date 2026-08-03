import { Suspense } from "react"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { DailyReportForm } from "@/components/forms/DailyReportForm"

export const metadata = {
  title: "KAR Production Daily Report",
}

function FormSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm space-y-6 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="h-12 bg-gray-100 rounded-xl"></div>
        <div className="h-12 bg-gray-100 rounded-xl"></div>
        <div className="h-12 bg-gray-100 rounded-xl"></div>
      </div>
      <div className="h-64 bg-gray-100 rounded-xl"></div>
    </div>
  )
}

export default async function DailyReportPage() {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <Suspense fallback={<FormSkeleton />}>
          <DailyReportForm userName={session.user?.name || "Unknown"} />
        </Suspense>
      </div>
    </div>
  )
}
