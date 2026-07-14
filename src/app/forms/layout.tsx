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
      modules: true,
      branch: { select: { name: true } }
    }
  })

  const role = dbUser?.role || session.user.role
  const branchName = dbUser?.branch?.name || (session.user as any).branchName
  const userModules = dbUser?.modules || []

  const hasFormModules = [
    "FORMS",
    "WAREHOUSE",
    "MAINTENANCE_FORMS",
    "MAINTENANCE_DASHBOARD",
    "MAINTENANCE_REPORTS"
  ].some(mod => userModules.includes(mod))

  const isAuthorized = role === "SUPERADMIN" || role === "SUPERVISOR" || branchName === "BubblesO2 Rantau" || hasFormModules

  if (!isAuthorized) {
    // DEBUG: Write to DB why it failed!
    await prisma.ticket.create({
      data: {
        title: `DEBUG: Kicked user ${session.user.name} from FormsLayout`,
        description: `ID: ${session.user.id}, Modules: ${JSON.stringify(userModules)}, Role: ${role}, Branch: ${branchName}`,
        priority: "LOW",
        unitId: (session.user as any).unitId || null,
        createdById: session.user.id
      }
    }).catch(() => {})

    redirect("/dashboard")
  }

  return <>{children}</>
}
