import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getAccessInfo, hasAnyModule } from "@/lib/access"
import { RetentionSampleForm } from "./RetentionSampleForm"

export const metadata = {
  title: "Retention Sample Entry (SGMP/21/RSR) | Bubbles O2",
  description: "Quality retention sample recording form (SGMP/21/RSR) for Bubbles O2.",
}

export const dynamic = "force-dynamic"

export default async function RetentionSamplePage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/forms/maintenance/retention-sample")
  }

  const access = await getAccessInfo()
  if (!access) {
    redirect("/login?callbackUrl=/forms/maintenance/retention-sample")
  }

  const canAccess =
    access.isSuperAdmin ||
    hasAnyModule(access, ["GMP_FORMS", "MAINTENANCE_FORMS", "FORMS", "RETENTION_SAMPLE_MANAGE"])

  if (!canAccess) {
    redirect("/forms/maintenance")
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <RetentionSampleForm userName={access.name || session.user.name || "Operator / QC"} />
      </div>
    </div>
  )
}
