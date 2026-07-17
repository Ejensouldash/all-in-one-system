import MGLReportClient from "./MGLReportClient"
import { prisma } from "@/lib/prisma"

export default async function MGLReportPage() {
  const records = await prisma.productionGlassLog.findMany({
    orderBy: { createdAt: "desc" },
  })

  return <MGLReportClient records={records} />
}
