import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Trash2, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { WasteManagementForm } from "./WasteManagementForm"

export const metadata = {
  title: "Waste Management Disposal",
}

export default async function WasteManagementPage() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/forms/maintenance/waste-management")

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link href="/forms/maintenance" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to GMP Dashboard
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-green-50 px-6 py-8 sm:p-10 border-b border-green-100 flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
            <div>
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-green-200 text-green-800 text-xs font-bold uppercase tracking-widest mb-3">
                SGMP/07/WMDR
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 flex items-center">
                <Trash2 className="w-8 h-8 mr-3 text-green-600" />
                Waste Management Disposal
              </h1>
              <p className="text-gray-500 font-medium mt-2">
                Record weights and actions for recycling and disposal of materials.
              </p>
            </div>
          </div>
          
          <div className="p-6 sm:p-10">
            <WasteManagementForm userName={session.user.name || "Unknown"} />
          </div>
        </div>
      </div>
    </div>
  )
}
