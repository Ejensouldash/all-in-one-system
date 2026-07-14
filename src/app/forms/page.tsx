import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

export default async function FormsPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, modules: true }
  })

  const role = dbUser?.role || session.user.role
  const userModules = dbUser?.modules || []

  if (role === "SUPERADMIN" || userModules.includes("FORMS")) redirect("/forms/production")
  if (userModules.includes("WAREHOUSE")) redirect("/forms/warehouse/dashboard")
  if (userModules.includes("MAINTENANCE_FORMS")) redirect("/forms/maintenance")
  if (userModules.includes("MAINTENANCE_DASHBOARD")) redirect("/forms/maintenance/dashboard")
  if (userModules.includes("MAINTENANCE_REPORTS")) redirect("/forms/maintenance/reports")

  redirect("/dashboard")
}
