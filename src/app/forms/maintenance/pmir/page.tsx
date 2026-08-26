import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { PMIRForm } from "./PMIRForm"

export const metadata = {
  title: "Preventive Maintenance Inspection Records - SGMP/03/PMIR",
}

export default async function PMIRPage() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/forms/maintenance/pmir")

  const userName = session.user.name || "Unknown User"

  return (
    <div className="bg-gray-50 min-h-screen pt-8 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <PMIRForm userName={userName} />
      </div>
    </div>
  )
}
