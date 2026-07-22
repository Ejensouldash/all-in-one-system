import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Bug, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { FTDMForm } from "./FTDMForm"

export const metadata = {
  title: "Fly Trap Daily Monitoring - SGMP/06/FTDM",
}

export default async function FTDMPage() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/forms/maintenance/ftdm")

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link href="/forms/maintenance" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Maintenance Dashboard
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-amber-50 px-6 py-8 sm:p-10 border-b border-amber-100 flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
            <div>
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-amber-200 text-amber-800 text-xs font-bold uppercase tracking-widest mb-3">
                SGMP/06/FTDM
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 flex items-center">
                <Bug className="w-8 h-8 mr-3 text-amber-600" />
                Fly Trap Daily Monitoring
              </h1>
              <p className="text-gray-500 font-medium mt-2">
                Daily checklist for fly trap station pest activity.
              </p>
            </div>
          </div>

          <div className="p-6 sm:p-10">
            <FTDMForm userName={session.user.name || "Unknown"} />
          </div>
        </div>
      </div>
    </div>
  )
}
