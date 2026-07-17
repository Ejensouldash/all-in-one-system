import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { PMRForm } from "./PMRForm"

export const metadata = {
  title: "Preventive Maintenance Records - SGMP/03/PMR",
}

export default async function PMRPage() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/forms/maintenance/pmr")

  const userName = session.user.name || "Unknown User"

  return (
    <div className="bg-gray-50 min-h-screen pt-8 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <PMRForm userName={userName} />
      </div>
    </div>
  )
}
