import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { SEFForm } from "./SEFForm"

export const metadata = {
  title: "Sensory Evaluation Form - SGMP/06/SEF",
}

export default async function SEFPage() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/forms/maintenance/sef")

  const userName = session.user?.name || "QC Officer"

  return (
    <div className="bg-gray-50 min-h-screen pt-8 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SEFForm userName={userName} />
      </div>
    </div>
  )
}
