import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { FormsTabs } from "@/components/forms/FormsTabs"
import { ShieldAlert } from "lucide-react"
import { HoldItemsTable } from "./HoldItemsTable"
import { getHoldItems } from "@/app/actions/holdItems"

export const metadata = {
  title: "Quarantine Items | Production Dashboard",
}

export default async function QuarantinePage() {
  const session = await auth()
  if (!session) redirect("/login")

  const role = (session.user as any).trueRole || session.user.role
  const itemsReq = await getHoldItems()
  const holdItems = itemsReq.success ? (itemsReq.data || []) : []

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="mb-10">
          <div className="flex items-center space-x-4 mb-2">
            <ShieldAlert className="h-10 w-10 text-amber-700" />
            <div>
              <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter text-gray-900">
                Production Dashboard
              </h1>
              <p className="font-bold text-gray-500 uppercase tracking-widest text-xs mt-1">
                Forms & Logging
              </p>
            </div>
          </div>
        </div>

        <FormsTabs role={role} />

        <div className="mb-8">
          <h2 className="text-2xl font-black uppercase tracking-tight text-gray-900 mb-2">Quarantine / Hold Items</h2>
          <p className="text-gray-500 font-medium">Manage items held during daily production reports. You can reject, reuse, or return them.</p>
        </div>

        <HoldItemsTable initialItems={holdItems} userRole={role} />
      </div>
    </div>
  )
}
