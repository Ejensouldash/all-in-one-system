import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { WellFlowrateReportClient } from "./WellFlowrateReportClient"

export const metadata = {
  title: "Well Flowrate Reports",
}

export const dynamic = "force-dynamic"

export default async function WellFlowrateReportPage() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/forms/maintenance/reports/well-flowrate")

  const records = await prisma.productionWellFlowrate.findMany({
    orderBy: { dateTime: "desc" },
  })

  return <WellFlowrateReportClient initialRecords={records} />
}
