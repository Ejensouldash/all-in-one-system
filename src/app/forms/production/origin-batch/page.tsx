import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getPedasBatches } from "@/app/actions/pedasBatch"
import { PedasBatchClient } from "./PedasBatchClient"

export default async function PedasBatchPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const user = session.user as any
  const userName = user.name || user.email || "Staff Pedas"

  const res = await getPedasBatches()
  const initialBatches = res.success && res.data ? res.data : []

  return <PedasBatchClient initialBatches={initialBatches} userName={userName} />
}
