import { redirect } from "next/navigation"
import { getWarehouseOperationAccess } from "@/lib/warehouse/operations-access"
import { GatePassCreateForm } from "./GatePassCreateForm"

export const metadata = { title: "New Warehouse Gatepass" }

export default async function NewGatePassPage() {
  const capabilities = await getWarehouseOperationAccess()
  if (!capabilities) redirect("/login?callbackUrl=/forms/warehouse/gatepass/new")
  if (!capabilities.requester) redirect("/forms")
  return <GatePassCreateForm />
}
