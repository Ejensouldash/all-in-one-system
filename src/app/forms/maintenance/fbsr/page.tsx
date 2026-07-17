import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { FBSRForm } from "./FBSRForm"

export const metadata = {
  title: "Filtration Backwash System Records - SGMP/19/FBSR",
}

export default async function FBSRPage() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/forms/maintenance/fbsr")

  const userName = session.user.name || "Unknown User"

  return (
    <div className="bg-gray-50 min-h-screen pt-8 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FBSRForm userName={userName} />
      </div>
    </div>
  )
}
