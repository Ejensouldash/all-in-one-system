import MGBReportClient from "./MGBReportClient"
import { prisma } from "@/lib/prisma"

export default async function MGBReportPage() {
  const records = await prisma.productionGlassBreakage.findMany({
    orderBy: { createdAt: "desc" },
  })

  return <MGBReportClient records={records} />
}
