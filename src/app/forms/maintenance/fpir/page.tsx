import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { FPIRForm } from "./FPIRForm"

export const metadata = {
  title: "Finished Product Inspection Record - SGMP/18/FPIR",
}

export default async function FPIRPage() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/forms/maintenance/fpir")

  const userName = session.user.name || "Unknown User"

  return (
    <div className="bg-gray-50 min-h-screen pt-8 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FPIRForm userName={userName} />
      </div>
    </div>
  )
}
