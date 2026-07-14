import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

export default async function ReportsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, modules: true }
  })

  const role = dbUser?.role || (session.user as any).trueRole || session.user.role
  const userModules = dbUser?.modules || []
  const isSuperAdmin = role === "SUPERADMIN"

  if (!isSuperAdmin && !userModules.includes("MAINTENANCE_REPORTS")) {
    if (userModules.includes("MAINTENANCE_FORMS")) {
      redirect("/forms/maintenance")
    }
    if (userModules.includes("MAINTENANCE_DASHBOARD")) {
      redirect("/forms/maintenance/dashboard")
    }
    redirect("/dashboard")
  }

  return <>{children}</>
}
