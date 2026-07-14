import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function ReportsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")

  const role = (session.user as any).trueRole || session.user.role
  const userModules = (session.user as any).modules || []
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
