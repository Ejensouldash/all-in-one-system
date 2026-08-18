import { redirect } from "next/navigation"
import { MaintenanceTabs } from "@/components/forms/MaintenanceTabs"
import { getAccessInfo } from "@/lib/access"
import { listPalletReferenceData } from "@/lib/warehouse/pallet-ledger-service"
import { PalletTransferForm } from "./PalletTransferForm"

export const dynamic = "force-dynamic"
export const metadata = { title: "New Pallet Movement" }

export default async function NewPalletTransferPage() {
  const access = await getAccessInfo()
  if (!access) redirect("/login")
  const data = await listPalletReferenceData()
  return <div className="min-h-screen bg-stone-50 pb-12"><div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6"><MaintenanceTabs userModules={access.isSuperAdmin ? undefined : access.modules} /><PalletTransferForm data={{ ...data, gatePasses: data.gatePasses, distributionOrders: data.distributionOrders }} /></div></div>
}
