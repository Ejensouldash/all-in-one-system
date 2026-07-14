"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath, unstable_cache, revalidateTag } from "next/cache"

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

  revalidateTag("notices", "max")
  revalidatePath("/", "layout")
}

export async function toggleNotice(id: string, isActive: boolean) {
  const session = await auth()
  if (session?.user.role !== "SUPERADMIN") throw new Error("Unauthorized")

  await prisma.notice.update({
    where: { id },
    data: { isActive }
  })

  revalidateTag("notices", "max")
  revalidatePath("/", "layout")
}

export async function deleteNotice(id: string) {
  const session = await auth()
  if (session?.user.role !== "SUPERADMIN") throw new Error("Unauthorized")

  await prisma.notice.delete({
    where: { id }
  })

  revalidateTag("notices", "max")
  revalidatePath("/", "layout")
}

const getCachedActiveNotices = unstable_cache(
  async (userUnitId?: string | null) => {
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
  },
  ["active-notices-cache"],
  { revalidate: 300, tags: ["notices"] }
)

export async function getActiveNotices(userUnitId?: string | null) {
  return getCachedActiveNotices(userUnitId)
}
