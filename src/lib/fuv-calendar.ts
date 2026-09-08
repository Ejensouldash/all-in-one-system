import * as ics from "ics"

export interface FUVCalendarInviteParams {
  slotTime: string
  shift: "DAY" | "NIGHT"
  dateStr?: string
  targetDate?: Date
  attendees: string[]
  formUrl: string
  senderEmail?: string
}

export interface FUVCalendarResult {
  icsContent: string | null
  googleCalendarUrl: string
  startUtcStr: string
  endUtcStr: string
}

/**
 * Parse slot time string (e.g. "11.30 AM", "01.30 PM", "7:30 AM") into hour and minute (24-hour format).
 */
export function parseSlotTimeToHourMinute(slotStr: string): { hour: number; minute: number } {
  const clean = slotStr.toUpperCase().replace(/\s+/g, " ")
  const isPM = clean.includes("PM")
  const isAM = clean.includes("AM")

  const match = clean.match(/(\d{1,2})[:.](\d{2})/)
  let hour = 8
  let minute = 0

  if (match) {
    hour = parseInt(match[1], 10)
    minute = parseInt(match[2], 10)

    if (isPM && hour < 12) {
      hour += 12
    } else if (isAM && hour === 12) {
      hour = 0
    }
  }

  return { hour, minute }
}

/**
 * Convert Malaysia local date/time (UTC+8) to UTC Date objects.
 */
export function getSlotUtcDateRange(
  slotStr: string,
  baseDate?: Date
): { startDate: Date; endDate: Date } {
  const now = baseDate || new Date()

  const klParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(now)

  const year = parseInt(klParts.find((p) => p.type === "year")?.value || String(now.getFullYear()), 10)
  const month = parseInt(klParts.find((p) => p.type === "month")?.value || String(now.getMonth() + 1), 10) - 1
  const day = parseInt(klParts.find((p) => p.type === "day")?.value || String(now.getDate()), 10)

  const { hour, minute } = parseSlotTimeToHourMinute(slotStr)

  // In MYT (UTC+8), hourUTC = hour - 8
  const startDate = new Date(Date.UTC(year, month, day, hour - 8, minute, 0))
  // Event duration: 30 minutes
  const endDate = new Date(startDate.getTime() + 30 * 60 * 1000)

  return { startDate, endDate }
}

/**
 * Format a Date object to Google Calendar ISO UTC string: YYYYMMDDTHHmmssZ
 */
export function formatToGoogleCalendarUtc(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  )
}

/**
 * Build 1-Click Google Calendar Action URL.
 */
export function buildGoogleCalendarUrl({
  title,
  startDate,
  endDate,
  details,
  location,
  attendees,
}: {
  title: string
  startDate: Date
  endDate: Date
  details: string
  location: string
  attendees: string[]
}): string {
  const startStr = formatToGoogleCalendarUtc(startDate)
  const endStr = formatToGoogleCalendarUtc(endDate)

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${startStr}/${endStr}`,
    details,
    location,
  })

  if (attendees.length > 0) {
    params.set("add", attendees.join(","))
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/**
 * Generate RFC 5545 iCalendar (.ics) content and 1-Click URL for FUV Inspection alerts.
 */
export function generateFUVCalendarInvite({
  slotTime,
  shift,
  dateStr,
  targetDate,
  attendees,
  formUrl,
  senderEmail = "alerts@bubbleso2.com",
}: FUVCalendarInviteParams): FUVCalendarResult {
  const { startDate, endDate } = getSlotUtcDateRange(slotTime, targetDate)

  const startArr: [number, number, number, number, number] = [
    startDate.getUTCFullYear(),
    startDate.getUTCMonth() + 1,
    startDate.getUTCDate(),
    startDate.getUTCHours(),
    startDate.getUTCMinutes(),
  ]

  const endArr: [number, number, number, number, number] = [
    endDate.getUTCFullYear(),
    endDate.getUTCMonth() + 1,
    endDate.getUTCDate(),
    endDate.getUTCHours(),
    endDate.getUTCMinutes(),
  ]

  const title = `📋 Pemeriksaan Loji FUV (Slot ${slotTime})`
  const shiftText = shift === "DAY" ? "Syif Siang (07:30 AM - 05:30 PM)" : "Syif Malam (07:30 PM - 05:30 AM)"
  const location = "Loji Rawatan Air BubblesO2, Rantau Panjang"

  const description =
    `Pemeriksaan Berkala SGMP/19/FUV (Hazard & Process Control Records).\n\n` +
    `Slot Masa: ${slotTime}\n` +
    `Syif: ${shiftText}\n` +
    `Peringatan CCP: Semak Tekanan PG02 (Max 3.0 Bar), PG05 (Max 2.0 Bar), dan UV Intensity (80% - 99%).\n\n` +
    `📝 Buka Borang Pemeriksaan: ${formUrl}`

  // Build Attendees list for ICS
  const icsAttendees: ics.Attendee[] = attendees
    .filter((e) => e && e.includes("@"))
    .map((email) => ({
      name: email.split("@")[0],
      email: email.trim(),
      rsvp: true,
      partstat: "NEEDS-ACTION",
      role: "REQ-PARTICIPANT",
    }))

  const dateTag = `${startDate.getUTCFullYear()}${String(startDate.getUTCMonth() + 1).padStart(2, "0")}${String(startDate.getUTCDate()).padStart(2, "0")}`
  const timeTag = slotTime.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()
  const uid = `fuv-${dateTag}-${timeTag}@bubbleso2.com`

  const eventAttributes: ics.EventAttributes = {
    title,
    description,
    location,
    start: startArr,
    end: endArr,
    startInputType: "utc",
    endInputType: "utc",
    startOutputType: "utc",
    endOutputType: "utc",
    status: "CONFIRMED",
    busyStatus: "BUSY",
    method: "REQUEST",
    productId: "-//BubblesO2//SGMP19 FUV System//MS",
    calName: "BubblesO2 FUV Inspection",
    uid,
    organizer: {
      name: "BubblesO2 Plant System",
      email: senderEmail,
    },
    attendees: icsAttendees,
    alarms: [
      {
        action: "display",
        description: `Peringatan: 10 minit sebelum slot pemeriksaan FUV (${slotTime})`,
        trigger: { minutes: 10, before: true },
      },
    ],
  }

  const { error, value } = ics.createEvent(eventAttributes)
  if (error) {
    console.error("Error creating FUV ICS event:", error)
  }

  const googleCalendarUrl = buildGoogleCalendarUrl({
    title,
    startDate,
    endDate,
    details: description,
    location,
    attendees,
  })

  return {
    icsContent: value || null,
    googleCalendarUrl,
    startUtcStr: formatToGoogleCalendarUtc(startDate),
    endUtcStr: formatToGoogleCalendarUtc(endDate),
  }
}

/**
 * Generate RFC 5545 iCalendar (.ics) and Google Calendar 1-Click URL for Preventive Maintenance (PM) tasks.
 */
export function generatePMTaskCalendarInvite({
  equipment,
  dueDateStr,
  srs,
  checklist,
  formUrl,
  attendees,
  senderEmail = "alerts@bubbleso2.com",
}: {
  equipment: string
  dueDateStr: string
  srs?: string | null
  checklist: string[]
  formUrl: string
  attendees: string[]
  senderEmail?: string
}): { icsContent: string | null; googleCalendarUrl: string } {
  const parts = dueDateStr.split("-")
  const year = parseInt(parts[0], 10) || new Date().getFullYear()
  const month = (parseInt(parts[1], 10) || 1) - 1
  const day = parseInt(parts[2], 10) || 1

  // Set start time to 09:00 AM MYT (01:00 UTC)
  const startDate = new Date(Date.UTC(year, month, day, 1, 0, 0))
  // 1-hour duration: 10:00 AM MYT (02:00 UTC)
  const endDate = new Date(Date.UTC(year, month, day, 2, 0, 0))

  const title = `🔧 Pemeriksaan PM: ${equipment}`
  const location = "Loji Rawatan Air & Pengeluaran BubblesO2"

  const description =
    `Preventive Maintenance (SGMP-03)\n\n` +
    `Peralatan: ${equipment}\n` +
    `${srs ? `SRS: ${srs}\n` : ""}` +
    `Tarikh Jadual: ${dueDateStr}\n\n` +
    `Arahan Kerja / Checklist:\n` +
    checklist.map((c, i) => `${i + 1}. ${c}`).join("\n") +
    `\n\n📝 Buka & Rekod Pemeriksaan: ${formUrl}`

  const icsAttendees: ics.Attendee[] = attendees
    .filter((e) => e && e.includes("@"))
    .map((email) => ({
      name: email.split("@")[0],
      email: email.trim(),
      rsvp: true,
      partstat: "NEEDS-ACTION",
      role: "REQ-PARTICIPANT",
    }))

  const dateTag = dueDateStr.replace(/-/g, "")
  const uid = `pm-${dateTag}-${equipment.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()}@bubbleso2.com`

  const eventAttributes: ics.EventAttributes = {
    title,
    description,
    location,
    start: [year, month + 1, day, 1, 0],
    end: [year, month + 1, day, 2, 0],
    startInputType: "utc",
    endInputType: "utc",
    startOutputType: "utc",
    endOutputType: "utc",
    status: "CONFIRMED",
    busyStatus: "BUSY",
    method: "REQUEST",
    productId: "-//BubblesO2//SGMP03 PM System//MS",
    calName: "BubblesO2 Preventive Maintenance",
    uid,
    organizer: {
      name: "BubblesO2 Maintenance",
      email: senderEmail,
    },
    attendees: icsAttendees,
    alarms: [
      {
        action: "display",
        description: `Peringatan: Jadual pemeriksaan ${equipment} pada hari ini`,
        trigger: { hours: 1, before: true },
      },
    ],
  }

  const { error, value } = ics.createEvent(eventAttributes)
  if (error) {
    console.error("Error creating PM ICS event:", error)
  }

  const googleCalendarUrl = buildGoogleCalendarUrl({
    title,
    startDate,
    endDate,
    details: description,
    location,
    attendees,
  })

  return {
    icsContent: value || null,
    googleCalendarUrl,
  }
}

