import { VCHIFReportClient } from "./VCHIFReportClient"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

export default async function VCHIFReportPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const data = await prisma.securityVehicleHygiene.findMany({
    orderBy: { createdAt: "desc" }
  })

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <VCHIFReportClient data={data} userRole={session.user.role} />
    </div>
  )
}
