import nodemailer from "nodemailer"
import { prisma } from "@/lib/prisma"
import { addDays, mytDate } from "./pm-core"
import { ensurePMThrough } from "./pm-store"

export type PMMailOutcome = { status: "SENT" | "FAILED" | "UNCERTAIN"; detail?: string }
export function classifyPMMailError(error: { responseCode?: number; code?: string }): PMMailOutcome {
  // An explicit SMTP rejection is safe to retry. A dropped connection after
  // DATA may have been accepted, so never automatically resend that outcome.
  if ((error.responseCode && error.responseCode >= 400) || ["EAUTH", "EDNS", "ECONNECTION"].includes(error.code || "")) return { status: "FAILED", detail: "SMTP menolak penghantaran; akan cuba semula." }
  return { status: "UNCERTAIN", detail: "Penerimaan SMTP tidak dapat dipastikan. Semak peti masuk/log sebelum tindakan manual." }
}
const escape = (text: string) => text.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!))
export function buildPMDigest(tasks: { id: string; dueDate: string; equipment: string; srs: string | null; checklist: string[] }[], today: string, baseUrl: string) {
  return `<h2>Preventive Maintenance — ${escape(today)}</h2><p>Sila rekod pemeriksaan dalam Reminders.</p><ul>${tasks.map(t => `<li><strong>${escape(t.equipment)}</strong>${t.srs ? ` (${escape(t.srs)})` : ""} — ${escape(t.dueDate)} (${t.dueDate < today ? "Tertunggak" : t.dueDate === today ? "Hari ini" : "Esok"})<ul>${t.checklist.map(c => `<li>${escape(c)}</li>`).join("")}</ul><a href="${escape(baseUrl)}/reminders?tab=pm&amp;occurrence=${encodeURIComponent(t.id)}">Buka pemeriksaan</a></li>`).join("")}</ul>`
}
async function sendPMMail(to: string, subject: string, html: string): Promise<PMMailOutcome> {
  if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) return { status: "FAILED", detail: "Konfigurasi SMTP belum lengkap." }
  const transport = nodemailer.createTransport({ service: "gmail", auth: { user: process.env.SMTP_EMAIL, pass: process.env.SMTP_PASSWORD }, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000 })
  try {
    const result = await transport.sendMail({ from: `"BubblesO2 Maintenance" <${process.env.SMTP_EMAIL}>`, to, subject, html })
    return result.accepted.length ? { status: "SENT" } : { status: "FAILED", detail: "Penerima ditolak SMTP." }
  } catch (error) { return classifyPMMailError(error as { responseCode?: number; code?: string }) }
  finally { transport.close() }
}

export async function runPMDispatch(now = new Date(), send = sendPMMail) {
  const today = mytDate(now)
  const hour = new Date(now.getTime() + 8 * 3600000).getUTCHours()
  const summary = { sent: 0, failed: 0, uncertain: 0, skipped: 0 }
  if (hour < 8) return summary
  await ensurePMThrough(addDays(today, 1))
  await prisma.reminderPMDelivery.updateMany({ where: { status: "SENDING", updatedAt: { lt: new Date(now.getTime() - 10 * 60000) } }, data: { status: "UNCERTAIN", detail: "Penghantaran terhenti; penerimaan belum disahkan. Tiada penghantaran semula automatik." } })
  const tasks = await prisma.reminderPMOccurrence.findMany({ where: { completedAt: null, dueDate: { lte: addDays(today, 1) }, schedule: { archivedAt: null } } })
  const users = await prisma.user.findMany({ where: { id: { in: [...new Set(tasks.flatMap(t => t.picIds))] } }, select: { id: true, email: true, role: true, modules: true, unit: { select: { name: true } } } })
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL || process.env.NEXTAUTH_URL || "https://bubbleso2-aio.vercel.app").replace(/\/$/, "")
  // Limited parallelism keeps normal teams within the existing cron duration.
  // Unprocessed recipients remain unclaimed and are picked up by the next run.
  const deadline = Date.now() + 35000
  for (let offset = 0; offset < users.length && Date.now() < deadline; offset += 5) {
    await Promise.all(users.slice(offset, offset + 5).map(async user => {
      if (!user.email || !(user.role === "SUPERADMIN" || user.unit?.name === "Information Technology" || user.modules.includes("REMINDERS"))) { summary.skipped++; return }
      let deliveryId: string
      try {
        const claim = await prisma.reminderPMDelivery.create({ data: { userId: user.id, digestDate: today } })
        deliveryId = claim.id
      } catch (error) {
        if ((error as { code?: string }).code !== "P2002") throw error
        const retry = await prisma.reminderPMDelivery.updateMany({ where: { userId: user.id, digestDate: today, status: "FAILED", attempts: { lt: 3 }, updatedAt: { lte: new Date(now.getTime() - 30 * 60000) } }, data: { status: "SENDING", attempts: { increment: 1 }, detail: null } })
        if (!retry.count) { summary.skipped++; return }
        deliveryId = (await prisma.reminderPMDelivery.findUniqueOrThrow({ where: { userId_digestDate: { userId: user.id, digestDate: today } } })).id
      }
      // Refresh after claiming: a completed task must not be sent from a stale snapshot.
      const current = await prisma.reminderPMOccurrence.findMany({ where: { completedAt: null, picIds: { has: user.id }, dueDate: { lte: addDays(today, 1) }, schedule: { archivedAt: null } }, orderBy: { dueDate: "asc" } })
      if (!current.length) {
        await prisma.reminderPMDelivery.update({ where: { id: deliveryId }, data: { status: "SKIPPED", detail: "Tiada kerja terbuka ketika penghantaran." } }); summary.skipped++; return
      }
      let outcome: PMMailOutcome
      try { outcome = await send(user.email, `PM ${today}: ${current.length} pemeriksaan`, buildPMDigest(current, today, baseUrl)) }
      catch { outcome = { status: "UNCERTAIN", detail: "Penghantaran terganggu; semak penerimaan." } }
      await prisma.reminderPMDelivery.update({ where: { id: deliveryId }, data: { status: outcome.status, detail: outcome.detail || null } })
      if (outcome.status === "SENT") summary.sent++
      else if (outcome.status === "FAILED") summary.failed++
      else summary.uncertain++
    }))
  }
  return summary
}

/**
 * HTML Email Template for a single PM Task Reminder (used for live SuperAdmin simulation & instant alert).
 */
export function buildPMSingleTaskEmailHtml({
  equipment,
  srs,
  dueDate,
  statusLabel,
  checklist,
  picNames,
  formUrl,
  googleCalendarUrl,
}: {
  equipment: string
  srs?: string | null
  dueDate: string
  statusLabel: string
  checklist: string[]
  picNames: string
  formUrl: string
  googleCalendarUrl?: string
}): { subject: string; html: string } {
  const subject = `🔧 [Peringatan PM] Pemeriksaan Peralatan: ${equipment} (${dueDate})`

  const html = `<!DOCTYPE html>
<html lang="ms">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escape(subject)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 30px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 620px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06); border: 1px solid #e2e8f0;">
          
          <!-- Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); padding: 30px 25px; text-align: center;">
              <span style="display: inline-block; background-color: rgba(255, 255, 255, 0.15); color: #93c5fd; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; padding: 4px 12px; border-radius: 9999px; margin-bottom: 12px; border: 1px solid rgba(255, 255, 255, 0.2);">
                BUBBLES O2 &bull; PREVENTIVE MAINTENANCE
              </span>
              <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 900; letter-spacing: -0.5px; text-transform: uppercase;">
                Peringatan Pemeriksaan Peralatan
              </h1>
              <p style="color: #bfdbfe; margin: 6px 0 0 0; font-size: 13px; font-weight: 500;">
                SOP SGMP-03 &bull; Jadual Penyelenggaraan Pencegahan
              </p>
            </td>
          </tr>

          <!-- Task Card -->
          <tr>
            <td style="padding: 25px 25px 15px 25px;">
              <table role="presentation" width="100%" style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 18px;">
                <tr>
                  <td>
                    <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #2563eb; letter-spacing: 1px;">
                      PERALATAN / MESIN:
                    </div>
                    <div style="font-size: 22px; font-weight: 900; color: #0f172a; margin: 4px 0;">
                      ${escape(equipment)}
                    </div>
                    ${srs ? `<div style="font-size: 12px; color: #475569; font-weight: 600; margin-top: 2px;">SRS: <code>${escape(srs)}</code></div>` : ""}
                    <div style="font-size: 12px; color: #1e40af; margin-top: 8px;">
                      📅 Tarikh Jadual: <strong>${escape(dueDate)}</strong> &bull; Status: <strong style="color: #b45309;">${escape(statusLabel)}</strong>
                    </div>
                    <div style="font-size: 12px; color: #475569; margin-top: 4px;">
                      👤 PIC Bertugas: <strong>${escape(picNames)}</strong>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Checklist -->
          <tr>
            <td style="padding: 10px 25px 20px 25px;">
              <h3 style="font-size: 13px; font-weight: 800; color: #334155; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 10px 0;">
                Arahan Kerja / Checklist Pemeriksaan:
              </h3>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; font-size: 13px;">
                ${checklist.map((item, idx) => `
                <tr style="background-color: ${idx % 2 === 0 ? "#ffffff" : "#f8fafc"}; border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 10px 14px; color: #2563eb; font-weight: 800; width: 28px; vertical-align: top;">
                    ✓
                  </td>
                  <td style="padding: 10px 14px 10px 0; color: #334155; line-height: 1.5;">
                    ${escape(item)}
                  </td>
                </tr>
                `).join("")}
              </table>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding: 10px 25px 20px 25px; text-align: center;">
              <a href="${escape(formUrl)}" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; font-weight: 800; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; padding: 14px 28px; border-radius: 12px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);">
                📝 Buka &amp; Rekod Pemeriksaan PM
              </a>
              <p style="color: #94a3b8; font-size: 11px; margin: 12px 0 0 0;">
                Pautan terus: <a href="${escape(formUrl)}" style="color: #2563eb; text-decoration: underline;">${escape(formUrl)}</a>
              </p>
            </td>
          </tr>

          <!-- Google Calendar 1-Click Sync Card -->
          ${googleCalendarUrl ? `
          <tr>
            <td style="padding: 0 25px 25px 25px;">
              <table role="presentation" width="100%" style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px;">
                <tr>
                  <td>
                    <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #16a34a; letter-spacing: 1px;">
                      📅 JEMPUTAN GOOGLE CALENDAR:
                    </div>
                    <p style="font-size: 13px; color: #15803d; margin: 6px 0 14px 0; line-height: 1.5;">
                      Acara pemeriksaan mesin ini telah dilampirkan ke dalam emel anda (fail <strong>.ics</strong>). Untuk memasukkannya terus ke aplikasi Google Calendar telefon/laptop dengan 1-klik, tekan butang di bawah:
                    </p>
                    <div style="text-align: center;">
                      <a href="${escape(googleCalendarUrl)}" target="_blank" style="display: inline-block; background-color: #16a34a; color: #ffffff; text-decoration: none; font-weight: 800; font-size: 13px; padding: 10px 22px; border-radius: 8px; box-shadow: 0 2px 6px rgba(22, 163, 74, 0.25);">
                        📅 Tambah ke Google Calendar (1-Klik)
                      </a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ""}

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 18px 25px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #64748b; line-height: 1.5;">
                Notifikasi simulasi rasmi daripada <strong>BubblesO2 All-in-One SuperApp System</strong> &bull; Modul Reminders (SGMP-03).
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  return { subject, html }
}

