import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { MaintenanceQRPosterClient } from "./MaintenanceQRPosterClient"
import { MaintenanceNavTabs } from "@/components/forms/MaintenanceNavTabs"
import { getAccessInfo } from "@/lib/access"

export const metadata = {
  title: "Print Maintenance QR Posters | BubblesO2",
}

export default async function MaintenanceQRPage() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/forms/maintenance/tickets/qr")

  const access = await getAccessInfo()

  return (
    <div className="bg-slate-50 min-h-screen pb-12 print:bg-white print:p-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 print:p-0 print:max-w-none">
        <div className="print:hidden">
          <MaintenanceNavTabs userModules={access?.modules || []} isSuperAdmin={access?.isSuperAdmin} />
        </div>
        <MaintenanceQRPosterClient />
      </div>
    </div>
  )
}
