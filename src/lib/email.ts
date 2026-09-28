import { Resend } from "resend"

// Initialize Resend with API key if available
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

type EmailPayload = {
  to: string
  subject: string
  html: string
  from?: string
}

export async function sendEmailNotification({ to, subject, html, from }: EmailPayload) {
  const sender = from || 'BubblesO2 IT Support <it-noreply@bubbleso2.com>'
  // If no real API key is configured, mock the email sending
  if (!resend) {
    console.log(`\n==============================================`)
    console.log(`[MOCK EMAIL SENT]`)
    console.log(`From: ${sender}`)
    console.log(`To: ${to}`)
    console.log(`Subject: ${subject}`)
    console.log(`----------------------------------------------`)
    console.log(`[HTML Content]:\n${html.substring(0, 300)}...`)
    console.log(`==============================================\n`)
    return { success: true, mocked: true }
  }

  try {
    const data = await resend.emails.send({
      from: sender,
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

export function generateMaintenanceTicketCreatedEmail(
  requesterName: string,
  logNumber: string,
  title: string,
  location: string,
  ticketType: string,
  priority: string
) {
  return `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; rounded: 12px;">
      <div style="background-color: #0f172a; padding: 16px 20px; border-radius: 8px 8px 0 0; color: white;">
        <h2 style="margin: 0; font-size: 18px; color: #38bdf8;">BubblesO2 Plant Maintenance</h2>
        <p style="margin: 4px 0 0 0; font-size: 13px; color: #94a3b8;">New Work Request Logged: <strong>${logNumber}</strong></p>
      </div>
      <div style="padding: 20px;">
        <p>Dear Maintenance Team &amp; <strong>${requesterName}</strong>,</p>
        <p>A new Maintenance Work Request has been submitted with the following details:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px;">
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px; color: #64748b; width: 35%;">Log Reference</td>
            <td style="padding: 8px; font-weight: bold; color: #0f172a;">${logNumber}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px; color: #64748b;">Work Description</td>
            <td style="padding: 8px; font-weight: bold; color: #0f172a;">${title}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px; color: #64748b;">Ticket Category</td>
            <td style="padding: 8px; font-weight: bold; color: #0284c7;">${ticketType}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px; color: #64748b;">Location / Area</td>
            <td style="padding: 8px; color: #0f172a;">${location}</td>
          </tr>
          <tr>
            <td style="padding: 8px; color: #64748b;">Priority Level</td>
            <td style="padding: 8px; font-weight: bold; color: #ea580c;">${priority}</td>
          </tr>
        </table>
        <p style="font-size: 13px; color: #475569;">Our engineering &amp; maintenance technicians will review this work request and assign a PIC shortly.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 11px; color: #94a3b8; text-align: center;">This is an automated notification from BubblesO2 AIO Maintenance System (SOP BOSB-PFMD-850-001-QR01).</p>
      </div>
    </div>
  `
}

export function generateMaintenanceTicketStatusUpdateEmail(
  requesterName: string,
  logNumber: string,
  title: string,
  status: string,
  resolution?: string | null
) {
  const isCompleted = status === "COMPLETED"
  const statusColor = isCompleted ? "#16a34a" : status === "IN_PROGRESS" ? "#0284c7" : "#d97706"

  return `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; rounded: 12px;">
      <div style="background-color: #0f172a; padding: 16px 20px; border-radius: 8px 8px 0 0; color: white;">
        <h2 style="margin: 0; font-size: 18px; color: #38bdf8;">Work Request Status Update</h2>
        <p style="margin: 4px 0 0 0; font-size: 13px; color: #94a3b8;">Reference: <strong>${logNumber}</strong></p>
      </div>
      <div style="padding: 20px;">
        <p>Dear <strong>${requesterName}</strong>,</p>
        <p>Your maintenance request for "<em>${title}</em>" has been updated:</p>
        <div style="background-color: #f8fafc; border-left: 4px solid ${statusColor}; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
          <p style="margin: 0; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: bold;">New Status</p>
          <p style="margin: 4px 0 0 0; font-size: 18px; font-weight: bold; color: ${statusColor};">${status.replace("_", " ")}</p>
        </div>
        ${resolution ? `
          <div style="margin: 16px 0;">
            <p style="margin: 0 0 4px 0; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: bold;">Resolution / Actions Taken</p>
            <p style="margin: 0; font-size: 13px; color: #334155; background-color: #f1f5f9; padding: 10px; border-radius: 6px;">${resolution}</p>
          </div>
        ` : ""}
        <p style="font-size: 13px; color: #475569;">Thank you for your cooperation in maintaining facility standards.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 11px; color: #94a3b8; text-align: center;">BubblesO2 Maintenance &amp; Engineering Department (SOP BOSB-PFMD-850-001-QR01)</p>
      </div>
    </div>
  `
}

