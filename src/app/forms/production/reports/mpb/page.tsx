import MPBReportClient from "./MPBReportClient"
import { prisma } from "@/lib/prisma"

export default async function MPBReportPage() {
  const records = await prisma.productionPlasticBreakage.findMany({
    orderBy: { createdAt: "desc" },
  })

  return <MPBReportClient records={records} />
}
