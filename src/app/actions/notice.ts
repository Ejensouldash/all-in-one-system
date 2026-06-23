"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function createNotice(formData: FormData) {
  const session = await auth()
  if (session?.user.role !== "SUPERADMIN") throw new Error("Unauthorized")

  const message = formData.get("message") as string
  const type = formData.get("type") as string
  const targetAudience = formData.get("targetAudience") as string

  if (!message) throw new Error("Message is required")

  await prisma.notice.create({
    data: {
      message,
      type: type || "NORMAL",
      targetAudience: targetAudience || "ALL",
      isActive: true,
      createdById: session.user.id
    }
  })

  revalidatePath("/", "layout")
}

export async function toggleNotice(id: string, isActive: boolean) {
  const session = await auth()
  if (session?.user.role !== "SUPERADMIN") throw new Error("Unauthorized")

  await prisma.notice.update({
    where: { id },
    data: { isActive }
  })

  revalidatePath("/", "layout")
}

export async function deleteNotice(id: string) {
  const session = await auth()
  if (session?.user.role !== "SUPERADMIN") throw new Error("Unauthorized")

  await prisma.notice.delete({
    where: { id }
  })

  revalidatePath("/", "layout")
}

export async function getActiveNotices(userUnitId?: string | null) {
  // Fetch notices that are active and either target ALL or the user's specific unit
  const conditions: any[] = [{ targetAudience: "ALL" }]
  if (userUnitId) {
    conditions.push({ targetAudience: userUnitId })
  }

  return await prisma.notice.findMany({
    where: {
      isActive: true,
      OR: conditions
    },
    orderBy: { createdAt: 'desc' }
  })
}
