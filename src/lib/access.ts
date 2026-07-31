import { cache } from "react"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// Dedupes auth() across every call within a single request's render tree.
export const getSession = cache(async () => auth())

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
  // Production staff who take raw material off the warehouse rack themselves. Grants the Daily
  // Raw Material screens only — not the rest of the warehouse module.
  "RAW_MATERIAL_WITHDRAWAL",
]

export type AccessInfo = {
  userId: string
  role: string
  isSuperAdmin: boolean
  modules: string[]
  branchName: string | null
  unitId: string | null
  unitName: string | null
  name: string | null
}

// Module access MUST be read live from the DB, never from the session JWT:
// the JWT snapshots modules at login and goes stale the moment an admin
// edits a user's access. The session role is still OR-ed in because the
// IT-unit elevation (effectiveRole) only exists on the session.
//
// Cached per-request (React cache()) so nested layouts/pages that each call
// this share one auth()+DB lookup instead of repeating it down the tree.
export const getAccessInfo = cache(async (): Promise<AccessInfo | null> => {
  const session = await getSession()
  if (!session?.user?.id) return null

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      role: true,
      modules: true,
      unitId: true,
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
    unitId: dbUser?.unitId || null,
    unitName: dbUser?.unit?.name || (session.user as any).unitName || null,
    name: dbUser?.name || session.user.name || null,
  }
})

export function hasAnyModule(access: AccessInfo, required: string[]): boolean {
  return access.isSuperAdmin || required.some(m => access.modules.includes(m))
}
