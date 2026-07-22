import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import PCSReportClient from "./PCSReportClient"

export const metadata = {
  title: "Pest Control Schedule - SGMP/06/PCS",
}

export default async function PCSReportPage() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/forms/maintenance/reports/pcs")

  const records = await prisma.maintenancePestControlSchedule.findMany({
    orderBy: { date: "desc" },
  })

  return <PCSReportClient records={records} />
}
