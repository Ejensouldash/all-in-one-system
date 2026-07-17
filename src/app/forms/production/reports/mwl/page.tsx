import MWLReportClient from "./MWLReportClient"
import { prisma } from "@/lib/prisma"

export default async function MWLReportPage() {
  const records = await prisma.productionWoodLog.findMany({
    orderBy: { createdAt: "desc" },
  })

  return <MWLReportClient records={records} />
}
