import { redirect } from "next/navigation"
import { getAccessInfo } from "@/lib/access"

export default async function FormsPage() {
  const access = await getAccessInfo()
  if (!access) redirect("/login")

  const { isSuperAdmin, modules } = access

  if (isSuperAdmin || modules.includes("FORMS")) redirect("/forms/production")
  if (modules.includes("WAREHOUSE")) redirect("/forms/warehouse/dashboard")
  // Withdrawal-only users have exactly one screen; send them straight to it.
  if (modules.includes("RAW_MATERIAL_WITHDRAWAL")) redirect("/forms/warehouse/reports/raw-material")
  if (modules.includes("MAINTENANCE_FORMS")) redirect("/forms/maintenance")
  if (modules.includes("MAINTENANCE_DASHBOARD")) redirect("/forms/maintenance/dashboard")
  if (modules.includes("MAINTENANCE_REPORTS")) redirect("/forms/maintenance/reports")
  if (modules.includes("PRODUCTION_STOCK")) redirect("/forms/production/stock")
  if (modules.includes("TRANSFER_IN_HISTORY")) redirect("/forms/production/transfer-in/history")
  if (modules.includes("DATABASE_MANAGER")) redirect("/forms/database")
  if (modules.includes("HANDOVER")) redirect("/forms/production/handover/new")

  redirect("/dashboard")
}
