import nodemailer from "nodemailer"
import * as ics from "ics"
import { format } from "date-fns"
import path from "path"

interface EmailOptions {
  to: string[]
  subject: string
  html: string
  icsContent?: string
}

export async function sendEmail({ to, subject, html, icsContent }: EmailOptions) {
  if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
    console.warn("SMTP credentials not configured. Skipping email send.")
    return false
  }

  // Instantiate transporter inside the function to avoid stale sockets in serverless environments
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD,
    },
  })

  try {
    // Send emails individually so Gmail recognizes each recipient directly in the 'To' header.
    // This is crucial for Gmail to display the native RSVP "Yes/No/Maybe" buttons.
    const promises = to.map(async (email) => {
      const mailOptions: nodemailer.SendMailOptions = {
        from: `"Sistem Kalendar BubblesO2" <${process.env.SMTP_EMAIL}>`,
        to: email,
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

      return transporter.sendMail(mailOptions)
    })

    await Promise.all(promises)
    transporter.close() // Close the connection pool explicitly
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
    organizer: { name: "BubblesO2 AIO System", email: process.env.SMTP_EMAIL || "admin.it.bubbleso2@gmail.com" },
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
  
  // Construct absolute URL for the logo. In Vercel, VERCEL_URL is available.
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? "https://bubbleso2-aio.vercel.app" : "http://localhost:3000")
  const logoUrl = `${baseUrl}/assets/BubblesO2_Logo.png`

  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);">
      
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 32px 24px; text-align: center;">
        <img src="${logoUrl}" alt="BubblesO2 Logo" style="height: 50px; margin-bottom: 16px; drop-shadow: 0 2px 4px rgba(0,0,0,0.2);" />
        <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: 0.5px;">Jemputan Mesyuarat / Event Invitation</h1>
        <p style="color: #bfdbfe; margin: 8px 0 0 0; font-size: 15px;">Sistem AIO BubblesO2</p>
      </div>

      <!-- Content -->
      <div style="padding: 40px 32px; background-color: #ffffff;">
        <p style="font-size: 16px; color: #374151; margin-top: 0; line-height: 1.6;">
          Salam sejahtera,<br/><br/>
          Anda telah dijemput untuk menghadiri sebuah acara/mesyuarat rasmi yang telah dijadualkan oleh <strong>${event.creatorName}</strong>. Sila rujuk butiran di bawah:
        </p>
        
        <p style="font-size: 15px; color: #6b7280; font-style: italic; margin-bottom: 32px;">
          (Greetings, you have been invited to an official event/meeting scheduled by <strong>${event.creatorName}</strong>. Please refer to the details below:)
        </p>
        
        <!-- Event Card -->
        <div style="margin: 32px 0; padding: 28px; background-color: #f8fafc; border-radius: 12px; border-left: 5px solid #3b82f6; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
          <h2 style="margin: 0 0 20px 0; color: #0f172a; font-size: 22px;">${event.title}</h2>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; width: 120px; vertical-align: top;">
                <strong style="color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Tarikh (Date)</strong>
              </td>
              <td style="padding: 8px 0;">
                <span style="color: #0f172a; font-size: 16px; font-weight: 500;">${dateStr}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; vertical-align: top;">
                <strong style="color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Masa (Time)</strong>
              </td>
              <td style="padding: 8px 0;">
                <span style="color: #0f172a; font-size: 16px; font-weight: 500;">${startTimeStr} - ${endTimeStr}</span>
              </td>
            </tr>
            ${event.description ? `
            <tr>
              <td style="padding: 16px 0 8px 0; vertical-align: top;">
                <strong style="color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Agenda</strong>
              </td>
              <td style="padding: 16px 0 8px 0;">
                <span style="color: #334155; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${event.description}</span>
              </td>
            </tr>
            ` : ''}
          </table>
        </div>
        
        <!-- Manual RSVP Reminder -->
        <div style="text-align: center; margin-top: 40px; padding: 24px; background-color: #eff6ff; border-radius: 12px;">
          <p style="font-size: 15px; color: #1e40af; margin: 0 0 12px 0; font-weight: 600;">
            Sahkan Kehadiran Anda (RSVP)
          </p>
          <p style="font-size: 14px; color: #3b82f6; margin: 0; line-height: 1.5;">
            Sila gunakan butang <strong>Yes / No / Maybe</strong> yang terdapat pada bahagian atas e-mel ini (atau kalendar anda) untuk mengesahkan kehadiran.
          </p>
        </div>

      </div>
      
      <!-- Footer -->
      <div style="background-color: #f1f5f9; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="font-size: 12px; color: #64748b; margin: 0; line-height: 1.6;">
          E-mel ini dijana secara automatik oleh <strong>Sistem AIO BubblesO2</strong>.<br/>
          Harap maklum bahawa ini adalah e-mel rasmi syarikat.
        </p>
      </div>
    </div>
  `
}
