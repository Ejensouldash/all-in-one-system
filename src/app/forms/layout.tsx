import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

export default async function FormsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      role: true,
      modules: true
    }
  })

  const role = dbUser?.role || session.user.role
  const userModules = dbUser?.modules || []

  const hasFormModules = [
    "FORMS",
    "WAREHOUSE",
    "MAINTENANCE_FORMS",
    "MAINTENANCE_DASHBOARD",
    "MAINTENANCE_REPORTS",
    "PRODUCTION_STOCK",
    "TRANSFER_IN_HISTORY",
    "DATABASE_MANAGER",
    "HANDOVER"
  ].some(mod => userModules.includes(mod))

  const isAuthorized = role === "SUPERADMIN" || hasFormModules

  if (!isAuthorized) {
    redirect("/dashboard")
  }

  return <>{children}</>
}
