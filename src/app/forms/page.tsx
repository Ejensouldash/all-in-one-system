import { redirect } from "next/navigation"
import { getAccessInfo, hasAnyModule } from "@/lib/access"

const SOD_MODULES = [
  "SALES_ORDERING",
  "SALES_ORDERING_DASHBOARD",
  "SALES_ORDERING_CUSTOMERS",
  "SALES_ORDERING_DOCUMENTS",
  "SALES_ORDERING_INTAKE",
  "SALES_ORDERING_CREDIT_CHECK",
  "SALES_ORDERING_ORDERS",
  "SALES_ORDERING_CUSTOMERS_MANAGE",
  "SALES_ORDERING_DOCUMENT_MANAGE",
]

export default async function FormsPage() {
  const access = await getAccessInfo()
  if (!access) redirect("/login")

  const { isSuperAdmin, modules } = access

  if (isSuperAdmin || modules.includes("FORMS")) redirect("/forms/production")
  if (hasAnyModule(access, SOD_MODULES)) redirect("/forms/sales-ordering")
  if (modules.includes("WAREHOUSE")) redirect("/forms/warehouse/dashboard")
  if (modules.includes("WAREHOUSE_GATEPASS") || modules.includes("GATEPASS_REQUESTER")) redirect("/forms/warehouse/gatepass")
  if (modules.includes("SECURITY_GATEPASS")) redirect("/forms/warehouse/gatepass/security")
  // Withdrawal-only users have exactly one screen; send them straight to it.
  if (modules.includes("RAW_MATERIAL_WITHDRAWAL")) redirect("/forms/warehouse/reports/raw-material")
  if (modules.includes("KBP")) redirect("/kbp")
  if (modules.includes("MAINTENANCE_FORMS")) redirect("/forms/maintenance")
  if (modules.includes("PALLET_LEDGER")) redirect("/forms/maintenance/pallet-transfer")
  if (modules.includes("MAINTENANCE_DASHBOARD")) redirect("/forms/maintenance/dashboard")
  if (modules.includes("MAINTENANCE_REPORTS")) redirect("/forms/maintenance/reports")
  if (modules.includes("PRODUCTION_STOCK")) redirect("/forms/production/stock")
  if (modules.includes("TRANSFER_IN_HISTORY")) redirect("/forms/production/transfer-in/history")
  if (modules.includes("DATABASE_MANAGER")) redirect("/forms/database")
  if (modules.includes("HANDOVER")) redirect("/forms/production/handover/new")

  redirect("/dashboard")
}
