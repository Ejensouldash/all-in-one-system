"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

async function verifySuperAdmin() {
  const session = await auth()
  if (!session) return false
  const user = session.user as any
  return user.trueRole === "SUPERADMIN" || (user.modules || []).includes("DATABASE_MANAGER")
}

export async function deleteDailyReports(ids: string[]) {
  const isSuperAdmin = await verifySuperAdmin()
  if (!isSuperAdmin) return { success: false, error: "Unauthorized. Superadmin only." }

  try {
    // Prisma will cascade delete productions, rejects, and inventory because of onDelete: Cascade
    await prisma.dailyReport.deleteMany({
      where: {
        id: { in: ids }
      }
    })
    return { success: true }
  } catch (error: any) {
    console.error("Failed to delete Daily Reports:", error)
    return { success: false, error: error.message }
  }
}

export async function deleteTransferIns(ids: string[]) {
  const isSuperAdmin = await verifySuperAdmin()
  if (!isSuperAdmin) return { success: false, error: "Unauthorized. Superadmin only." }

  try {
    // Prisma will cascade delete TransferInItems because of onDelete: Cascade
    await prisma.transferIn.deleteMany({
      where: {
        id: { in: ids }
      }
    })
    return { success: true }
  } catch (error: any) {
    console.error("Failed to delete Transfer Ins:", error)
    return { success: false, error: error.message }
  }
}
