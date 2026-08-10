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

export function generateCreditCheckRejectedEmail(bdName: string, poNumber: string, customerName: string, financeRemarks: string) {
  return `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
      <h2 style="color: #dc2626;">PO Credit Hold Rejected: ${poNumber}</h2>
      <p>Hi ${bdName || "Team BD"},</p>
      <p>Finance has reviewed the credit check case for <strong>${customerName}</strong> (PO No: <strong>${poNumber}</strong>) and marked it as <strong>REJECTED (Credit Not Released)</strong>.</p>
      <p><strong>Finance Remarks:</strong></p>
      <blockquote style="border-left: 4px solid #fca5a5; padding-left: 12px; color: #991b1b; background-color: #fef2f2; padding-top: 8px; padding-bottom: 8px;">
        ${financeRemarks}
      </blockquote>
      <p><strong>Action Required:</strong> Please follow up with the customer regarding outstanding payments or credit arrangements before the order can be processed.</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
      <p style="font-size: 12px; color: #9ca3af;">BubblesO2 Sales Ordering System - Automated Notification</p>
    </div>
  `
}
