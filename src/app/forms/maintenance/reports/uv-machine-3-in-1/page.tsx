import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { UVMachineReportClient } from "./UVMachineReportClient"

export const metadata = {
  title: "UV Machine 3 In 1 Reports",
}

export const dynamic = "force-dynamic"

export default async function UVMachineReportPage() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/forms/maintenance/reports/uv-machine-3-in-1")

  const records = await prisma.productionUVMachineChecklist.findMany({
    orderBy: { date: "desc" },
  })

  // Format date to ISO string for safe client serialization
  const serializedRecords = records.map((r) => ({
    ...r,
    date: r.date.toISOString(),
    verifiedAt: r.verifiedAt ? r.verifiedAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }))

  return <UVMachineReportClient initialRecords={serializedRecords} />
}
