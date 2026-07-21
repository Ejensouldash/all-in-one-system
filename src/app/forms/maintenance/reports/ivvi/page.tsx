import { IVVIReportClient } from "./IVVIReportClient"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

export default async function IVVIReportPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const data = await prisma.securityIncomingVehicle.findMany({
    orderBy: { createdAt: "desc" }
  })

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <IVVIReportClient data={data} userRole={session.user.role} />
    </div>
  )
}
