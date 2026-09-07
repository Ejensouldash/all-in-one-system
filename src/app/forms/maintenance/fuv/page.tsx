import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { FUVForm } from "./FUVForm"

export const metadata = {
  title: "Hazard and Process Control Records - SGMP/19/FUV",
}

export default async function FUVPage() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/forms/maintenance/fuv")

  const userName = session.user.name || "Unknown User"

  return (
    <div className="bg-slate-50 min-h-screen pt-6 pb-24">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <FUVForm userName={userName} />
      </div>
    </div>
  )
}
