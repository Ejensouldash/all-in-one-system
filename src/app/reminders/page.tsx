import { redirect } from "next/navigation"
import { getAccessInfo, hasAnyModule } from "@/lib/access"
import { PMWorkspace } from "@/components/reminders/pm/PMWorkspace"

export const dynamic = "force-dynamic"

export default async function RemindersPage() {
  const access = await getAccessInfo()
  if (!access || !hasAnyModule(access, ["REMINDERS"])) redirect("/dashboard")

  return (
    <div className="animate-in fade-in space-y-5 pb-20 duration-500">
      <PMWorkspace />
    </div>
  )
}

