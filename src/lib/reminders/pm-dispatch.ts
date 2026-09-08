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
