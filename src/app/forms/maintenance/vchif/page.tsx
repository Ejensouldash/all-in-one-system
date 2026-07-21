import { VCHIFForm } from "./VCHIFForm"
import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function VCHIFPage() {
  const session = await auth()
  const user = session?.user
  if (!user) redirect("/login")

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <VCHIFForm userName={user.name || "Unknown User"} />
    </div>
  )
}
