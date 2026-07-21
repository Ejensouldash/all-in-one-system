import MPLForm from "./MPLForm"
import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function MPLPage() {
  const session = await auth()
  const user = session?.user
  if (!user) redirect("/login")

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <MPLForm userName={user.name} />
    </div>
  )
}
