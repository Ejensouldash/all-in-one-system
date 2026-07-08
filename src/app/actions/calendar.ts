"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import {
  isGoogleConfigured,
  createGoogleEvent,
  updateGoogleEvent,
  deleteGoogleEvent,
  testGoogleCalendar,
  type GoogleDiagnostic,
} from "@/lib/google-calendar"

type ActionResult = { success: boolean; error?: string; warning?: string }

const RSVP_STATUSES = ["PENDING", "GOING", "MAYBE", "DECLINED"] as const

/**
 * Malaysia Standard Time is a fixed GMT+8 (no daylight saving).
 * A <input type="datetime-local"> gives a wall-clock string like "2026-07-09T09:00"
 * with NO timezone. If we parse it with `new Date()` it is interpreted in the
 * SERVER's timezone (UTC on Vercel), which shifts every time by 8 hours.
 * We instead interpret the value explicitly as Malaysia time and store the
 * correct UTC instant, so it is consistent regardless of where the code runs.
 */
const MYT_OFFSET_MIN = 8 * 60

function parseLocalToUtc(raw: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(raw || "")
  if (!m) return new Date(raw) // already has offset info, or invalid -> let Date handle it
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  const h = Number(m[4])
  const mi = Number(m[5])
  return new Date(Date.UTC(y, mo - 1, d, h, mi) - MYT_OFFSET_MIN * 60000)
}

/**
 * Parse and validate the shared event fields coming from a calendar form.
 */
function parseEventForm(data: FormData) {
  const title = (data.get("title") as string)?.trim()
  const description = (data.get("description") as string)?.trim() || null
  const startRaw = data.get("startDateTime") as string
  const endRaw = data.get("endDateTime") as string
  const assigneeId = (data.get("assigneeId") as string) || null

  if (!title) return { ok: false as const, error: "Event title is required." }
  if (!startRaw || !endRaw) return { ok: false as const, error: "Start and end time are required." }

  const startDateTime = parseLocalToUtc(startRaw)
  const endDateTime = parseLocalToUtc(endRaw)

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

/** Resolve invited user ids to the email Google should invite (googleEmail preferred). */
async function getAttendeeEmails(attendeeIds: string[]): Promise<string[]> {
  if (!attendeeIds.length) return []
  const users = await prisma.user.findMany({
    where: { id: { in: attendeeIds } },
    select: { email: true, googleEmail: true },
  })
  return users.map((u) => u.googleEmail || u.email).filter(Boolean) as string[]
}

export async function addEvent(data: FormData): Promise<ActionResult> {
  const session = await auth()
  if (!session || session.user.role !== "SUPERADMIN") return { success: false, error: "Unauthorized" }

  const parsed = parseEventForm(data)
  if (!parsed.ok) return { success: false, error: parsed.error }

  const attendeeIds = parseAttendeeIds(data)

  let warning: string | undefined
  try {
    const created = await prisma.event.create({
      data: {
        ...parsed.values,
        createdById: session.user.id,
        attendees: attendeeIds.length
          ? { create: attendeeIds.map((userId) => ({ userId, status: "PENDING" })) }
          : undefined,
      },
    })

    // Best-effort Google Calendar sync (never blocks saving locally)
    if (isGoogleConfigured()) {
      try {
        const gid = await createGoogleEvent({
          title: parsed.values.title,
          description: parsed.values.description ?? undefined,
          startDateTime: parsed.values.startDateTime,
          endDateTime: parsed.values.endDateTime,
          attendeeEmails: await getAttendeeEmails(attendeeIds),
        })
        if (gid) await prisma.event.update({ where: { id: created.id }, data: { googleEventId: gid } })
      } catch (e: any) {
        warning = `Event saved, but Google Calendar sync failed: ${e?.message || "unknown error"}`
      }
    }

    revalidatePath("/calendar")
    revalidatePath("/dashboard")
    return { success: true, warning }
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

  let warning: string | undefined
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

    // Best-effort Google Calendar sync
    if (isGoogleConfigured()) {
      try {
        const ev = await prisma.event.findUnique({ where: { id }, select: { googleEventId: true } })
        const payload = {
          title: parsed.values.title,
          description: parsed.values.description ?? undefined,
          startDateTime: parsed.values.startDateTime,
          endDateTime: parsed.values.endDateTime,
          attendeeEmails: await getAttendeeEmails(attendeeIds),
        }
        if (ev?.googleEventId) {
          const ok = await updateGoogleEvent(ev.googleEventId, payload)
          if (!ok) warning = "Event updated, but Google Calendar sync failed. Use 'Test connection' for details."
        } else {
          const gid = await createGoogleEvent(payload)
          if (gid) await prisma.event.update({ where: { id }, data: { googleEventId: gid } })
        }
      } catch (e: any) {
        warning = `Event updated, but Google Calendar sync failed: ${e?.message || "unknown error"}`
      }
    }

    revalidatePath("/calendar")
    revalidatePath("/dashboard")
    return { success: true, warning }
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to update event." }
  }
}

export async function deleteEvent(id: string): Promise<ActionResult> {
  const session = await auth()
  if (!session || session.user.role !== "SUPERADMIN") return { success: false, error: "Unauthorized" }
  if (!id) return { success: false, error: "Missing event id." }

  try {
    const ev = await prisma.event.findUnique({ where: { id }, select: { googleEventId: true } })
    await prisma.event.delete({ where: { id } })

    if (isGoogleConfigured() && ev?.googleEventId) {
      try {
        await deleteGoogleEvent(ev.googleEventId)
      } catch {
        // Non-fatal: local delete already succeeded
      }
    }

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

/** Diagnostic used by the "Test connection" button in the calendar sidebar. */
export async function testGoogleCalendarConnection(): Promise<GoogleDiagnostic> {
  const session = await auth()
  if (!session || session.user.role !== "SUPERADMIN") {
    return {
      configured: false,
      ok: false,
      serviceAccount: null,
      calendarId: "",
      error: "Unauthorized",
    }
  }
  return testGoogleCalendar()
}
