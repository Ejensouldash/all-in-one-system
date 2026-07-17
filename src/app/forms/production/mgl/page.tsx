import MGLForm from "./MGLForm"
import { getUser } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function MGLPage() {
  const user = await getUser()
  if (!user) redirect("/login")

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <MGLForm userName={user.name} />
    </div>
  )
}
