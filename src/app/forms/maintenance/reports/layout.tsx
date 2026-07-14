import { redirect } from "next/navigation"
import { getAccessInfo, hasAnyModule } from "@/lib/access"

export default async function ReportsLayout({ children }: { children: React.ReactNode }) {
  const access = await getAccessInfo()
  if (!access) redirect("/login")

  if (!hasAnyModule(access, ["MAINTENANCE_REPORTS"])) {
    if (access.modules.includes("MAINTENANCE_FORMS")) {
      redirect("/forms/maintenance")
    }
    if (access.modules.includes("MAINTENANCE_DASHBOARD")) {
      redirect("/forms/maintenance/dashboard")
    }
    // /forms re-routes the user to whichever section they DO have access to
    redirect("/forms")
  }

  return <>{children}</>
}
