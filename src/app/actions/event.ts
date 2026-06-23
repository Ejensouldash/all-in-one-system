"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

export async function createEvent(formData: FormData) {
  const session = await auth()
  if (session?.user.role !== "SUPERADMIN") return { success: false, error: "Unauthorized" }

  const title = formData.get("title") as string
  const description = formData.get("description") as string
  const startDateStr = formData.get("startDateTime") as string
  const endDateStr = formData.get("endDateTime") as string
  const assigneeId = formData.get("assigneeId") as string

  if (!title || !startDateStr || !endDateStr) {
    return { success: false, error: "Missing required fields" }
  }

  const startDateTime = new Date(startDateStr)
  const endDateTime = new Date(endDateStr)

  if (endDateTime <= startDateTime) {
    return { success: false, error: "End time must be after start time" }
  }

  try {
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
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteEvent(id: string) {
  const session = await auth()
  if (session?.user.role !== "SUPERADMIN") return { success: false, error: "Unauthorized" }

  try {
    await prisma.event.delete({ where: { id } })
    revalidatePath("/calendar")
    revalidatePath("/dashboard")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
