import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/mailer"
import { sendTelegramMessage, getTelegramConfig, buildFUVTelegramAlertHtml } from "@/lib/telegram"
import { buildFUVInspectionEmailHtml } from "@/lib/fuv-email"
import { generateFUVCalendarInvite } from "@/lib/fuv-calendar"
import type { FUVRow } from "@/app/forms/maintenance/fuv/types"

export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * Schedule definition: Map alert time (10 min before) to target slot and shift.
 * Alert triggers at XX:20 (e.g. 07:20 for 07:30 slot).
 */
interface SlotSchedule {
  hour: number // 0-23 in MYT
  slotTime: string
  shift: "DAY" | "NIGHT"
}

const SCHEDULE: SlotSchedule[] = [
  // Day Shift (07:30 - 17:30) -> alerts at 07:20, 09:20, 11:20, 13:20, 15:20, 17:20
  { hour: 7, slotTime: "7.30 am", shift: "DAY" },
  { hour: 9, slotTime: "9.30 am", shift: "DAY" },
  { hour: 11, slotTime: "11.30 am", shift: "DAY" },
  { hour: 13, slotTime: "1.30 pm", shift: "DAY" },
  { hour: 15, slotTime: "3.30 pm", shift: "DAY" },
  { hour: 17, slotTime: "5.30 pm", shift: "DAY" },

  // Night Shift (19:30 - 05:30) -> alerts at 19:20, 21:20, 23:20, 01:20, 03:20, 05:20
  { hour: 19, slotTime: "7.30 pm", shift: "NIGHT" },
  { hour: 21, slotTime: "9.30 pm", shift: "NIGHT" },
  { hour: 23, slotTime: "11.30 pm", shift: "NIGHT" },
  { hour: 1, slotTime: "1.30 am", shift: "NIGHT" },
  { hour: 3, slotTime: "3.30 am", shift: "NIGHT" },
  { hour: 5, slotTime: "5.30 am", shift: "NIGHT" },
]

export async function GET(request: NextRequest) {
  return handleInspectionDispatch(request)
}

export async function POST(request: NextRequest) {
  return handleInspectionDispatch(request)
}

async function handleInspectionDispatch(request: NextRequest) {
  // 1. Authenticate using CRON_SECRET or query param
  const authHeader = request.headers.get("authorization") || ""
  const cronSecret = process.env.CRON_SECRET || ""
  const url = new URL(request.url)
  const secretParam = url.searchParams.get("secret") || ""

  const isBearerValid = cronSecret && authHeader.replace(/^Bearer\s+/i, "") === cronSecret
  const isQueryValid = cronSecret && secretParam === cronSecret

  if (!isBearerValid && !isQueryValid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // 2. Determine current time in Malaysia Standard Time (GMT+8)
  const nowUtc = new Date()
  const mytOffset = 8 * 60 * 60 * 1000
  const nowMyt = new Date(nowUtc.getTime() + mytOffset)

  const mytHour = nowMyt.getUTCHours()
  const mytMinute = nowMyt.getUTCMinutes()
  const mytDateStr = nowMyt.toISOString().split("T")[0]
  const timeFormatted = `${String(mytHour).padStart(2, "0")}:${String(mytMinute).padStart(2, "0")} MYT`

  // Support manual testing overrides
  const forceSlot = url.searchParams.get("forceSlot")
  const forceShift = url.searchParams.get("forceShift") as "DAY" | "NIGHT" | null

  let targetSchedule: SlotSchedule | undefined

  if (forceSlot) {
    targetSchedule = {
      hour: mytHour,
      slotTime: forceSlot,
      shift: forceShift || (mytHour >= 7 && mytHour < 19 ? "DAY" : "NIGHT"),
    }
  } else {
    // Find matching schedule where current hour matches and minute is around the 20-minute alert mark (minute 10 - 45)
    targetSchedule = SCHEDULE.find((s) => s.hour === mytHour)
  }

  if (!targetSchedule) {
    return NextResponse.json({
      success: true,
      message: `No inspection slot scheduled for current hour (${mytHour}:00). Routine inspection alerts run at 07:20, 09:20, 11:20, 13:20, 15:20, 17:20, 19:20, 21:20, 23:20, 01:20, 03:20, 05:20 MYT.`,
      currentMyt: timeFormatted,
    })
  }

  const { slotTime, shift } = targetSchedule

  // 3. Check database if this slot is already filled
  const targetDateStart = new Date(`${mytDateStr}T00:00:00.000Z`)
  const targetDateEnd = new Date(`${mytDateStr}T23:59:59.999Z`)

  const existingRecord = await prisma.maintenanceHazardProcessControl.findFirst({
    where: {
      date: {
        gte: targetDateStart,
        lte: targetDateEnd,
      },
      shift,
    },
  })

  if (existingRecord) {
    const rows = (existingRecord.rows as unknown as FUVRow[]) || []
    const slotRow = rows.find((r) => r.time.toLowerCase() === slotTime.toLowerCase())

    const isSlotCompleted =
      slotRow &&
      (slotRow.isOff ||
        Boolean(
          (slotRow.vfd01 && slotRow.vfd01.trim() !== "") ||
            (slotRow.pg02 && slotRow.pg02.trim() !== "") ||
            (slotRow.uvIntensity && slotRow.uvIntensity.trim() !== "")
        ))

    if (isSlotCompleted) {
      return NextResponse.json({
        success: true,
        message: `Slot ${slotTime} on ${mytDateStr} (${shift}) is already completed by operator (${existingRecord.checkedBy}). Notification skipped.`,
        slotTime,
        shift,
        checkedBy: existingRecord.checkedBy,
      })
    }
  }

  // 4. Retrieve settings from database
  const settings = await prisma.setting.findMany({
    where: {
      key: {
        in: [
          "TELEGRAM_BOT_TOKEN",
          "TELEGRAM_CHAT_ID",
          "TELEGRAM_NOTIFICATIONS_ENABLED",
          "EMAIL_NOTIFICATIONS_ENABLED",
          "FUV_NOTIFICATION_EMAILS",
        ],
      },
    },
  })

  const configMap: Record<string, string> = {}
  settings.forEach((s) => {
    configMap[s.key] = s.value
  })

  const telegramEnabled = configMap["TELEGRAM_NOTIFICATIONS_ENABLED"] !== "false"
  const emailEnabled = configMap["EMAIL_NOTIFICATIONS_ENABLED"] !== "false"
  const fuvEmailsStr = configMap["FUV_NOTIFICATION_EMAILS"] || ""
  const recipientEmails = fuvEmailsStr
    .split(",")
    .map((e) => e.trim())
    .filter((e) => e && e.includes("@"))

  const appBaseUrl =
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://bubbleso2-aio.vercel.app")
  const formUrl = `${appBaseUrl}/forms/maintenance/fuv`

  const dispatchResults: {
    email?: { sent: boolean; recipients: string[]; error?: string }
    telegram?: { sent: boolean; messageId?: number; error?: string }
  } = {}

  // 5. Send Email Alert (if enabled & recipients available)
  if (emailEnabled && recipientEmails.length > 0) {
    try {
      const { icsContent, googleCalendarUrl } = generateFUVCalendarInvite({
        slotTime,
        shift,
        dateStr: mytDateStr,
        attendees: recipientEmails,
        formUrl,
      })

      const { subject, html } = buildFUVInspectionEmailHtml({
        slotTime,
        shift,
        dateStr: mytDateStr,
        formUrl,
        targetMinute: timeFormatted,
        googleCalendarUrl,
      })

      const emailSent = await sendEmail({
        to: recipientEmails,
        subject,
        html,
        icsContent: icsContent || undefined,
      })

      dispatchResults.email = {
        sent: Boolean(emailSent),
        recipients: recipientEmails,
      }
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : String(err)
      console.error("Error sending FUV inspection email alert:", err)
      dispatchResults.email = {
        sent: false,
        recipients: recipientEmails,
        error: errMessage,
      }
    }
  } else {
    dispatchResults.email = {
      sent: false,
      recipients: [],
      error: !emailEnabled ? "Email alerts disabled in settings" : "No recipient emails configured",
    }
  }

  // 6. Send Telegram Alert (if enabled & token/chatId available)
  if (telegramEnabled) {
    try {
      const telegramMessage = buildFUVTelegramAlertHtml({
        slotTime,
        shift,
        dateStr: mytDateStr,
        timeFormatted,
      })

      const reportUrl = `${appBaseUrl}/forms/maintenance/reports/fuv`

      const tgResult = await sendTelegramMessage({
        message: telegramMessage,
        buttons: [
          [{ text: `📝 Buka Borang FUV (Slot ${slotTime})`, url: formUrl }],
          [{ text: `📊 Lihat Laporan & Status Audit`, url: reportUrl }],
        ],
        parseMode: "HTML",
      })

      dispatchResults.telegram = {
        sent: tgResult.success,
        messageId: tgResult.messageId,
        error: tgResult.error,
      }
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : String(err)
      console.error("Error sending FUV Telegram alert:", err)
      dispatchResults.telegram = {
        sent: false,
        error: errMessage,
      }
    }
  } else {
    dispatchResults.telegram = {
      sent: false,
      error: "Telegram alerts disabled in settings",
    }
  }

  return NextResponse.json({
    success: true,
    slotTime,
    shift,
    date: mytDateStr,
    time: timeFormatted,
    dispatch: dispatchResults,
  })
}

