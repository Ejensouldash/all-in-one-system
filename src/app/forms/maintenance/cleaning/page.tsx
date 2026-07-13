import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { MaintenanceTabs } from "@/components/forms/MaintenanceTabs"
import { CleaningForm } from "./CleaningForm"
import { Brush } from "lucide-react"

export default async function CleaningInspectionPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const userName = session.user?.name || ""

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-md shadow-slate-900/10">
            <Brush className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Cleaning Inspection Record</h1>
            <p className="text-xs font-bold text-slate-400 tracking-wider mt-0.5">FORM REF: SGMP/05/CMCA & OTHERS</p>
          </div>
        </div>
      </div>

      <MaintenanceTabs />

      <div className="bg-slate-50 border border-slate-200/60 p-6 rounded-3xl">
        <CleaningForm userName={userName} />
      </div>
    </div>
  )
}
