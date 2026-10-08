import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getAccessInfo, canAccessMarketingForms } from "@/lib/access"
import { MarketingFormsClient } from "./MarketingFormsClient"

export const metadata = {
  title: "Marketing Forms & Templates | Bubbles O2",
}

export default async function Page() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/marketing/forms")

  const access = await getAccessInfo()
  if (!access) redirect("/login?callbackUrl=/marketing/forms")

  if (!canAccessMarketingForms(access)) {
    redirect("/dashboard")
  }

  return (
    <MarketingFormsClient
      userName={session.user.name || "Unknown"}
      userModules={access.modules}
      isSuperAdmin={access.isSuperAdmin}
    />
  )
}
