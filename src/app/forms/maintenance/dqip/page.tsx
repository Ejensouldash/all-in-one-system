import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { DQIPForm } from "./DQIPForm"

export const metadata = {
  title: "Daily Quality In-Process Records - SGMP/18/DQIP",
}

export default async function DQIPPage() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/forms/maintenance/dqip")

  const userName = session.user.name || "Unknown User"

  return (
    <div className="bg-gray-50 min-h-screen pt-8 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <DQIPForm userName={userName} />
      </div>
    </div>
  )
}
