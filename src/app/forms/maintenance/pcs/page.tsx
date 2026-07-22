import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { PCSForm } from "./PCSForm"

export const metadata = {
  title: "Pest Control Schedule - SGMP/06/PCS",
}

export default async function PCSPage() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/forms/maintenance/pcs")

  const userName = session.user.name || "Unknown User"

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <PCSForm userName={userName} />
    </div>
  )
}
