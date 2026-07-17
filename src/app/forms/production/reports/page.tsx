import { redirect } from "next/navigation"
import Link from "next/link"
import { ClipboardList, FileText } from "lucide-react"
import { FormsTabs } from "@/components/forms/FormsTabs"
import { getAccessInfo, hasAnyModule } from "@/lib/access"

export const metadata = {
  title: "Production Reports",
}

export default async function ProductionReportsPage() {
  const access = await getAccessInfo()
  if (!access) redirect("/login")

  if (!hasAnyModule(access, ["FORMS"])) {
    redirect("/forms")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="mb-10">
          <div className="flex items-center space-x-4 mb-2">
            <ClipboardList className="h-10 w-10 text-indigo-700" />
            <div>
              <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter text-gray-900">
                Production Reports
              </h1>
              <p className="font-bold text-gray-500 uppercase tracking-widest text-xs mt-1">
                View submitted checklists & logs
              </p>
            </div>
          </div>
        </div>

        <FormsTabs role={access.isSuperAdmin ? "SUPERADMIN" : access.role} />

        <div className="mb-6 flex items-center justify-between mt-12">
          <h2 className="text-2xl font-black uppercase tracking-tight text-gray-900 flex items-center">
            <FileText className="w-6 h-6 mr-3 text-cyan-600" />
            Submitted Checklists & Logs
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-12">
          <Link href="/forms/production/reports/lfcr" className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all hover:border-cyan-300 group flex items-start gap-4">
            <div className="p-3 bg-cyan-50 text-cyan-600 rounded-lg group-hover:bg-cyan-600 group-hover:text-white transition-colors">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">SGMP-08 LFCR</h3>
              <p className="text-xs text-gray-500 mt-1 font-medium">Lighting Fixtures Cleaning Record</p>
            </div>
          </Link>

          <Link href="/forms/production/reports/mgl" className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all hover:border-cyan-300 group flex items-start gap-4">
            <div className="p-3 bg-cyan-50 text-cyan-600 rounded-lg group-hover:bg-cyan-600 group-hover:text-white transition-colors">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">SGMP-12 MGL</h3>
              <p className="text-xs text-gray-500 mt-1 font-medium">Monthly Glass Log Records</p>
            </div>
          </Link>

          <Link href="/forms/production/reports/mgb" className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all hover:border-red-300 group flex items-start gap-4">
            <div className="p-3 bg-red-50 text-red-600 rounded-lg group-hover:bg-red-600 group-hover:text-white transition-colors">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">SGMP-12 MGB</h3>
              <p className="text-xs text-gray-500 mt-1 font-medium">Monthly Glass Breakage Records</p>
            </div>
          </Link>

          <Link href="/forms/production/reports/mwl" className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all hover:border-cyan-300 group flex items-start gap-4">
            <div className="p-3 bg-cyan-50 text-cyan-600 rounded-lg group-hover:bg-cyan-600 group-hover:text-white transition-colors">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">SGMP-13 MWL</h3>
              <p className="text-xs text-gray-500 mt-1 font-medium">Monthly Wood Log Records</p>
            </div>
          </Link>

          <Link href="/forms/production/reports/mwb" className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all hover:border-red-300 group flex items-start gap-4">
            <div className="p-3 bg-red-50 text-red-600 rounded-lg group-hover:bg-red-600 group-hover:text-white transition-colors">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">SGMP-13 MWB</h3>
              <p className="text-xs text-gray-500 mt-1 font-medium">Monthly Wood Breakage Records</p>
            </div>
          </Link>

          <Link href="/forms/production/reports/mpl" className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all hover:border-cyan-300 group flex items-start gap-4">
            <div className="p-3 bg-cyan-50 text-cyan-600 rounded-lg group-hover:bg-cyan-600 group-hover:text-white transition-colors">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">SGMP-13 MPL</h3>
              <p className="text-xs text-gray-500 mt-1 font-medium">Monthly Plastic Log Records</p>
            </div>
          </Link>

          <Link href="/forms/production/reports/mpb" className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all hover:border-red-300 group flex items-start gap-4">
            <div className="p-3 bg-red-50 text-red-600 rounded-lg group-hover:bg-red-600 group-hover:text-white transition-colors">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">SGMP-13 MPB</h3>
              <p className="text-xs text-gray-500 mt-1 font-medium">Monthly Plastic Breakage Records</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
