import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { WaterQualityROReportClient } from "./WaterQualityROReportClient"

export const metadata = {
  title: "Water Quality Testing Reports (RO)",
}

export const dynamic = "force-dynamic"

export default async function WaterQualityROReportPage() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/forms/maintenance/reports/water-quality-ro")

  const records = await prisma.productionWaterQualityRO.findMany({
    orderBy: { dateTime: "desc" },
  })

  return <WaterQualityROReportClient initialRecords={records} />
}
