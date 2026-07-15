import { runReminderDispatch } from "@/lib/reminder-engine"

export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * Hourly reminder dispatch endpoint. Triggered by external schedulers
 * (cron-job.org / GitHub Actions) and the Vercel daily backstop cron.
 * Requires: Authorization: Bearer ${CRON_SECRET}. Fails closed when the
 * secret is not configured.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const authHeader = request.headers.get("authorization")
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const summary = await runReminderDispatch(new Date())
    return Response.json({ ok: true, ...summary })
  } catch (error: any) {
    console.error("Reminder dispatch error:", error)
    return Response.json({ ok: false, error: error?.message || "Dispatch failed" }, { status: 500 })
  }
}
