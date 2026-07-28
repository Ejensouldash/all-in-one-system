import { getKbpBatches } from "@/app/actions/kbpBatch"
import { KbpBatchClient } from "./KbpBatchClient"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "KBP — Generate Batch QR",
}

export default async function KbpBatchPage() {
  const res = await getKbpBatches(50)
  const initialBatches = res.success ? res.data : []

  // Dates cross the server/client boundary as strings so the client never has to
  // re-parse a Date that has already been shifted by serialisation.
  const serialised = initialBatches.map((b: any) => ({
    ...b,
    createdAt: b.createdAt.toISOString(),
    productionDate: b.productionDate ? b.productionDate.toISOString() : null,
  }))

  return <KbpBatchClient initialBatches={serialised} />
}
