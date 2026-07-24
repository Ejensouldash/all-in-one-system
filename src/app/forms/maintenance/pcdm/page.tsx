import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Bug, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { PCDMForm } from "./PCDMForm"

export const metadata = {
  title: "Pest Control Daily Monitoring - SGMP/06/PCDM",
}

export default async function PCDMPage() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/forms/maintenance/pcdm")

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link href="/forms/maintenance" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to GMP Dashboard
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-lime-50 px-6 py-8 sm:p-10 border-b border-lime-100 flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
            <div>
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-lime-200 text-lime-800 text-xs font-bold uppercase tracking-widest mb-3">
                SGMP/06/PCDM
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 flex items-center">
                <Bug className="w-8 h-8 mr-3 text-lime-600" />
                Pest Control Daily Monitoring
              </h1>
              <p className="text-gray-500 font-medium mt-2">
                Daily checklist for bait station pest activity.
              </p>
            </div>
          </div>

          <div className="p-6 sm:p-10">
            <PCDMForm userName={session.user.name || "Unknown"} />
          </div>
        </div>
      </div>
    </div>
  )
}
