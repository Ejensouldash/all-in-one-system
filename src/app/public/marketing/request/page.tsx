import { Suspense } from "react"
import { MarketingPortalClient } from "./MarketingPortalClient"

export const metadata = {
  title: "Marketing Requisition Portal | Bubbles O2",
  description: "Official Bubbles O2 marketing requisition portal for borrowing assets, promotional merchandise, and event support.",
}

export default function PublicMarketingRequestPage() {
  return (
    <div className="min-h-screen bg-slate-100 py-6 sm:py-12 px-4 sm:px-6">
      <Suspense
        fallback={
          <div className="flex justify-center items-center py-24">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        }
      >
        <MarketingPortalClient />
      </Suspense>
    </div>
  )
}
