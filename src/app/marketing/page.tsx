import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getAccessInfo, canAccessMarketingForms, canAccessMarketingAssets, canAccessMarketingInventory } from "@/lib/access"

export default async function MarketingRootPage() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/marketing")

  const access = await getAccessInfo()
  if (!access) redirect("/login?callbackUrl=/marketing")

  if (canAccessMarketingForms(access)) {
    redirect("/marketing/forms")
  }
  if (canAccessMarketingAssets(access)) {
    redirect("/marketing/assets")
  }
  if (canAccessMarketingInventory(access)) {
    redirect("/marketing/inventory")
  }

  redirect("/dashboard")
}
