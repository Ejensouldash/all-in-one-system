import LFCRReportClient from "./LFCRReportClient"
import { prisma } from "@/lib/prisma"

export default async function LFCRReportPage() {
  const records = await prisma.productionLightingFixture.findMany({
    orderBy: { date: "desc" },
  })

  return <LFCRReportClient records={records} />
}
