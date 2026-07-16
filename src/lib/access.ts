import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// All module IDs that grant entry to some part of the /forms tree.
export const FORM_MODULES = [
  "FORMS",
  "WAREHOUSE",
  "MAINTENANCE_FORMS",
  "MAINTENANCE_DASHBOARD",
  "MAINTENANCE_REPORTS",
  "MAINTENANCE_SUMMARY",
  "PRODUCTION_STOCK",
  "TRANSFER_IN_HISTORY",
  "DATABASE_MANAGER",
  "HANDOVER",
]

export type AccessInfo = {
  userId: string
  role: string
  isSuperAdmin: boolean
  modules: string[]
  branchName: string | null
}

// Module access MUST be read live from the DB, never from the session JWT:
// the JWT snapshots modules at login and goes stale the moment an admin
// edits a user's access. The session role is still OR-ed in because the
// IT-unit elevation (effectiveRole) only exists on the session.
export async function getAccessInfo(): Promise<AccessInfo | null> {
  const session = await auth()
  if (!session?.user?.id) return null

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      role: true,
      modules: true,
      branch: { select: { name: true } },
      unit: { select: { name: true } },
    },
  })

  const isSuperAdmin =
    dbUser?.role === "SUPERADMIN" ||
    dbUser?.unit?.name === "Information Technology" ||
    session.user.role === "SUPERADMIN"

  return {
    userId: session.user.id,
    role: dbUser?.role || session.user.role,
    isSuperAdmin,
    modules: dbUser?.modules || [],
    branchName: dbUser?.branch?.name || (session.user as any).branchName || null,
  }
}

export function hasAnyModule(access: AccessInfo, required: string[]): boolean {
  return access.isSuperAdmin || required.some(m => access.modules.includes(m))
}
