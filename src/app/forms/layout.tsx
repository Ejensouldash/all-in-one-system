import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function FormsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")

  const user = session.user as any
  const isAuthorized = user.trueRole === "SUPERADMIN" || user.trueRole === "SUPERVISOR" || user.branchName === "BubblesO2 Rantau"

  if (!isAuthorized) {
    redirect("/dashboard")
  }

  return <>{children}</>
}
