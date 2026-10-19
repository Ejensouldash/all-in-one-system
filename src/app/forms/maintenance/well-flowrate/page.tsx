import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Droplets, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { WellFlowrateForm } from "./WellFlowrateForm"

export const metadata = {
  title: "Well Flowrate Form",
}

export default async function WellFlowratePage() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/forms/maintenance/well-flowrate")

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            href="/forms/maintenance"
            className="inline-flex items-center text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to GMP Dashboard
          </Link>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          {/* Header Card */}
          <div className="bg-gradient-to-r from-sky-50 via-cyan-50 to-slate-50 px-6 py-8 sm:p-10 border-b border-sky-100 flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
            <div>
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-sky-200/80 text-sky-900 text-xs font-black uppercase tracking-widest mb-3">
                PRODUCTION / UTILITIES
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center">
                <Droplets className="w-8 h-8 mr-3 text-sky-600" />
                Well Flowrate
              </h1>
              <p className="text-slate-600 font-medium mt-2">
                Record and monitor production water well flowrates for Wells 2, 3, 4, 7, 8, and 12.
              </p>
            </div>
          </div>

          <div className="p-6 sm:p-10">
            <WellFlowrateForm userName={session.user?.name || "Production Officer"} />
          </div>
        </div>
      </div>
    </div>
  )
}
