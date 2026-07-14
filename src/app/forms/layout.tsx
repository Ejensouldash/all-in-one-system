import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

export default async function FormsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      role: true,
      branch: { select: { name: true } }
    }
  })

  const role = dbUser?.role || session.user.role
  const branchName = dbUser?.branch?.name || (session.user as any).branchName

  const isAuthorized = role === "SUPERADMIN" || role === "SUPERVISOR" || branchName === "BubblesO2 Rantau"

  if (!isAuthorized) {
    redirect("/dashboard")
  }

  return <>{children}</>
}
