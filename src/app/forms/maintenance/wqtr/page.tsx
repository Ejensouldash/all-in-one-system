import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { WQTRForm } from "./WQTRForm"

export const metadata = {
  title: "Water Quality Testing Record - SGMP/18/WQTR",
}

export default async function WQTRPage() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/forms/maintenance/wqtr")

  const userName = session.user.name || "Unknown User"

  return (
    <div className="bg-gray-50 min-h-screen pt-8 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <WQTRForm userName={userName} />
      </div>
    </div>
  )
}
