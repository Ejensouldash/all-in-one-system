"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

export async function addEvent(data: FormData) {
  const session = await auth()
  if (!session || session.user.role !== "SUPERADMIN") throw new Error("Unauthorized")

  const title = data.get("title") as string
  const description = data.get("description") as string
  const startDateTime = new Date(data.get("startDateTime") as string)
  const endDateTime = new Date(data.get("endDateTime") as string)
  const assigneeId = data.get("assigneeId") as string

  if (!title || !startDateTime || !endDateTime) throw new Error("Missing required fields")

  await prisma.event.create({
    data: {
      title,
      description,
      startDateTime,
      endDateTime,
      assigneeId: assigneeId || null,
      createdById: session.user.id
    }
  })

  revalidatePath("/calendar")
  revalidatePath("/dashboard")
  return { success: true }
}
