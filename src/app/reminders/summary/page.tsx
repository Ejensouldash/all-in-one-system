import { redirect } from "next/navigation"
import { getAccessInfo, hasAnyModule } from "@/lib/access"
import { PMSummaryClient } from "@/components/reminders/pm/PMSummaryClient"

export const dynamic = "force-dynamic"

export default async function PMSummaryPage() {
  const access = await getAccessInfo()
  if (!access || !hasAnyModule(access, ["REMINDERS"])) redirect("/dashboard")

  return (
    <div className="animate-in fade-in space-y-5 pb-20 duration-500">
      <PMSummaryClient />
    </div>
  )
}
