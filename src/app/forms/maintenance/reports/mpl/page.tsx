import MPLReportClient from "./MPLReportClient"
import { prisma } from "@/lib/prisma"

export default async function MPLReportPage() {
  const records = await prisma.productionPlasticLog.findMany({
    orderBy: { createdAt: "desc" },
  })

  return <MPLReportClient records={records} />
}
