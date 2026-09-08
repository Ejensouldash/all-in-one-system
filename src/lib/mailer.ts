import nodemailer from "nodemailer"
import * as ics from "ics"
import { format } from "date-fns"
import path from "path"
import { prisma } from "@/lib/prisma"

import { Resend } from "resend"

export interface EmailOptions {
  to: string[]
  subject: string
  html: string
  icsContent?: string
  smtpEmailOverride?: string
  smtpPasswordOverride?: string
  resendApiKeyOverride?: string
  resendFromOverride?: string
}

export interface SendEmailResult {
  success: boolean
  error?: string
}

/**
 * Retrieve Email and SMTP configuration from database Setting table with fallback to environment variables.
 */
export async function getSMTPConfig(): Promise<{
  email: string
  password: string
  resendApiKey: string
  resendFrom: string
  isConfigured: boolean
  source: "resend" | "database" | "env" | "none"
}> {
  try {
    const settings = await prisma.setting.findMany({
      where: {
        key: {
          in: ["SMTP_EMAIL", "SMTP_PASSWORD", "RESEND_API_KEY", "RESEND_FROM_EMAIL"],
        },
      },
    })

    const configMap: Record<string, string> = {}
    settings.forEach((s) => {
      configMap[s.key] = s.value
    })

    const dbResendKey = configMap["RESEND_API_KEY"]?.trim() || ""
    const dbResendFrom = configMap["RESEND_FROM_EMAIL"]?.trim() || ""
    const envResendKey = (process.env.RESEND_API_KEY || "").trim()
    const envResendFrom = (process.env.RESEND_FROM_EMAIL || "").trim()

    const resendApiKey = dbResendKey || envResendKey
    const resendFrom = dbResendFrom || envResendFrom

    const dbEmail = configMap["SMTP_EMAIL"]?.trim() || ""
    const dbPass = configMap["SMTP_PASSWORD"]?.trim() || ""
    const envEmail = (process.env.SMTP_EMAIL || "").trim()
    const envPass = (process.env.SMTP_PASSWORD || "").trim()

    const email = dbEmail || envEmail
    const password = dbPass || envPass

    const isResendConfigured = Boolean(resendApiKey)
    const isSmtpConfigured = Boolean(email && password)

    let source: "resend" | "database" | "env" | "none" = "none"
    if (isResendConfigured) {
      source = "resend"
    } else if (dbEmail && dbPass) {
      source = "database"
    } else if (envEmail && envPass) {
      source = "env"
    }

    return {
      email,
      password,
      resendApiKey,
      resendFrom,
      isConfigured: isResendConfigured || isSmtpConfigured,
      source,
    }
  } catch (err: unknown) {
    console.error("Failed to read Email/SMTP settings from database:", err)
    const envEmail = (process.env.SMTP_EMAIL || "").trim()
    const envPass = (process.env.SMTP_PASSWORD || "").trim()
    const envResendKey = (process.env.RESEND_API_KEY || "").trim()
    const envResendFrom = (process.env.RESEND_FROM_EMAIL || "").trim()

    return {
      email: envEmail,
      password: envPass,
      resendApiKey: envResendKey,
      resendFrom: envResendFrom,
      isConfigured: Boolean(envResendKey || (envEmail && envPass)),
      source: envResendKey ? "resend" : envEmail && envPass ? "env" : "none",
    }
  }
}

/**
 * Send emails with full diagnostic error feedback.
 * Supports Resend API (modern, reliable) and Gmail SMTP fallback.
 */
export async function sendEmailWithDetails({
  to,
  subject,
  html,
  icsContent,
  smtpEmailOverride,
  smtpPasswordOverride,
  resendApiKeyOverride,
  resendFromOverride,
}: EmailOptions): Promise<SendEmailResult> {
  const config = await getSMTPConfig()

  // 1. PRIORITY: Check if Resend API is provided
  const activeResendKey = (resendApiKeyOverride?.trim() || config.resendApiKey).trim()
  if (activeResendKey) {
    try {
      const resend = new Resend(activeResendKey)
      const sender = (resendFromOverride?.trim() || config.resendFrom || "BubblesO2 Alerts <alerts@bubbleso2.com>").trim()

      const emailPayload: any = {
        from: sender,
        to,
        subject,
        html,
      }

      if (icsContent) {
        emailPayload.attachments = [
          {
            filename: "pemeriksaan-fuv.ics",
            content: Buffer.from(icsContent).toString("base64"),
          },
        ]
      }

      const { data, error } = await resend.emails.send(emailPayload)

      if (error) {
        console.error("Resend API error:", error)
        let friendly = error.message || "Ralat penghantaran emel daripada Resend."
        if (friendly.includes("not verified") || friendly.includes("validation_error")) {
          friendly = `Resend Error: Domain '${sender}' belum disahkan di Resend. Untuk ujian pantas tanpa domain, gunakan penghantar 'onboarding@resend.dev' dan hantar ke alamat emel pendaftaran akaun Resend anda.`
        }
        return { success: false, error: friendly }
      }

      return { success: true }
    } catch (err: unknown) {
      console.error("Resend send error:", err)
      const rawMsg = err instanceof Error ? err.message : String(err)
      return { success: false, error: `Ralat perkhidmatan Resend: ${rawMsg}` }
    }
  }

  // 2. FALLBACK: Gmail SMTP Transporter
  const user = (smtpEmailOverride?.trim() || config.email).trim()
  const pass = (smtpPasswordOverride?.trim() || config.password).trim()

  if (!user || !pass) {
    return {
      success: false,
      error: `Kredensial emel tidak lengkap. Sila masukkan Resend API Key ATAU maklumat Gmail SMTP (Emel & Google App Password).`,
    }
  }

  // Remove whitespace from Google App Password if user pasted with spaces
  const cleanPass = pass.replace(/\s+/g, "")

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user,
      pass: cleanPass,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  })

  try {
    const promises = to.map(async (email) => {
      const mailOptions: nodemailer.SendMailOptions = {
        from: `"BubblesO2 AIO System" <${user}>`,
        to: email,
        subject,
        html,
      }

      if (icsContent) {
        mailOptions.icalEvent = {
          filename: "pemeriksaan-fuv.ics",
          method: "request",
          content: icsContent,
        }
        mailOptions.attachments = [
          {
            filename: "pemeriksaan-fuv.ics",
            content: icsContent,
            contentType: "text/calendar; charset=utf-8; method=REQUEST",
          },
        ]
      }

      return transporter.sendMail(mailOptions)
    })

    await Promise.all(promises)
    return { success: true }
  } catch (error: any) {
    console.error("Error sending email via SMTP:", error)
    const rawMsg = error?.message || String(error)
    let friendly = rawMsg

    if (
      rawMsg.includes("Invalid login") ||
      rawMsg.includes("535") ||
      rawMsg.includes("BadCredentials") ||
      rawMsg.includes("Username and Password not accepted")
    ) {
      friendly =
        "Gmail menolak kata laluan (535 5.7.8 Bad Credentials). Sila pastikan anda menggunakan 16-digit Google App Password (dijana dari akaun Google > Security > 2-Step Verification > App passwords) dan bukannya kata laluan biasa."
    } else if (rawMsg.includes("ETIMEDOUT") || rawMsg.includes("ECONNECTION") || rawMsg.includes("timeout")) {
      friendly = "Sambungan ke pelayan Gmail SMTP tamat masa (timeout). Sila semak sambungan internet atau firewall."
    }

    return { success: false, error: friendly }
  } finally {
    transporter.close()
  }
}

/**
 * Standard sendEmail returning boolean for backward compatibility.
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const res = await sendEmailWithDetails(options)
  return res.success
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
