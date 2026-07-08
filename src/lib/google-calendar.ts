import { google } from "googleapis"

const SCOPES = ["https://www.googleapis.com/auth/calendar"]

// Ensure the private key is formatted correctly (handles escaped newlines in env vars)
const getPrivateKey = () => {
  const key = process.env.GOOGLE_PRIVATE_KEY
  if (!key) return ""
  return key.replace(/\\n/g, "\n")
}

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: getPrivateKey(),
  },
  scopes: SCOPES,
})

const calendar = google.calendar({ version: "v3", auth })

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || "primary"

export function isGoogleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY)
}

export type GoogleEventInput = {
  title: string
  description?: string
  startDateTime: Date
  endDateTime: Date
  attendeeEmails?: string[]
}

function buildRequestBody(event: GoogleEventInput, withAttendees: boolean) {
  const attendees = withAttendees
    ? event.attendeeEmails?.filter((e) => e && e.includes("@")).map((email) => ({ email }))
    : undefined
  return {
    summary: event.title,
    description: event.description,
    start: { dateTime: event.startDateTime.toISOString(), timeZone: "Asia/Kuala_Lumpur" },
    end: { dateTime: event.endDateTime.toISOString(), timeZone: "Asia/Kuala_Lumpur" },
    attendees,
  }
}

/**
 * A plain service account (without Google Workspace domain-wide delegation)
 * is not allowed to invite attendees. Detect that specific failure so we can
 * retry without attendees instead of failing the whole sync.
 */
function isAttendeeDelegationError(err: any): boolean {
  const msg = `${err?.message || ""} ${JSON.stringify(err?.errors || err?.response?.data || "")}`.toLowerCase()
  return (
    msg.includes("domain-wide delegation") ||
    msg.includes("forbiddenforserviceaccounts") ||
    msg.includes("cannot invite attendees")
  )
}

export async function createGoogleEvent(event: GoogleEventInput): Promise<string | null> {
  if (!isGoogleConfigured()) {
    throw new Error("Google Calendar credentials are not configured (GOOGLE_CLIENT_EMAIL / GOOGLE_PRIVATE_KEY).")
  }

  try {
    const res = await calendar.events.insert({
      calendarId: CALENDAR_ID,
      sendUpdates: "all", // email the guests
      requestBody: buildRequestBody(event, true),
    })
    return res.data.id ?? null
  } catch (error: any) {
    if (isAttendeeDelegationError(error)) {
      // Retry without attendees so the event still lands on the calendar.
      const res = await calendar.events.insert({
        calendarId: CALENDAR_ID,
        sendUpdates: "none",
        requestBody: buildRequestBody(event, false),
      })
      return res.data.id ?? null
    }
    console.error("Error creating Google Calendar event:", error?.message)
    throw new Error(error?.message || "Unknown Google Calendar error")
  }
}

export async function updateGoogleEvent(googleEventId: string, event: GoogleEventInput): Promise<boolean> {
  if (!isGoogleConfigured() || !googleEventId) return false

  try {
    await calendar.events.update({
      calendarId: CALENDAR_ID,
      eventId: googleEventId,
      sendUpdates: "all",
      requestBody: buildRequestBody(event, true),
    })
    return true
  } catch (error: any) {
    if (isAttendeeDelegationError(error)) {
      try {
        await calendar.events.update({
          calendarId: CALENDAR_ID,
          eventId: googleEventId,
          sendUpdates: "none",
          requestBody: buildRequestBody(event, false),
        })
        return true
      } catch (e: any) {
        console.error("Error updating Google Calendar event:", e?.message)
        return false
      }
    }
    console.error("Error updating Google Calendar event:", error?.message)
    return false
  }
}

export async function deleteGoogleEvent(googleEventId: string): Promise<boolean> {
  if (!isGoogleConfigured() || !googleEventId) return false

  try {
    await calendar.events.delete({
      calendarId: CALENDAR_ID,
      eventId: googleEventId,
      sendUpdates: "all",
    })
    return true
  } catch (error: any) {
    const code = error?.code || error?.response?.status
    if (code === 404 || code === 410) return true // already gone
    console.error("Error deleting Google Calendar event:", error?.message)
    return false
  }
}

export type GoogleDiagnostic = {
  configured: boolean
  ok: boolean
  serviceAccount: string | null
  calendarId: string
  calendarName?: string | null
  error?: string
  hint?: string
}

/**
 * Lightweight connectivity check that returns the REAL reason a connection
 * fails (bad key, calendar not shared, API disabled, etc.) so it can be shown
 * in the UI. Runs on the server where the Vercel env vars live.
 */
export async function testGoogleCalendar(): Promise<GoogleDiagnostic> {
  const serviceAccount = process.env.GOOGLE_CLIENT_EMAIL || null
  const calendarId = CALENDAR_ID

  if (!isGoogleConfigured()) {
    return {
      configured: false,
      ok: false,
      serviceAccount,
      calendarId,
      error: "Missing GOOGLE_CLIENT_EMAIL and/or GOOGLE_PRIVATE_KEY.",
      hint: "Add them in Vercel → Settings → Environment Variables, then redeploy.",
    }
  }

  try {
    const res = await calendar.calendars.get({ calendarId })
    const isPrimary = calendarId === "primary"
    return {
      configured: true,
      ok: true,
      serviceAccount,
      calendarId,
      calendarName: res.data.summary ?? null,
      hint: isPrimary
        ? `Connected, but GOOGLE_CALENDAR_ID is "primary" — events go to the service account's OWN calendar, which you can't see. Create a calendar, share it with ${serviceAccount} (Make changes to events), and set GOOGLE_CALENDAR_ID to that calendar's ID.`
        : undefined,
    }
  } catch (error: any) {
    const msg = error?.message || "Unknown error"
    const low = msg.toLowerCase()
    let hint = ""
    if (low.includes("not found") || low.includes("notfound")) {
      hint = `Calendar "${calendarId}" not found or not shared with ${serviceAccount}. Share the calendar with that service-account email (Make changes to events) and set GOOGLE_CALENDAR_ID to its ID.`
    } else if (
      low.includes("invalid_grant") ||
      low.includes("invalid jwt") ||
      low.includes("decoding") ||
      low.includes("pem") ||
      low.includes("private key")
    ) {
      hint = "GOOGLE_PRIVATE_KEY looks malformed. Paste the whole key including the BEGIN/END lines (escaped \\n are handled automatically)."
    } else if (low.includes("has not been used") || low.includes("disabled") || low.includes("accessnotconfigured")) {
      hint = "Enable the Google Calendar API for this project in Google Cloud Console, then wait a minute and retry."
    }
    return { configured: true, ok: false, serviceAccount, calendarId, error: msg, hint }
  }
}
