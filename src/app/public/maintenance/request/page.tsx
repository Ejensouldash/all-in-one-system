import { Suspense } from "react"
import { PublicWorkRequestForm } from "./PublicWorkRequestForm"

export const metadata = {
  title: "Submit Maintenance Work Request | BubblesO2",
  description: "Public Work Request Form for plant and facility repairs (SOP BOSB-PFMD-850-001-QR01)",
}

export default function PublicWorkRequestPage() {
  return (
    <div className="min-h-screen bg-slate-100 py-6 sm:py-12 px-4 sm:px-6">
      <Suspense fallback={
        <div className="flex justify-center items-center py-24">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }>
        <PublicWorkRequestForm />
      </Suspense>
    </div>
  )
}
