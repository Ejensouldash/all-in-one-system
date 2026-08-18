import { redirect } from "next/navigation"
import { getWarehouseOperationAccess } from "@/lib/warehouse/operations-access"
import { SecurityGateScanner } from "./SecurityGateScanner"

export const metadata = { title: "Security Gatepass Check-In / Out" }

export default async function SecurityGatePassPage() {
  const capabilities = await getWarehouseOperationAccess()
  if (!capabilities) redirect("/login?callbackUrl=/forms/warehouse/gatepass/security")
  if (!capabilities.security) redirect("/forms")
  return <SecurityGateScanner />
}
