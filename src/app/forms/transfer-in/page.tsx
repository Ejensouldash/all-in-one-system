import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { TransferInForm } from "@/components/forms/TransferInForm"

export const metadata = {
  title: "Delivery Order (Transfer In)",
}

export default async function TransferInPage() {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <TransferInForm userName={session.user?.name || "Unknown"} />
      </div>
    </div>
  )
}
