import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Zap, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { UVMachineForm } from "./UVMachineForm"

export const metadata = {
  title: "UV Machine 3 In 1 Checklist",
}

export default async function UVMachinePage() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/forms/maintenance/uv-machine-3-in-1")

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/forms/maintenance"
            className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to GMP Dashboard
          </Link>
          <Link
            href="/forms/maintenance/reports/uv-machine-3-in-1"
            className="inline-flex items-center text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
          >
            View UV Reports &rarr;
          </Link>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          {/* Header Card */}
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 px-6 py-8 sm:p-10 text-white flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
            <div>
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-black uppercase tracking-widest mb-3 border border-blue-400/30">
                PRODUCTION / UV SYSTEM
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center tracking-tight">
                <Zap className="w-8 h-8 mr-3 text-blue-400 shrink-0" />
                UV Machine 3 In 1 Checklist
              </h1>
              <p className="text-slate-300 font-medium text-sm mt-2 max-w-2xl leading-relaxed">
                Daily operational monitoring for Line 1 (800ML) UV Sterilizer parameters and Line 2 (425ML) UV Machine status.
              </p>
            </div>
          </div>

          <div className="p-6 sm:p-10">
            <UVMachineForm userName={session.user?.name || "Production Officer"} />
          </div>
        </div>
      </div>
    </div>
  )
}
