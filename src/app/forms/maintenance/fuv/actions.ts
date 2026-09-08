"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { sendEmailWithDetails } from "@/lib/mailer"
import { generateFUVCalendarInvite } from "@/lib/fuv-calendar"
import { buildFUVInspectionEmailHtml } from "@/lib/fuv-email"
import { sendTelegramMessage, getTelegramConfig, buildFUVTelegramAlertHtml } from "@/lib/telegram"
import type { Prisma, MaintenanceHazardProcessControl } from "@prisma/client"
import {
  type FUVRow,
  type FUVFormData,
  type MergedDailyFUVRecord,
  DAY_SHIFT_TIMES,
  NIGHT_SHIFT_TIMES,
  ALL_SHIFT_TIMES,
  isPG02Breach,
  isPG05Breach,
  isUVIntensityBreach,
  createEmptyFUVRow,
} from "./types"

export async function getHazardProcessRecordByDateAndShift(dateStr: string, shift: "DAY" | "NIGHT") {
  try {
    const targetDateStart = new Date(`${dateStr}T00:00:00.000Z`)
    const targetDateEnd = new Date(`${dateStr}T23:59:59.999Z`)

    const record = await prisma.maintenanceHazardProcessControl.findFirst({
      where: {
        date: {
          gte: targetDateStart,
          lte: targetDateEnd,
        },
        shift,
      },
    })

    if (!record) return { success: true, data: null }

    return {
      success: true,
      data: {
        ...record,
        date: record.date.toISOString().split("T")[0],
        rows: (record.rows as unknown as FUVRow[]) || [],
      },
    }
  } catch (error: unknown) {
    const err = error as Error
    console.error("Error fetching FUV record by date & shift:", err)
    return { success: false, error: err.message || "Failed to fetch record." }
  }
}

export async function createOrUpdateHazardProcessRecord(data: FUVFormData) {
  try {
    const targetDate = new Date(`${data.date}T00:00:00.000Z`)
    const targetDateStart = new Date(`${data.date}T00:00:00.000Z`)
    const targetDateEnd = new Date(`${data.date}T23:59:59.999Z`)

    // Check if record already exists for this date and shift
    const existing = await prisma.maintenanceHazardProcessControl.findFirst({
      where: {
        date: {
          gte: targetDateStart,
          lte: targetDateEnd,
        },
        shift: data.shift,
      },
    })

    if (existing && existing.isLocked) {
      return {
        success: false,
        error: "This record has been verified and locked by Supervisor / QC. Modifications are not allowed.",
      }
    }

    // Validate CCP parameters server-side: if any non-off reading breaches CCP limits, remarks is mandatory
    const ccpBreach = (data.rows || []).some(
      (r) =>
        !r.isOff &&
        (isPG02Breach(r.pg02) || isPG05Breach(r.pg05) || isUVIntensityBreach(r.uvIntensity))
    )
    if (ccpBreach && !data.remarks?.trim()) {
      return {
        success: false,
        error:
          "CCP ALERT: A CCP parameter is outside the standard limit (PG02 > 3 Bar, PG05 > 2 Bar, or UV Intensity < 80% / > 99%). Remarks / Corrective Actions is MANDATORY.",
      }
    }

    let savedRecord: MaintenanceHazardProcessControl
    if (existing) {
      savedRecord = await prisma.maintenanceHazardProcessControl.update({
        where: { id: existing.id },
        data: {
          rows: data.rows as unknown as Prisma.InputJsonValue,
          remarks: data.remarks?.trim() || null,
          checkedBy: data.checkedBy,
          performedSignature: data.performedSignature || existing.performedSignature,
          verifiedBy: data.verifiedBy || existing.verifiedBy,
          verifiedSignature: data.verifiedSignature || existing.verifiedSignature,
        },
      })
    } else {
      savedRecord = await prisma.maintenanceHazardProcessControl.create({
        data: {
          date: targetDate,
          shift: data.shift,
          rows: data.rows as unknown as Prisma.InputJsonValue,
          remarks: data.remarks?.trim() || null,
          checkedBy: data.checkedBy,
          performedSignature: data.performedSignature || null,
          verifiedBy: data.verifiedBy || null,
          verifiedSignature: data.verifiedSignature || null,
        },
      })
    }

    revalidatePath("/forms/maintenance/fuv")
    revalidatePath("/forms/maintenance/reports/fuv")
    revalidatePath("/forms/maintenance/summary")

    return { success: true, data: savedRecord }
  } catch (error: unknown) {
    const err = error as Error
    console.error("Error saving FUV record:", err)
    return { success: false, error: err.message || "Failed to save FUV record." }
  }
}

export async function getHazardProcessRecords(month: number, year: number) {
  try {
    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0))
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999))

    const rawRecords = await prisma.maintenanceHazardProcessControl.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: [{ date: "asc" }, { shift: "asc" }],
    })

    // Group records by YYYY-MM-DD
    const dateMap = new Map<
      string,
      { day: MaintenanceHazardProcessControl | null; night: MaintenanceHazardProcessControl | null }
    >()

    for (const rec of rawRecords) {
      const dateStr = rec.date.toISOString().split("T")[0]
      if (!dateMap.has(dateStr)) {
        dateMap.set(dateStr, { day: null, night: null })
      }
      const entry = dateMap.get(dateStr)!
      if (rec.shift === "DAY") {
        entry.day = rec
      } else if (rec.shift === "NIGHT") {
        entry.night = rec
      }
    }

    const mergedDailyRecords: MergedDailyFUVRecord[] = []

    for (const [dateStr, shifts] of dateMap.entries()) {
      const dayRec = shifts.day
      const nightRec = shifts.night

      const dayRows = (dayRec?.rows as unknown as FUVRow[]) || []
      const nightRows = (nightRec?.rows as unknown as FUVRow[]) || []

      // Build 12 rows: 6 day + 6 night
      const rows: FUVRow[] = ALL_SHIFT_TIMES.map((time) => {
        const isDayTime = (DAY_SHIFT_TIMES as readonly string[]).includes(time)
        const sourceRows = isDayTime ? dayRows : nightRows
        const matched = sourceRows.find((r) => r.time === time)
        const defaultVerifier = isDayTime ? dayRec?.verifiedBy || "" : nightRec?.verifiedBy || ""
        if (matched) {
          return {
            ...matched,
            verifiedBy: matched.verifiedBy || defaultVerifier,
          }
        }

        return createEmptyFUVRow(
          time,
          isDayTime ? dayRec?.checkedBy || "" : nightRec?.checkedBy || ""
        )
      })

      // Shift-aware lock status: true if both shifts recorded and locked, or if single recorded shift is locked
      const isLocked = Boolean(
        dayRec && nightRec
          ? dayRec.isLocked && nightRec.isLocked
          : (dayRec || nightRec)?.isLocked
      )

      mergedDailyRecords.push({
        date: dateStr,
        dayRecord: dayRec,
        nightRecord: nightRec,
        rows,
        checkedByDay: dayRec?.checkedBy,
        performedSignatureDay: dayRec?.performedSignature || undefined,
        checkedByNight: nightRec?.checkedBy,
        performedSignatureNight: nightRec?.performedSignature || undefined,
        verifiedBy: nightRec?.verifiedBy || dayRec?.verifiedBy || undefined,
        verifiedSignature: nightRec?.verifiedSignature || dayRec?.verifiedSignature || undefined,
        remarksDay: dayRec?.remarks || undefined,
        remarksNight: nightRec?.remarks || undefined,
        isLocked,
      })
    }

    return {
      success: true,
      rawRecords,
      data: mergedDailyRecords,
    }
  } catch (error: unknown) {
    const err = error as Error
    console.error("Error fetching FUV records for month/year:", err)
    return { success: false, error: err.message || "Failed to load records." }
  }
}

export async function deleteHazardProcessRecord(id: string) {
  try {
    await prisma.maintenanceHazardProcessControl.delete({
      where: { id },
    })
    revalidatePath("/forms/maintenance/fuv")
    revalidatePath("/forms/maintenance/reports/fuv")
    revalidatePath("/forms/maintenance/summary")
    return { success: true }
  } catch (error: unknown) {
    const err = error as Error
    console.error("Error deleting FUV record:", err)
    return { success: false, error: err.message || "Failed to delete record." }
  }
}

/**
 * SuperAdmin-only action to simulate and test real email, Google Calendar, and Telegram dispatch
 * for a specific 2-hour FUV inspection slot.
 */
export async function simulateFUVInspectionAlertAction({
  slotTime,
  shift,
}: {
  slotTime: string
  shift: "DAY" | "NIGHT"
}) {
  const session = await auth()
  if (session?.user.role !== "SUPERADMIN") {
    return { success: false, error: "Hanya SuperAdmin dibenarkan menjalankan simulasi amaran pemeriksaan 2-jam FUV." }
  }

  try {
    const baseUrl = (
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.AUTH_URL ||
      process.env.NEXTAUTH_URL ||
      "https://bubbleso2-aio.vercel.app"
    ).replace(/\/$/, "")

    const nowStr = new Date().toLocaleDateString("ms-MY", { timeZone: "Asia/Kuala_Lumpur" })
    const timeFormatted =
      new Date().toLocaleTimeString("ms-MY", {
        timeZone: "Asia/Kuala_Lumpur",
        hour: "2-digit",
        minute: "2-digit",
      }) + " MYT"

    const formUrl = `${baseUrl}/forms/maintenance/fuv`

    // Retrieve configured FUV notification emails from database
    const setting = await prisma.setting.findUnique({
      where: { key: "FUV_NOTIFICATION_EMAILS" },
    })

    const configuredEmails = (setting?.value || "")
      .split(",")
      .map((e) => e.trim())
      .filter((e) => e && e.includes("@"))

    // Dynamic recipients: configured emails + current SuperAdmin email
    const adminEmail = session.user.email
    const targetEmails = Array.from(
      new Set(
        [adminEmail, ...configuredEmails].filter((e): e is string => Boolean(e && e.includes("@")))
      )
    )

    if (targetEmails.length === 0) {
      return {
        success: false,
        error: "Tiada alamat emel yang sah. Sila pastikan anda mempunyai emel atau konfigurasikan di Tetapan.",
      }
    }

    // 1. Generate Google Calendar Invite (.ics) and 1-Click URL
    const { icsContent, googleCalendarUrl } = generateFUVCalendarInvite({
      slotTime,
      shift,
      dateStr: nowStr,
      attendees: targetEmails,
      formUrl,
    })

    // 2. Build HTML email
    const { subject, html } = buildFUVInspectionEmailHtml({
      slotTime: `${slotTime} [SIMULASI SUPERADMIN]`,
      shift,
      dateStr: nowStr,
      formUrl,
      targetMinute: `${timeFormatted} (Simulasi SuperAdmin)`,
      googleCalendarUrl,
    })

    // 3. Send Email
    const emailRes = await sendEmailWithDetails({
      to: targetEmails,
      subject: `🧪 [SIMULASI SUPERADMIN] ${subject}`,
      html,
      icsContent: icsContent || undefined,
    })

    // 4. Send Telegram Bot notification to plant operations group
    let telegramSent = false
    let telegramError: string | undefined

    try {
      const tgConfig = await getTelegramConfig()
      if (tgConfig.enabled && tgConfig.token && tgConfig.chatId) {
        const rawAlertHtml = buildFUVTelegramAlertHtml({
          slotTime,
          shift,
          dateStr: nowStr,
          timeFormatted: `${timeFormatted} (Simulasi Ujian)`,
        })

        const tgMessage =
          `🧪 <b>[SIMULASI SUPERADMIN • UJIAN SLOT 2-JAM]</b>\n` +
          `<i>Mesej ini dihantar sebagai ujian kepatuhan rutin pemeriksaan loji (SGMP/19/FUV).</i>\n\n` +
          rawAlertHtml

        const tgButtons = [
          [{ text: `📝 Buka Borang FUV (Slot ${slotTime})`, url: formUrl }],
        ]
        if (googleCalendarUrl) {
          tgButtons.push([{ text: "📅 Tambah ke Google Calendar", url: googleCalendarUrl }])
        }

        const tgRes = await sendTelegramMessage({
          message: tgMessage,
          buttons: tgButtons,
          parseMode: "HTML",
        })

        telegramSent = tgRes.success
        if (!tgRes.success) {
          telegramError = tgRes.error
        }
      } else {
        telegramError = "Telegram tidak diaktifkan atau token/chat ID belum dikonfigurasi dalam Settings."
      }
    } catch (tgErr: unknown) {
      console.error("Telegram simulation dispatch error:", tgErr)
      telegramError = tgErr instanceof Error ? tgErr.message : String(tgErr)
    }

    if (!emailRes.success) {
      return {
        success: false,
        error: emailRes.error || "Gagal menghantar emel simulasi.",
        telegramSent,
        telegramError,
      }
    }

    return {
      success: true,
      slotTime,
      shift,
      recipients: targetEmails,
      emailSent: emailRes.success,
      telegramSent,
      telegramError,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("FUV simulation action error:", err)
    return { success: false, error: message }
  }
}

/**
 * Retrieve today's 2-hour inspection status across both Day & Night shifts for UI monitors.
 */
export async function getTodayFUVStatusAction() {
  try {
    const session = await auth()
    const isSuperAdmin = session?.user.role === "SUPERADMIN"

    const nowUtc = new Date()
    const mytOffset = 8 * 60 * 60 * 1000
    const nowMyt = new Date(nowUtc.getTime() + mytOffset)
    const mytHour = nowMyt.getUTCHours()
    const mytMinute = nowMyt.getUTCMinutes()
    const dateStr = nowMyt.toISOString().split("T")[0]
    const currentShift: "DAY" | "NIGHT" = mytHour >= 7 && mytHour < 19 ? "DAY" : "NIGHT"

    const targetDateStart = new Date(`${dateStr}T00:00:00.000Z`)
    const targetDateEnd = new Date(`${dateStr}T23:59:59.999Z`)

    const records = await prisma.maintenanceHazardProcessControl.findMany({
      where: {
        date: {
          gte: targetDateStart,
          lte: targetDateEnd,
        },
      },
    })

    const dayRec = records.find((r) => r.shift === "DAY")
    const nightRec = records.find((r) => r.shift === "NIGHT")

    const dayRows = (dayRec?.rows as unknown as FUVRow[]) || []
    const nightRows = (nightRec?.rows as unknown as FUVRow[]) || []

    const isSlotDone = (rows: FUVRow[], timeSlot: string) => {
      const row = rows.find((r) => r.time.toLowerCase() === timeSlot.toLowerCase())
      return Boolean(
        row &&
          (row.isOff ||
            (row.vfd01 && row.vfd01.trim() !== "") ||
            (row.pg02 && row.pg02.trim() !== "") ||
            (row.uvIntensity && row.uvIntensity.trim() !== ""))
      )
    }

    const daySlots = DAY_SHIFT_TIMES.map((time) => ({
      time,
      shift: "DAY" as const,
      completed: isSlotDone(dayRows, time),
    }))

    const nightSlots = NIGHT_SHIFT_TIMES.map((time) => ({
      time,
      shift: "NIGHT" as const,
      completed: isSlotDone(nightRows, time),
    }))

    const totalSlots = daySlots.length + nightSlots.length
    const completedCount =
      daySlots.filter((s) => s.completed).length + nightSlots.filter((s) => s.completed).length
    const compliancePercent = Math.round((completedCount / totalSlots) * 100)

    const slotHourMap: { hour: number; minute: number; time: string; shift: "DAY" | "NIGHT" }[] = [
      { hour: 7, minute: 30, time: "7.30 am", shift: "DAY" },
      { hour: 9, minute: 30, time: "9.30 am", shift: "DAY" },
      { hour: 11, minute: 30, time: "11.30 am", shift: "DAY" },
      { hour: 13, minute: 30, time: "1.30 pm", shift: "DAY" },
      { hour: 15, minute: 30, time: "3.30 pm", shift: "DAY" },
      { hour: 17, minute: 30, time: "5.30 pm", shift: "DAY" },
      { hour: 19, minute: 30, time: "7.30 pm", shift: "NIGHT" },
      { hour: 21, minute: 30, time: "9.30 pm", shift: "NIGHT" },
      { hour: 23, minute: 30, time: "11.30 pm", shift: "NIGHT" },
      { hour: 1, minute: 30, time: "1.30 am", shift: "NIGHT" },
      { hour: 3, minute: 30, time: "3.30 am", shift: "NIGHT" },
      { hour: 5, minute: 30, time: "5.30 am", shift: "NIGHT" },
    ]

    const currentMytMinutes = mytHour * 60 + mytMinute
    let nextSlot = slotHourMap.find((s) => s.hour * 60 + s.minute > currentMytMinutes)
    if (!nextSlot) nextSlot = slotHourMap[0]

    const minutesUntilNext =
      nextSlot.hour * 60 + nextSlot.minute >= currentMytMinutes
        ? nextSlot.hour * 60 + nextSlot.minute - currentMytMinutes
        : 24 * 60 - currentMytMinutes + (nextSlot.hour * 60 + nextSlot.minute)

    return {
      success: true,
      date: dateStr,
      currentShift,
      mytTimeFormatted: `${String(mytHour).padStart(2, "0")}:${String(mytMinute).padStart(2, "0")} MYT`,
      nextSlot: {
        time: nextSlot.time,
        shift: nextSlot.shift,
        minutesRemaining: minutesUntilNext,
      },
      daySlots,
      nightSlots,
      completedCount,
      totalSlots,
      compliancePercent,
      isSuperAdmin,
    }
  } catch (error: unknown) {
    const err = error as Error
    console.error("Error getting today FUV status:", err)
    return { success: false, error: err.message || "Failed to load today FUV status." }
  }
}
