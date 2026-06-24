import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { TransferInForm } from "@/components/forms/TransferInForm"

export const metadata = {
  title: "Delivery Order (Transfer In)",
}

export default async function TransferInPage() {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex justify-end">
          <Link href="/forms/transfer-in/history" className="bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50 px-4 py-2 rounded-lg font-bold text-sm transition-colors shadow-sm inline-flex items-center">
            View History
          </Link>
        </div>
        <TransferInForm userName={session.user?.name || "Unknown"} />
      </div>
    </div>
  )
}
