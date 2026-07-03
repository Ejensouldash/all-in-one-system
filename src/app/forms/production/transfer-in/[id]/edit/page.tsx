import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { TransferInForm } from "@/components/forms/TransferInForm"
import { getTransferInById } from "@/app/actions/transferIn"

export const metadata = {
  title: "Edit Delivery Order (Transfer In)",
}

export default async function EditTransferInPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) redirect("/login")

  const resolvedParams = await params
  const { id } = resolvedParams
  
  const result = await getTransferInById(id)
  
  if (!result.success || !result.data) {
    return (
      <div className="min-h-screen bg-gray-100 p-8 flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Transfer In Not Found</h1>
        <Link href="/forms/production/transfer-in/history" className="text-emerald-600 hover:underline">
          Return to History
        </Link>
      </div>
    )
  }

  const transfer = result.data

  const user = session.user as any
  const role = user.trueRole || user.role
  const modules = user.modules || []
  const hasAccess = role === "SUPERADMIN" || modules.includes("TRANSFER_IN_HISTORY")

  // Check if it's within 30 minutes
  const thirtyMinutes = 30 * 60 * 1000
  const isExpired = Date.now() - new Date(transfer.createdAt).getTime() > thirtyMinutes

  if (isExpired && !hasAccess) {
    return (
      <div className="min-h-screen bg-gray-100 p-8 flex flex-col items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-sm text-center max-w-md border-l-4 border-amber-500">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Edit Time Expired</h1>
          <p className="text-gray-600 mb-6">
            You can only edit a Transfer In record within 30 minutes of submission. This record can no longer be edited.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href={`/forms/production/transfer-in/${id}`} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-emerald-700 transition-colors">
              View Only
            </Link>
            <Link href="/forms/production/transfer-in/history" className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-bold hover:bg-gray-300 transition-colors">
              Back to History
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex justify-between items-center bg-amber-50 p-4 rounded-xl border border-amber-200">
          <div>
            <h1 className="font-bold text-amber-900">Editing Mode Active</h1>
            <p className="text-sm text-amber-700">You are editing an existing record. Changes will overwrite the previous data.</p>
          </div>
          <Link href="/forms/production/transfer-in/history" className="bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-lg font-bold text-sm transition-colors shadow-sm inline-flex items-center">
            Cancel
          </Link>
        </div>
        <TransferInForm userName={session.user?.name || "Unknown"} initialData={transfer} />
      </div>
    </div>
  )
}
