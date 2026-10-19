import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Droplets, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { WaterQualityROForm } from "./WaterQualityROForm"

export const metadata = {
  title: "Water Quality Testing Record RO",
}

export default async function WaterQualityROPage() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/forms/maintenance/water-quality-ro")

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
          <div className="bg-gradient-to-r from-teal-50 via-cyan-50 to-slate-50 px-6 py-8 sm:p-10 border-b border-teal-100 flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
            <div>
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-teal-200/80 text-teal-900 text-xs font-black uppercase tracking-widest mb-3">
                PRODUCTION / RO SYSTEM
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center">
                <Droplets className="w-8 h-8 mr-3 text-teal-600" />
                Water Quality Testing Record RO
              </h1>
              <p className="text-slate-600 font-medium mt-2">
                Log and monitor RO treated water physical quality, membrane conductivity performance, and UV sterilizer operations.
              </p>
            </div>
          </div>

          <div className="p-6 sm:p-10">
            <WaterQualityROForm userName={session.user?.name || "Production Officer"} />
          </div>
        </div>
      </div>
    </div>
  )
}
