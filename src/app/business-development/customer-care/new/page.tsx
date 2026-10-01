import { auth } from "@/auth"
import { getAccessInfo, canManageCustomerCare } from "@/lib/access"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Headphones } from "lucide-react"
import { ComplaintIntakeForm } from "@/components/customer-care/ComplaintIntakeForm"

export const metadata = {
  title: "New Customer Complaint | Bubbles O2 AIO",
}

export default async function NewComplaintPage() {
  const session = await auth()
  const access = await getAccessInfo()

  if (!canManageCustomerCare(access)) {
    redirect("/business-development/customer-care")
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
      {/* Top Breadcrumb & Title */}
      <div>
        <Link
          href="/business-development/customer-care"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Complaints Queue
        </Link>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
          <Headphones className="w-6 h-6 text-indigo-600" />
          Log New Customer Complaint
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Register an incoming product complaint and correlate reported bottle batches with Daily Production Reports.
        </p>
      </div>

      {/* Form Card */}
      <ComplaintIntakeForm />
    </div>
  )
}
