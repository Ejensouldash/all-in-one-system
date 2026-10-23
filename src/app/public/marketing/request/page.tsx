import { Suspense } from "react"
import { PublicMarketingRequestForm } from "./PublicMarketingRequestForm"

export const metadata = {
  title: "Request Marketing Asset / Merchandise | Bubbles O2",
  description: "Public requisition form for borrowing marketing assets and requesting branded promotional merchandise.",
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
        <PublicMarketingRequestForm />
      </Suspense>
    </div>
  )
}
