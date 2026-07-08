"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { createGoogleEvent, deleteGoogleEvent } from "@/lib/google-calendar"

export async function createEvent(formData: FormData) {
  const session = await auth()
  if (session?.user.role !== "SUPERADMIN") return { success: false, error: "Unauthorized" }

  const title = formData.get("title") as string
  const description = formData.get("description") as string
  const startDateStr = formData.get("startDateTime") as string
  const endDateStr = formData.get("endDateTime") as string
  const assigneeId = formData.get("assigneeId") as string
  const attendeeIds = formData.getAll("attendeeIds") as string[]

  if (!title || !startDateStr || !endDateStr) {
    return { success: false, error: "Missing required fields" }
  }

  const startDateTime = new Date(startDateStr)
  const endDateTime = new Date(endDateStr)

  if (endDateTime <= startDateTime) {
    return { success: false, error: "End time must be after start time" }
  }

  try {
    // Collect attendee emails for Google Calendar invites
    let attendeeEmails: string[] = []
    
    // Add creator's email if they have one
    const creator = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (creator?.googleEmail) attendeeEmails.push(creator.googleEmail)
    
    // Add assignee's email if assigned
    if (assigneeId) {
      const assignee = await prisma.user.findUnique({ where: { id: assigneeId } })
      if (assignee?.googleEmail) attendeeEmails.push(assignee.googleEmail)
    }

    // Add additional attendees from form
    if (attendeeIds.length > 0) {
      const attendeesData = await prisma.user.findMany({
        where: { id: { in: attendeeIds } },
        select: { googleEmail: true }
      })
      attendeesData.forEach(user => {
        if (user.googleEmail) attendeeEmails.push(user.googleEmail)
      })
    }

    // 1. Sync with Google Calendar
    const googleEventId = await createGoogleEvent({
      title,
      description,
      startDateTime,
      endDateTime,
      attendeeEmails
    })

    // 2. Save to database
    await prisma.event.create({
      data: {
        title,
        description,
        startDateTime,
        endDateTime,
        assigneeId: assigneeId || null,
        createdById: session.user.id,
        googleEventId: googleEventId,
        attendees: {
          create: attendeeIds.map(id => ({ userId: id }))
        }
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
    const event = await prisma.event.findUnique({ where: { id } })
    if (event?.googleEventId) {
      await deleteGoogleEvent(event.googleEventId)
    }

    await prisma.event.delete({ where: { id } })
    revalidatePath("/calendar")
    revalidatePath("/dashboard")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
