import MWBReportClient from "./MWBReportClient"
import { prisma } from "@/lib/prisma"

export default async function MWBReportPage() {
  const records = await prisma.productionWoodBreakage.findMany({
    orderBy: { createdAt: "desc" },
  })

  return <MWBReportClient records={records} />
}
