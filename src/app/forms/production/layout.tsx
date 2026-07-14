import { redirect } from "next/navigation"
import { getAccessInfo, hasAnyModule } from "@/lib/access"

const PRODUCTION_MODULES = ["FORMS", "HANDOVER", "PRODUCTION_STOCK", "TRANSFER_IN_HISTORY"]

export default async function ProductionLayout({ children }: { children: React.ReactNode }) {
  const access = await getAccessInfo()
  if (!access) redirect("/login")

  if (!hasAnyModule(access, PRODUCTION_MODULES)) {
    // /forms re-routes the user to whichever section they DO have access to
    redirect("/forms")
  }

  return <>{children}</>
}
