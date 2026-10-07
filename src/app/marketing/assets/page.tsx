import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getAccessInfo } from "@/lib/access"
import { MarketingAssetsClient } from "./MarketingAssetsClient"
import { getMarketingAssets, getMarketingAssetLoans } from "@/app/actions/marketing-assets"

export const metadata = {
  title: "Marketing Assets Management | Bubbles O2",
}

export default async function Page() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/marketing/assets")

  const access = await getAccessInfo()
  if (!access) redirect("/login?callbackUrl=/marketing/assets")

  const [assetsRes, loansRes] = await Promise.all([
    getMarketingAssets(),
    getMarketingAssetLoans("ALL"),
  ])

  const initialAssets = assetsRes.success ? (assetsRes.data as any) : []
  const initialLoans = loansRes.success ? (loansRes.data as any) : []

  return (
    <MarketingAssetsClient
      initialAssets={initialAssets}
      initialLoans={initialLoans}
      userName={session.user.name || "Unknown"}
    />
  )
}
