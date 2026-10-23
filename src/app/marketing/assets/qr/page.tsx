import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { MarketingQRPosterClient } from "./MarketingQRPosterClient"
import { MarketingNavTabs } from "@/components/marketing/MarketingNavTabs"
import { getAccessInfo, canAccessMarketingAssets } from "@/lib/access"

export const metadata = {
  title: "Print Marketing QR Poster | Bubbles O2",
}

export default async function MarketingQRPage() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/marketing/assets/qr")

  const access = await getAccessInfo()
  if (!access) redirect("/login?callbackUrl=/marketing/assets/qr")

  if (!canAccessMarketingAssets(access)) {
    redirect("/dashboard")
  }

  return (
    <div className="bg-slate-50 min-h-screen pb-12 print:bg-white print:p-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 print:p-0 print:max-w-none">
        <div className="print:hidden">
          <MarketingNavTabs userModules={access.modules} isSuperAdmin={access.isSuperAdmin} />
        </div>
        <MarketingQRPosterClient />
      </div>
    </div>
  )
}
