"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

type ActionResult = { success: boolean; error?: string }

const RSVP_STATUSES = ["PENDING", "GOING", "MAYBE", "DECLINED"] as const

/**
 * Parse and validate the shared event fields coming from a calendar form.
 * Returns either the parsed values or an error message.
 */
function parseEventForm(data: FormData) {
  const title = (data.get("title") as string)?.trim()
  const description = (data.get("description") as string)?.trim() || null
  const startRaw = data.get("startDateTime") as string
  const endRaw = data.get("endDateTime") as string
  const assigneeId = (data.get("assigneeId") as string) || null

  if (!title) return { ok: false as const, error: "Event title is required." }
  if (!startRaw || !endRaw) return { ok: false as const, error: "Start and end time are required." }

  const startDateTime = new Date(startRaw)
  const endDateTime = new Date(endRaw)

  if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
    return { ok: false as const, error: "Please provide a valid start and end time." }
  }
  if (endDateTime < startDateTime) {
    return { ok: false as const, error: "End time cannot be before the start time." }
  }

  return {
    ok: true as const,
    values: { title, description, startDateTime, endDateTime, assigneeId },
  }
}

/** Unique, non-empty list of invited user ids from the form. */
function parseAttendeeIds(data: FormData): string[] {
  const ids = (data.getAll("attendeeIds") as string[]).filter(Boolean)
  return Array.from(new Set(ids))
}

export async function addEvent(data: FormData): Promise<ActionResult> {
  const session = await auth()
  if (!session || session.user.role !== "SUPERADMIN") return { success: false, error: "Unauthorized" }

  const parsed = parseEventForm(data)
  if (!parsed.ok) return { success: false, error: parsed.error }

  const attendeeIds = parseAttendeeIds(data)

  try {
    await prisma.event.create({
      data: {
        ...parsed.values,
        createdById: session.user.id,
        attendees: attendeeIds.length
          ? { create: attendeeIds.map((userId) => ({ userId, status: "PENDING" })) }
          : undefined,
      },
    })
    revalidatePath("/calendar")
    revalidatePath("/dashboard")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to create event." }
  }
}

export async function updateEvent(id: string, data: FormData): Promise<ActionResult> {
  const session = await auth()
  if (!session || session.user.role !== "SUPERADMIN") return { success: false, error: "Unauthorized" }
  if (!id) return { success: false, error: "Missing event id." }

  const parsed = parseEventForm(data)
  if (!parsed.ok) return { success: false, error: parsed.error }

  const attendeeIds = parseAttendeeIds(data)

  try {
    const existing = await prisma.eventAttendee.findMany({
      where: { eventId: id },
      select: { userId: true },
    })
    const existingIds = existing.map((a) => a.userId)
    const toAdd = attendeeIds.filter((uid) => !existingIds.includes(uid))
    const toRemove = existingIds.filter((uid) => !attendeeIds.includes(uid))

    await prisma.$transaction([
      prisma.event.update({ where: { id }, data: parsed.values }),
      ...(toRemove.length
        ? [prisma.eventAttendee.deleteMany({ where: { eventId: id, userId: { in: toRemove } } })]
        : []),
      ...(toAdd.length
        ? [
            prisma.eventAttendee.createMany({
              data: toAdd.map((userId) => ({ eventId: id, userId, status: "PENDING" })),
              skipDuplicates: true,
            }),
          ]
        : []),
    ])

    revalidatePath("/calendar")
    revalidatePath("/dashboard")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to update event." }
  }
}

export async function deleteEvent(id: string): Promise<ActionResult> {
  const session = await auth()
  if (!session || session.user.role !== "SUPERADMIN") return { success: false, error: "Unauthorized" }
  if (!id) return { success: false, error: "Missing event id." }

  try {
    await prisma.event.delete({ where: { id } })
    revalidatePath("/calendar")
    revalidatePath("/dashboard")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to delete event." }
  }
}

/** RSVP: the current user sets their own attendance status for an event. */
export async function respondToInvite(eventId: string, status: string): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: "Unauthorized" }
  if (!eventId) return { success: false, error: "Missing event id." }
  if (!RSVP_STATUSES.includes(status as any)) return { success: false, error: "Invalid status." }

  try {
    await prisma.eventAttendee.upsert({
      where: { eventId_userId: { eventId, userId: session.user.id } },
      update: { status },
      create: { eventId, userId: session.user.id, status },
    })
    revalidatePath("/calendar")
    revalidatePath("/dashboard")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to update your response." }
  }
}
