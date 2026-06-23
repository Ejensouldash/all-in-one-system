"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

export async function createBranch(formData: FormData) {
  const session = await auth()
  if (session?.user.role !== "SUPERADMIN") return { success: false, error: "Unauthorized" }

  const name = formData.get("name") as string
  const location = formData.get("location") as string

  if (!name) return { success: false, error: "Branch name is required" }

  try {
    await prisma.branch.create({ data: { name, location: location || null } })
    revalidatePath("/organization")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteBranch(id: string) {
  const session = await auth()
  if (session?.user.role !== "SUPERADMIN") return { success: false, error: "Unauthorized" }

  try {
    // STRICT Option A: Prevent deletion if linked data exists
    const linkedUnits = await prisma.unit.count({ where: { branchId: id } })
    const linkedUsers = await prisma.user.count({ where: { branchId: id } })

    if (linkedUnits > 0 || linkedUsers > 0) {
      return { success: false, error: `Cannot delete branch. It has ${linkedUnits} units and ${linkedUsers} users assigned to it.` }
    }

    await prisma.branch.delete({ where: { id } })
    revalidatePath("/organization")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function createUnit(formData: FormData) {
  const session = await auth()
  if (session?.user.role !== "SUPERADMIN") return { success: false, error: "Unauthorized" }

  const name = formData.get("name") as string
  const branchId = formData.get("branchId") as string

  if (!name || !branchId) return { success: false, error: "Unit name and Branch are required" }

  try {
    await prisma.unit.create({ data: { name, branchId } })
    revalidatePath("/organization")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteUnit(id: string) {
  const session = await auth()
  if (session?.user.role !== "SUPERADMIN") return { success: false, error: "Unauthorized" }

  try {
    // STRICT Option A: Prevent deletion if linked data exists
    const linkedUsers = await prisma.user.count({ where: { unitId: id } })
    const linkedTickets = await prisma.ticket.count({ where: { unitId: id } })
    const linkedAssets = await prisma.asset.count({ where: { unitId: id } })

    if (linkedUsers > 0 || linkedTickets > 0 || linkedAssets > 0) {
      return { success: false, error: `Cannot delete unit. It has ${linkedUsers} users, ${linkedTickets} tickets, and ${linkedAssets} assets linked to it.` }
    }

    await prisma.unit.delete({ where: { id } })
    revalidatePath("/organization")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

