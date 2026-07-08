import { google } from "googleapis"

const SCOPES = ["https://www.googleapis.com/auth/calendar"]

// Ensure the private key is formatted correctly (handles newlines in env vars)
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

export type GoogleEventInput = {
  title: string
  description?: string
  startDateTime: Date
  endDateTime: Date
  attendeeEmails?: string[]
}

export async function createGoogleEvent(event: GoogleEventInput) {
  if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    throw new Error("Google Calendar credentials are not configured in Vercel Environment Variables.")
  }

  try {
    const attendees = event.attendeeEmails
      ?.filter(email => email && email.includes("@"))
      .map(email => ({ email }))

    const res = await calendar.events.insert({
      calendarId: CALENDAR_ID,
      sendUpdates: "all", // Sends email invites to attendees
      requestBody: {
        summary: event.title,
        description: event.description,
        start: {
          dateTime: event.startDateTime.toISOString(),
          timeZone: "Asia/Kuala_Lumpur",
        },
        end: {
          dateTime: event.endDateTime.toISOString(),
          timeZone: "Asia/Kuala_Lumpur",
        },
        attendees,
      },
    })

    return res.data.id
  } catch (error: any) {
    console.error("Error creating Google Calendar event:", error)
    throw new Error(`Google Calendar API Error: ${error.message || "Unknown error"}`)
  }
}

export async function updateGoogleEvent(googleEventId: string, event: GoogleEventInput) {
  if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) return null

  try {
    const attendees = event.attendeeEmails
      ?.filter(email => email && email.includes("@"))
      .map(email => ({ email }))

    await calendar.events.update({
      calendarId: CALENDAR_ID,
      eventId: googleEventId,
      sendUpdates: "all",
      requestBody: {
        summary: event.title,
        description: event.description,
        start: {
          dateTime: event.startDateTime.toISOString(),
          timeZone: "Asia/Kuala_Lumpur",
        },
        end: {
          dateTime: event.endDateTime.toISOString(),
          timeZone: "Asia/Kuala_Lumpur",
        },
        attendees,
      },
    })

    return true
  } catch (error) {
    console.error("Error updating Google Calendar event:", error)
    return false
  }
}

export async function deleteGoogleEvent(googleEventId: string) {
  if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) return null

  try {
    await calendar.events.delete({
      calendarId: CALENDAR_ID,
      eventId: googleEventId,
      sendUpdates: "all",
    })
    return true
  } catch (error) {
    console.error("Error deleting Google Calendar event:", error)
    return false
  }
}
