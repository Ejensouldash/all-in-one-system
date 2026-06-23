import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { DailyReportForm } from "@/components/forms/DailyReportForm"

export const metadata = {
  title: "KAR Production Daily Report",
}

export default async function DailyReportPage() {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <DailyReportForm userName={session.user?.name || "Unknown"} />
      </div>
    </div>
  )
}
