import { Resend } from "resend"

// Initialize Resend with API key if available
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

type EmailPayload = {
  to: string
  subject: string
  html: string
}

export async function sendEmailNotification({ to, subject, html }: EmailPayload) {
  // If no real API key is configured, mock the email sending
  if (!resend) {
    console.log(`\n==============================================`)
    console.log(`[MOCK EMAIL SENT]`)
    console.log(`To: ${to}`)
    console.log(`Subject: ${subject}`)
    console.log(`----------------------------------------------`)
    console.log(`[HTML Content]:\n${html.substring(0, 300)}...`)
    console.log(`==============================================\n`)
    return { success: true, mocked: true }
  }

  try {
    const data = await resend.emails.send({
      from: 'BubblesO2 IT Support <it-noreply@bubbleso2.com>',
      to,
      subject,
      html,
    })
    return { success: true, data }
  } catch (error) {
    console.error("Failed to send email:", error)
    return { success: false, error }
  }
}

// Pre-built templates
export function generateTicketCreatedEmail(userName: string, logNumber: string, title: string) {
  return `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
      <h2 style="color: #4f46e5;">Ticket Received: ${logNumber}</h2>
      <p>Hi ${userName},</p>
      <p>We have successfully received your IT support request:</p>
      <blockquote style="border-left: 4px solid #e5e7eb; padding-left: 10px; color: #6b7280; font-style: italic;">
        ${title}
      </blockquote>
      <p>Our team will review this shortly. You can track your ticket status in the BubblesO2 IT portal.</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
      <p style="font-size: 12px; color: #9ca3af;">This is an automated message. Please do not reply.</p>
    </div>
  `
}

export function generateTicketStatusUpdateEmail(userName: string, logNumber: string, status: string, resolution?: string | null) {
  return `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
      <h2 style="color: #4f46e5;">Ticket Update: ${logNumber}</h2>
      <p>Hi ${userName},</p>
      <p>Your ticket status has been updated to: <strong style="color: #10b981;">${status.replace("_", " ")}</strong></p>
      ${resolution ? `
        <p><strong>Resolution Notes:</strong></p>
        <blockquote style="border-left: 4px solid #e5e7eb; padding-left: 10px; color: #6b7280; font-style: italic;">
          ${resolution}
        </blockquote>
      ` : ""}
      <p>Thank you for using the BubblesO2 IT Support Portal.</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
      <p style="font-size: 12px; color: #9ca3af;">This is an automated message. Please do not reply.</p>
    </div>
  `
}
