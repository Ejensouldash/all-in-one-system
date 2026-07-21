import { IVVIForm } from "./IVVIForm"
import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function IVVIPage() {
  const session = await auth()
  const user = session?.user
  if (!user) redirect("/login")

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <IVVIForm userName={user.name || "Unknown User"} />
    </div>
  )
}
