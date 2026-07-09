import nodemailer from "nodemailer"
import * as ics from "ics"
import { format } from "date-fns"

interface EmailOptions {
  to: string[]
  subject: string
  html: string
  icsContent?: string
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
})

export async function sendEmail({ to, subject, html, icsContent }: EmailOptions) {
  if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
    console.warn("SMTP credentials not configured. Skipping email send.")
    return false
  }

  const mailOptions: nodemailer.SendMailOptions = {
    from: `"BubblesO2 AIO System" <${process.env.SMTP_EMAIL}>`,
    to: to.join(", "),
    subject,
    html,
  }

  if (icsContent) {
    mailOptions.icalEvent = {
      filename: "invite.ics",
      method: "request",
      content: icsContent,
    }
  }

  try {
    await transporter.sendMail(mailOptions)
    return true
  } catch (error) {
    console.error("Error sending email:", error)
    return false
  }
}

export function generateIcs(event: {
  title: string
  description?: string | null
  startDateTime: Date
  endDateTime: Date
  attendees: string[]
}): string | null {
  const start = [
    event.startDateTime.getUTCFullYear(),
    event.startDateTime.getUTCMonth() + 1,
    event.startDateTime.getUTCDate(),
    event.startDateTime.getUTCHours(),
    event.startDateTime.getUTCMinutes(),
  ] as [number, number, number, number, number]

  const end = [
    event.endDateTime.getUTCFullYear(),
    event.endDateTime.getUTCMonth() + 1,
    event.endDateTime.getUTCDate(),
    event.endDateTime.getUTCHours(),
    event.endDateTime.getUTCMinutes(),
  ] as [number, number, number, number, number]

  const attendees: ics.Attendee[] = event.attendees.map((email) => ({
    name: email.split("@")[0],
    email,
    rsvp: true,
    partstat: "NEEDS-ACTION" as const,
    role: "REQ-PARTICIPANT" as const,
  }))

  const { error, value } = ics.createEvent({
    title: event.title,
    description: event.description || "",
    start,
    startInputType: "utc",
    end,
    endInputType: "utc",
    attendees,
    organizer: { name: "BubblesO2 AIO System", email: process.env.SMTP_EMAIL || "admin@bubbleso2.com" },
    status: "CONFIRMED",
    busyStatus: "BUSY",
  })

  if (error) {
    console.error("Error generating ICS:", error)
    return null
  }

  return value || null
}

export function generateEventEmailHtml(event: {
  title: string
  description?: string | null
  startDateTime: Date
  endDateTime: Date
  creatorName: string
}) {
  const dateStr = format(event.startDateTime, "EEEE, d MMMM yyyy")
  const startTimeStr = format(event.startDateTime, "h:mm a")
  const endTimeStr = format(event.endDateTime, "h:mm a")

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
      <div style="background-color: #2563eb; padding: 24px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Event Invitation</h1>
        <p style="color: #bfdbfe; margin: 8px 0 0 0; font-size: 14px;">BubblesO2 AIO System</p>
      </div>
      <div style="padding: 32px; background-color: #ffffff;">
        <p style="font-size: 16px; color: #374151; margin-top: 0;">Hi there,</p>
        <p style="font-size: 16px; color: #374151;">You have been invited to an event by <strong>${event.creatorName}</strong>.</p>
        
        <div style="margin: 32px 0; padding: 24px; background-color: #f3f4f6; border-radius: 8px;">
          <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 20px;">${event.title}</h2>
          
          <div style="margin-bottom: 12px;">
            <strong style="color: #4b5563; font-size: 14px; text-transform: uppercase;">Date</strong><br/>
            <span style="color: #1f2937; font-size: 16px;">${dateStr}</span>
          </div>
          
          <div style="margin-bottom: 12px;">
            <strong style="color: #4b5563; font-size: 14px; text-transform: uppercase;">Time</strong><br/>
            <span style="color: #1f2937; font-size: 16px;">${startTimeStr} - ${endTimeStr}</span>
          </div>
          
          ${event.description ? `
          <div>
            <strong style="color: #4b5563; font-size: 14px; text-transform: uppercase;">Description</strong><br/>
            <span style="color: #1f2937; font-size: 16px;">${event.description}</span>
          </div>
          ` : ''}
        </div>
        
        <p style="font-size: 14px; color: #6b7280; text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
          This is an automated invitation from the AIO System. Please use the calendar options in your email client to RSVP.
        </p>
      </div>
    </div>
  `
}
