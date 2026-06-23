"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

export async function getCostCatalog() {
  return prisma.costCatalog.findMany({
    orderBy: { itemName: 'asc' }
  })
}

export async function addCostItem(data: FormData) {
  const session = await auth()
  if (!session || session.user.role !== "SUPERADMIN") return { error: "Unauthorized" }

  const itemName = data.get("itemName") as string
  const description = data.get("description") as string
  const defaultCost = parseFloat(data.get("defaultCost") as string)

  if (!itemName || isNaN(defaultCost)) return { error: "Invalid data" }

  await prisma.costCatalog.create({
    data: { itemName, description, defaultCost }
  })

  revalidatePath("/organization")
  return { success: true }
}

export async function deleteCostItem(id: string) {
  const session = await auth()
  if (!session || session.user.role !== "SUPERADMIN") return { error: "Unauthorized" }

  await prisma.costCatalog.delete({ where: { id } })
  revalidatePath("/organization")
  return { success: true }
}
