import "server-only"

import { prisma } from "@/lib/prisma"
import { sendEmailNotification } from "@/lib/email"
import { formatMalaysiaDateTime } from "@/lib/dateTime"

export interface MarketingOutboxPayload {
  referenceId?: string | null
  category: "ALL" | "ASSET" | "MERCHANDISE" | "EVENT" | string
  to: string
  subject: string
  html: string
}

function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "")
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  return "https://aio.bubbleso2.com"
}

/**
 * Persists an email to MarketingNotificationOutbox and immediately attempts delivery via Resend.
 */
export async function queueMarketingEmailNotification(payload: MarketingOutboxPayload) {
  try {
    const outbox = await prisma.marketingNotificationOutbox.create({
      data: {
        referenceId: payload.referenceId || null,
        category: payload.category,
        to: payload.to.trim().toLowerCase(),
        subject: payload.subject,
        html: payload.html,
        status: "PENDING",
      },
    })

    // Immediate send attempt via Resend
    try {
      const res = await sendEmailNotification({
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
      })

      if (res.success) {
        await prisma.marketingNotificationOutbox.update({
          where: { id: outbox.id },
          data: {
            status: "SENT",
            sentAt: new Date(),
            attempts: 1,
            error: null,
          },
        })
      } else {
        await prisma.marketingNotificationOutbox.update({
          where: { id: outbox.id },
          data: {
            status: "FAILED",
            error: res.error ? (typeof res.error === "object" ? JSON.stringify(res.error) : String(res.error)) : "Send failed",
            attempts: 1,
          },
        })
      }
    } catch (sendErr: any) {
      console.error(`[Marketing Outbox] Send failed for ${payload.to}:`, sendErr)
      await prisma.marketingNotificationOutbox.update({
        where: { id: outbox.id },
        data: {
          status: "FAILED",
          error: sendErr?.message || "Delivery error",
          attempts: 1,
        },
      })
    }

    return outbox
  } catch (err) {
    console.error("[Marketing Outbox] Failed to create outbox entry:", err)
    return null
  }
}

/**
 * Retries a failed email notification from the outbox.
 */
export async function retryMarketingOutboxNotification(outboxId: string) {
  const item = await prisma.marketingNotificationOutbox.findUnique({
    where: { id: outboxId },
  })

  if (!item) return { success: false, error: "Notification record not found." }

  try {
    const res = await sendEmailNotification({
      to: item.to,
      subject: item.subject,
      html: item.html,
    })

    if (res.success) {
      await prisma.marketingNotificationOutbox.update({
        where: { id: item.id },
        data: {
          status: "SENT",
          sentAt: new Date(),
          error: null,
          attempts: item.attempts + 1,
        },
      })
      return { success: true }
    } else {
      await prisma.marketingNotificationOutbox.update({
        where: { id: item.id },
        data: {
          status: "FAILED",
          error: res.error ? (typeof res.error === "object" ? JSON.stringify(res.error) : String(res.error)) : "Retry attempt failed",
          attempts: item.attempts + 1,
        },
      })
      return { success: false, error: "Email provider rejected delivery." }
    }
  } catch (err: any) {
    await prisma.marketingNotificationOutbox.update({
      where: { id: item.id },
      data: {
        status: "FAILED",
        error: err.message || "Retry exception",
        attempts: item.attempts + 1,
      },
    })
    return { success: false, error: err.message || "Failed to retry delivery." }
  }
}

/**
 * HTML Email Template: Marketing Assets & Merchandise Requisition Alert
 */
export function generateMarketingRequisitionAdminEmail({
  batchCode,
  requesterName,
  staffId,
  phone,
  email,
  department,
  purpose,
  pickupDate,
  items,
}: {
  batchCode: string
  requesterName: string
  staffId: string
  phone: string
  email: string
  department: string
  purpose: string
  pickupDate: string
  items: Array<{
    name: string
    type: "ASSET" | "INVENTORY"
    quantity: number
    variantName?: string | null
    returnDate?: string | null
  }>
}) {
  const baseUrl = getBaseUrl()
  const dashboardUrl = `${baseUrl}/marketing/assets`

  const itemsHtml = items
    .map(
      (item) => `
    <tr style="border-bottom: 1px solid #f1f5f9;">
      <td style="padding: 10px 8px; color: #0f172a; font-weight: 600;">
        ${item.name}
        ${item.variantName ? `<span style="font-size: 11px; color: #64748b; display: block;">Variant: ${item.variantName}</span>` : ""}
      </td>
      <td style="padding: 10px 8px;">
        <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; ${
          item.type === "ASSET" ? "background-color: #dbeafe; color: #1e40af;" : "background-color: #e0e7ff; color: #3730a3;"
        }">
          ${item.type === "ASSET" ? "Asset (Loan)" : "Merchandise"}
        </span>
      </td>
      <td style="padding: 10px 8px; font-weight: bold; color: #0f172a; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px 8px; color: #64748b; font-size: 12px;">
        ${item.returnDate ? item.returnDate : item.type === "ASSET" ? "Standard (3 Days)" : "Consumed / Out"}
      </td>
    </tr>
  `
    )
    .join("")

  return `
    <div style="font-family: Arial, sans-serif; padding: 24px; color: #1e293b; max-width: 620px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <div style="background-color: #0284c7; padding: 20px 24px; border-radius: 8px 8px 0 0; color: white;">
        <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #e0f2fe; font-weight: bold;">BubblesO2 Marketing Notification</span>
        <h2 style="margin: 6px 0 0 0; font-size: 20px; color: #ffffff;">New Requisition Submitted: ${batchCode}</h2>
      </div>
      
      <div style="padding: 24px;">
        <p style="font-size: 14px; margin-top: 0;">Dear Marketing Team,</p>
        <p style="font-size: 13px; color: #475569;">A new marketing requisition has been submitted and is awaiting your review and approval:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; background-color: #f8fafc; border-radius: 8px; overflow: hidden;">
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 14px; color: #64748b; width: 35%;">Batch Reference</td>
            <td style="padding: 10px 14px; font-weight: bold; color: #0284c7;">${batchCode}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 14px; color: #64748b;">Requester Name</td>
            <td style="padding: 10px 14px; font-weight: bold; color: #0f172a;">${requesterName} (Staff ID: ${staffId})</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 14px; color: #64748b;">Department</td>
            <td style="padding: 10px 14px; color: #0f172a;">${department}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 14px; color: #64748b;">Contact Details</td>
            <td style="padding: 10px 14px; color: #0f172a;">Phone: ${phone} | Email: ${email}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 14px; color: #64748b;">Scheduled Pickup</td>
            <td style="padding: 10px 14px; font-weight: bold; color: #0f172a;">${pickupDate}</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; color: #64748b; vertical-align: top;">Purpose / Event</td>
            <td style="padding: 10px 14px; color: #0f172a;">${purpose}</td>
          </tr>
        </table>

        <h3 style="font-size: 14px; color: #0f172a; margin: 20px 0 10px 0;">Requested Items (${items.length}):</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px;">
          <thead>
            <tr style="background-color: #f1f5f9; text-align: left; border-bottom: 2px solid #cbd5e1;">
              <th style="padding: 8px; color: #475569; font-size: 11px; text-transform: uppercase;">Item Name</th>
              <th style="padding: 8px; color: #475569; font-size: 11px; text-transform: uppercase;">Category</th>
              <th style="padding: 8px; color: #475569; font-size: 11px; text-transform: uppercase; text-align: center;">Qty</th>
              <th style="padding: 8px; color: #475569; font-size: 11px; text-transform: uppercase;">Return Date</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div style="text-align: center; margin: 24px 0 12px 0;">
          <a href="${dashboardUrl}" style="background-color: #0284c7; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 13px; display: inline-block;">
            Open Marketing Dashboard
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px 0;" />
        <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">
          BubblesO2 All-in-One Operating System • Automated Marketing Notification
        </p>
      </div>
    </div>
  `
}

/**
 * HTML Email Template: Marketing Event Requisition Alert
 */
export function generateMarketingEventRequisitionAdminEmail({
  requestNumber,
  requesterName,
  staffId,
  email,
  department,
  eventName,
  eventType,
  organizer,
  eventDateFrom,
  eventDateTo,
  picContactName,
  picContactNumber,
  tentative,
  requirements,
}: {
  requestNumber: string
  requesterName: string
  staffId: string
  email: string
  department: string
  eventName: string
  eventType: string
  organizer: string
  eventDateFrom?: string | null
  eventDateTo?: string | null
  picContactName: string
  picContactNumber: string
  tentative: string
  requirements: string
}) {
  const baseUrl = getBaseUrl()
  const eventsUrl = `${baseUrl}/marketing/events`

  return `
    <div style="font-family: Arial, sans-serif; padding: 24px; color: #1e293b; max-width: 620px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <div style="background-color: #059669; padding: 20px 24px; border-radius: 8px 8px 0 0; color: white;">
        <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #d1fae5; font-weight: bold;">BubblesO2 Marketing Notification</span>
        <h2 style="margin: 6px 0 0 0; font-size: 20px; color: #ffffff;">New Event Requisition: ${requestNumber}</h2>
      </div>
      
      <div style="padding: 24px;">
        <p style="font-size: 14px; margin-top: 0;">Dear Marketing Team,</p>
        <p style="font-size: 13px; color: #475569;">A new marketing event requisition has been submitted and is waiting for your review:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; background-color: #f8fafc; border-radius: 8px; overflow: hidden;">
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 14px; color: #64748b; width: 35%;">Request Number</td>
            <td style="padding: 10px 14px; font-weight: bold; color: #059669;">${requestNumber}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 14px; color: #64748b;">Event Name</td>
            <td style="padding: 10px 14px; font-weight: bold; color: #0f172a;">${eventName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 14px; color: #64748b;">Event Type / Organizer</td>
            <td style="padding: 10px 14px; color: #0f172a;">${eventType} (${organizer})</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 14px; color: #64748b;">Event Dates</td>
            <td style="padding: 10px 14px; font-weight: bold; color: #0f172a;">
              ${eventDateFrom || "-"} to ${eventDateTo || "-"}
            </td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 14px; color: #64748b;">Requester Info</td>
            <td style="padding: 10px 14px; color: #0f172a;">
              ${requesterName} (${department}) • Staff ID: ${staffId}
            </td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 14px; color: #64748b;">Event PIC Contact</td>
            <td style="padding: 10px 14px; color: #0f172a;">
              ${picContactName} (${picContactNumber})
            </td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 14px; color: #64748b; vertical-align: top;">Event Tentative</td>
            <td style="padding: 10px 14px; color: #0f172a; white-space: pre-wrap;">${tentative}</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; color: #64748b; vertical-align: top;">Marketing Requirements</td>
            <td style="padding: 10px 14px; color: #0f172a; white-space: pre-wrap;">${requirements}</td>
          </tr>
        </table>

        <div style="text-align: center; margin: 24px 0 12px 0;">
          <a href="${eventsUrl}" style="background-color: #059669; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 13px; display: inline-block;">
            Open Events Management
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px 0;" />
        <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">
          BubblesO2 All-in-One Operating System • Automated Marketing Notification
        </p>
      </div>
    </div>
  `
}

/**
 * HTML Email Template: Test Email
 */
export function generateMarketingTestEmail(recipientName: string, recipientEmail: string) {
  const formattedTime = formatMalaysiaDateTime(new Date())

  return `
    <div style="font-family: Arial, sans-serif; padding: 24px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <div style="background-color: #0f172a; padding: 20px 24px; border-radius: 8px 8px 0 0; color: white;">
        <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #38bdf8; font-weight: bold;">BubblesO2 Marketing System</span>
        <h2 style="margin: 6px 0 0 0; font-size: 20px; color: #ffffff;">Resend Email Test Notification</h2>
      </div>
      
      <div style="padding: 24px;">
        <p style="font-size: 14px; margin-top: 0;">Hello <strong>${recipientName}</strong>,</p>
        <p style="font-size: 13px; color: #475569;">
          This is a verification email from the <strong>Marketing Notifications Setup</strong> module. If you are reading this message, your Resend API configuration is properly connected and functioning!
        </p>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0; font-size: 13px;">
          <p style="margin: 0 0 8px 0;"><strong>Recipient:</strong> ${recipientEmail}</p>
          <p style="margin: 0 0 8px 0;"><strong>Status:</strong> <span style="color: #16a34a; font-weight: bold;">Connected (Delivered via Resend)</span></p>
          <p style="margin: 0;"><strong>Timestamp:</strong> ${formattedTime}</p>
        </div>

        <p style="font-size: 13px; color: #64748b;">
          You will now receive automated alerts whenever new marketing requisitions (Assets, Merchandise, or Events) are submitted.
        </p>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px 0;" />
        <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">
          BubblesO2 All-in-One Operating System • Automated Marketing Notification
        </p>
      </div>
    </div>
  `
}
