import "server-only"

import { prisma } from "@/lib/prisma"
import { sendEmailNotification } from "@/lib/email"

export interface OutboxEmailPayload {
  ticketId?: string
  to: string
  subject: string
  html: string
}

/**
 * Persists an email to MaintenanceNotificationOutbox and immediately attempts delivery.
 */
export async function queueMaintenanceEmailNotification(payload: OutboxEmailPayload) {
  try {
    const outbox = await prisma.maintenanceNotificationOutbox.create({
      data: {
        ticketId: payload.ticketId || null,
        to: payload.to.trim().toLowerCase(),
        subject: payload.subject,
        html: payload.html,
        status: "PENDING",
      },
    })

    // Immediate send attempt
    try {
      const res = await sendEmailNotification({
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
      })

      if (res.success) {
        await prisma.maintenanceNotificationOutbox.update({
          where: { id: outbox.id },
          data: {
            status: "SENT",
            sentAt: new Date(),
            attempts: 1,
          },
        })
      } else {
        await prisma.maintenanceNotificationOutbox.update({
          where: { id: outbox.id },
          data: {
            status: "FAILED",
            error: res.error ? JSON.stringify(res.error) : "Send failed",
            attempts: 1,
          },
        })
      }
    } catch (sendErr: any) {
      console.error(`[Maintenance Outbox] Send failed for ${payload.to}:`, sendErr)
      await prisma.maintenanceNotificationOutbox.update({
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
    console.error("[Maintenance Outbox] Failed to create outbox entry:", err)
    return null
  }
}

/**
 * Retries a failed email from the outbox.
 */
export async function retryOutboxNotification(outboxId: string) {
  const item = await prisma.maintenanceNotificationOutbox.findUnique({
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
      await prisma.maintenanceNotificationOutbox.update({
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
      await prisma.maintenanceNotificationOutbox.update({
        where: { id: item.id },
        data: {
          status: "FAILED",
          error: res.error ? JSON.stringify(res.error) : "Retry attempt failed",
          attempts: item.attempts + 1,
        },
      })
      return { success: false, error: "Email provider rejected delivery." }
    }
  } catch (err: any) {
    await prisma.maintenanceNotificationOutbox.update({
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
 * HTML Templates in English for Maintenance Workflow
 */
export function generateTicketCreatedEmailEn({
  logNumber,
  title,
  ticketType,
  priority,
  location,
  specificArea,
  requesterName,
  ticketUrl,
  trackUrl,
}: {
  logNumber: string
  title: string
  ticketType: string
  priority: string
  location: string
  specificArea?: string | null
  requesterName: string
  ticketUrl?: string
  trackUrl?: string
}) {
  return `
    <div style="font-family: Arial, sans-serif; padding: 24px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <div style="background-color: #0f172a; padding: 18px 24px; border-radius: 8px 8px 0 0; color: white;">
        <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #38bdf8; font-weight: bold;">BubblesO2 Plant Maintenance</span>
        <h2 style="margin: 4px 0 0 0; font-size: 18px; color: #ffffff;">New Work Request Logged: ${logNumber}</h2>
      </div>
      <div style="padding: 24px;">
        <p style="font-size: 14px; margin-top: 0;">Dear Maintenance Team,</p>
        <p style="font-size: 13px; color: #475569;">A new plant maintenance request has been submitted by <strong>${requesterName}</strong>:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px;">
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 8px; color: #64748b; width: 35%;">Log Reference</td>
            <td style="padding: 10px 8px; font-weight: bold; color: #0f172a;">${logNumber}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 8px; color: #64748b;">Category</td>
            <td style="padding: 10px 8px; font-weight: bold; color: #0284c7;">${ticketType}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 8px; color: #64748b;">Priority</td>
            <td style="padding: 10px 8px; font-weight: bold; color: ${priority === 'URGENT' ? '#dc2626' : priority === 'HIGH' ? '#ea580c' : '#0f172a'};">${priority}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 8px; color: #64748b;">Location / Area</td>
            <td style="padding: 10px 8px; color: #0f172a;">${location} ${specificArea ? `(${specificArea})` : ''}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 8px; color: #64748b;">Description</td>
            <td style="padding: 10px 8px; color: #0f172a; font-weight: 600;">${title}</td>
          </tr>
        </table>

        ${ticketUrl ? `
          <div style="margin: 24px 0; text-align: center;">
            <a href="${ticketUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 13px; display: inline-block;">
              Open Ticket in Workspace
            </a>
          </div>
        ` : ''}

        ${trackUrl ? `
          <p style="font-size: 12px; color: #64748b; text-align: center;">
            Requester Live Status: <a href="${trackUrl}" style="color: #2563eb; text-decoration: underline;">Track Request Status</a>
          </p>
        ` : ''}

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px 0;" />
        <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">
          SOP BOSB-FMS-850-001 (QR01 Plant Work Request) • Automated Notification
        </p>
      </div>
    </div>
  `
}

/**
 * HTML Template for Requester: Clean confirmation without internal Workspace button,
 * featuring prominent direct [Track Request Status] Magic Link.
 */
export function generateTicketRequesterCreatedEmailEn({
  logNumber,
  title,
  ticketType,
  priority,
  location,
  specificArea,
  requesterName,
  trackUrl,
}: {
  logNumber: string
  title: string
  ticketType: string
  priority: string
  location: string
  specificArea?: string | null
  requesterName: string
  trackUrl?: string
}) {
  return `
    <div style="font-family: Arial, sans-serif; padding: 24px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <div style="background-color: #0f172a; padding: 18px 24px; border-radius: 8px 8px 0 0; color: white;">
        <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #38bdf8; font-weight: bold;">BubblesO2 Facilities Maintenance</span>
        <h2 style="margin: 4px 0 0 0; font-size: 18px; color: #ffffff;">Work Request Received: ${logNumber}</h2>
      </div>
      <div style="padding: 24px;">
        <p style="font-size: 14px; margin-top: 0;">Dear <strong>${requesterName}</strong>,</p>
        <p style="font-size: 13px; color: #475569;">
          Your facilities maintenance work request has been logged successfully and routed to the maintenance PIC team.
        </p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px;">
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 8px; color: #64748b; width: 35%;">Log Reference</td>
            <td style="padding: 10px 8px; font-weight: bold; color: #0f172a;">${logNumber}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 8px; color: #64748b;">Category</td>
            <td style="padding: 10px 8px; font-weight: bold; color: #0284c7;">${ticketType}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 8px; color: #64748b;">Priority</td>
            <td style="padding: 10px 8px; font-weight: bold; color: ${priority === 'URGENT' ? '#dc2626' : priority === 'HIGH' ? '#ea580c' : '#0f172a'};">${priority}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 8px; color: #64748b;">Location / Area</td>
            <td style="padding: 10px 8px; color: #0f172a;">${location} ${specificArea ? `(${specificArea})` : ''}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 8px; color: #64748b;">Description</td>
            <td style="padding: 10px 8px; color: #0f172a; font-weight: 600;">${title}</td>
          </tr>
        </table>

        ${trackUrl ? `
          <div style="margin: 24px 0; text-align: center;">
            <a href="${trackUrl}" style="background-color: #0284c7; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 13px; display: inline-block;">
              Track Request Status
            </a>
          </div>
          <p style="font-size: 12px; color: #64748b; text-align: center; margin-top: 8px;">
            Click above at any time to monitor technician assignment, live repair progress, and give sign-off verification.
          </p>
        ` : ''}

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px 0;" />
        <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">
          SOP BOSB-FMS-850-001 (QR01 Plant Work Request) • Automated Notification
        </p>
      </div>
    </div>
  `
}

/**
 * HTML Template for Assigned Technician / Contractor:
 * Includes work order details, assignment note, and direct Mobile Magic Link to job sheet.
 */
export function generateTechnicianAssignedEmailEn({
  logNumber,
  title,
  ticketType,
  priority,
  location,
  specificArea,
  technicianName,
  assignedByName,
  reassignmentReason,
  targetDateline,
  workSheetUrl,
}: {
  logNumber: string
  title: string
  ticketType: string
  priority: string
  location: string
  specificArea?: string | null
  technicianName: string
  assignedByName: string
  reassignmentReason?: string | null
  targetDateline?: Date | null
  workSheetUrl: string
}) {
  const deadlineStr = targetDateline ? new Date(targetDateline).toLocaleString("en-GB") : "Pending confirmation"
  return `
    <div style="font-family: Arial, sans-serif; padding: 24px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <div style="background-color: #0f172a; padding: 18px 24px; border-radius: 8px 8px 0 0; color: white;">
        <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #38bdf8; font-weight: bold;">BubblesO2 Facilities Maintenance</span>
        <h2 style="margin: 4px 0 0 0; font-size: 18px; color: #ffffff;">Work Order Assignment: ${logNumber}</h2>
      </div>
      <div style="padding: 24px;">
        <p style="font-size: 14px; margin-top: 0;">Dear <strong>${technicianName}</strong>,</p>
        <p style="font-size: 13px; color: #475569;">
          You have been assigned as the technician in charge for this maintenance work order by <strong>${assignedByName}</strong>:
        </p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px;">
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 8px; color: #64748b; width: 35%;">Log Reference</td>
            <td style="padding: 10px 8px; font-weight: bold; color: #0f172a;">${logNumber}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 8px; color: #64748b;">Category</td>
            <td style="padding: 10px 8px; font-weight: bold; color: #0284c7;">${ticketType}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 8px; color: #64748b;">Priority</td>
            <td style="padding: 10px 8px; font-weight: bold; color: ${priority === 'URGENT' ? '#dc2626' : priority === 'HIGH' ? '#ea580c' : '#0f172a'};">${priority}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 8px; color: #64748b;">Target Dateline</td>
            <td style="padding: 10px 8px; font-weight: bold; color: #b45309;">${deadlineStr}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 8px; color: #64748b;">Location / Machine</td>
            <td style="padding: 10px 8px; color: #0f172a;">${location} ${specificArea ? `(${specificArea})` : ''}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 8px; color: #64748b;">Reported Issue</td>
            <td style="padding: 10px 8px; color: #0f172a; font-weight: 600;">${title}</td>
          </tr>
          ${reassignmentReason ? `
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 8px; color: #64748b;">Supervisor Note</td>
              <td style="padding: 10px 8px; color: #0f172a; font-style: italic;">${reassignmentReason}</td>
            </tr>
          ` : ''}
        </table>

        <div style="margin: 24px 0; text-align: center;">
          <a href="${workSheetUrl}" style="background-color: #16a34a; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 13px; display: inline-block;">
            Open Technician Job Sheet
          </a>
        </div>
        <p style="font-size: 12px; color: #64748b; text-align: center; margin-top: 8px;">
          Tap the button above on your mobile phone or PC to view job details, upload Before/After photos, and record repair resolution.
        </p>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px 0;" />
        <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">
          BubblesO2 Facilities Maintenance & Engineering • Automated Work Order
        </p>
      </div>
    </div>
  `
}

export function generateTicketAcknowledgedEmailEn({
  logNumber,
  title,
  requesterName,
  picName,
  targetDateline,
  trackUrl,
}: {
  logNumber: string
  title: string
  requesterName: string
  picName: string
  targetDateline?: Date | null
  trackUrl?: string
}) {
  const deadlineStr = targetDateline ? new Date(targetDateline).toLocaleString("en-GB") : "Pending target confirmation"
  return `
    <div style="font-family: Arial, sans-serif; padding: 24px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <div style="background-color: #0f172a; padding: 18px 24px; border-radius: 8px 8px 0 0; color: white;">
        <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #38bdf8; font-weight: bold;">BubblesO2 Plant Maintenance</span>
        <h2 style="margin: 4px 0 0 0; font-size: 18px; color: #ffffff;">Work Request Acknowledged: ${logNumber}</h2>
      </div>
      <div style="padding: 24px;">
        <p style="font-size: 14px; margin-top: 0;">Dear <strong>${requesterName}</strong>,</p>
        <p style="font-size: 13px; color: #475569;">
          Your maintenance work request has been formally acknowledged by PIC <strong>${picName}</strong>.
        </p>
        
        <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 14px 16px; margin: 18px 0; border-radius: 4px;">
          <p style="margin: 0; font-size: 12px; color: #166534; font-weight: bold; text-transform: uppercase;">Status: ACKNOWLEDGED</p>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #14532d;">Target Completion: <strong>${deadlineStr}</strong></p>
        </div>

        ${trackUrl ? `
          <div style="margin: 24px 0; text-align: center;">
            <a href="${trackUrl}" style="background-color: #0284c7; color: #ffffff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 13px; display: inline-block;">
              Check Live Progress
            </a>
          </div>
        ` : ''}

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px 0;" />
        <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">
          BubblesO2 Plant Engineering & Maintenance
        </p>
      </div>
    </div>
  `
}

export function generateTicketWorkCompletedEmailEn({
  logNumber,
  title,
  requesterName,
  resolution,
  trackUrl,
}: {
  logNumber: string
  title: string
  requesterName: string
  resolution?: string | null
  trackUrl?: string
}) {
  return `
    <div style="font-family: Arial, sans-serif; padding: 24px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <div style="background-color: #0f172a; padding: 18px 24px; border-radius: 8px 8px 0 0; color: white;">
        <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #38bdf8; font-weight: bold;">BubblesO2 Plant Maintenance</span>
        <h2 style="margin: 4px 0 0 0; font-size: 18px; color: #ffffff;">Repair Work Completed: ${logNumber}</h2>
      </div>
      <div style="padding: 24px;">
        <p style="font-size: 14px; margin-top: 0;">Dear <strong>${requesterName}</strong>,</p>
        <p style="font-size: 13px; color: #475569;">
          The maintenance technician has finished work for: "<em>${title}</em>".
        </p>

        ${resolution ? `
          <div style="margin: 16px 0;">
            <p style="margin: 0 0 4px 0; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: bold;">Technician Resolution Notes</p>
            <p style="margin: 0; font-size: 13px; color: #0f172a; background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px;">${resolution}</p>
          </div>
        ` : ''}

        <p style="font-size: 13px; color: #475569;">
          Please review the completed work and confirm whether the equipment is operating satisfactorily.
        </p>

        ${trackUrl ? `
          <div style="margin: 24px 0; text-align: center;">
            <a href="${trackUrl}" style="background-color: #16a34a; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 13px; display: inline-block;">
              View Photos & Verify Work
            </a>
          </div>
        ` : ''}

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px 0;" />
        <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">
          BubblesO2 Plant Engineering & Maintenance
        </p>
      </div>
    </div>
  `
}
