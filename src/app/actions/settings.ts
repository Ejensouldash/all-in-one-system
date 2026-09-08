"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import bcrypt from "bcryptjs"
import { revalidatePath } from "next/cache"
import { testTelegramConnection, sendTelegramMessage, buildFUVTelegramAlertHtml } from "@/lib/telegram"
import { sendEmail, sendEmailWithDetails } from "@/lib/mailer"
import { buildFUVInspectionEmailHtml } from "@/lib/fuv-email"

export async function updateProfile(formData: FormData) {
  const session = await auth()
  if (!session) return { success: false, error: "Unauthorized" }

  const name = formData.get("name") as string
  const password = formData.get("password") as string

  try {
    const updateData: any = {}
    if (name) updateData.name = name
    if (password) {
      updateData.password = await bcrypt.hash(password, 10)
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: updateData
    })

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateGlobalSettings(formData: FormData) {
  const session = await auth()
  if (session?.user.role !== "SUPERADMIN") return { success: false, error: "Unauthorized" }

  const companyName = formData.get("COMPANY_NAME") as string
  const supportEmail = formData.get("SUPPORT_EMAIL") as string
  const telegramBotToken = formData.get("TELEGRAM_BOT_TOKEN") as string
  const telegramChatId = formData.get("TELEGRAM_CHAT_ID") as string
  const fuvEmails = formData.get("FUV_NOTIFICATION_EMAILS") as string
  const smtpEmail = formData.get("SMTP_EMAIL") as string
  const smtpPassword = formData.get("SMTP_PASSWORD") as string
  const resendApiKey = formData.get("RESEND_API_KEY") as string
  const resendFrom = formData.get("RESEND_FROM_EMAIL") as string
  const telegramEnabled = formData.get("TELEGRAM_NOTIFICATIONS_ENABLED") ? "true" : "false"
  const emailEnabled = formData.get("EMAIL_NOTIFICATIONS_ENABLED") ? "true" : "false"

  try {
    const upsertSetting = async (key: string, value: string | null) => {
      const val = value !== null && value !== undefined ? value.trim() : ""
      await prisma.setting.upsert({
        where: { key },
        update: { value: val },
        create: { key, value: val }
      })
    }

    const tasks = [
      upsertSetting("COMPANY_NAME", companyName),
      upsertSetting("SUPPORT_EMAIL", supportEmail),
      upsertSetting("TELEGRAM_BOT_TOKEN", telegramBotToken),
      upsertSetting("TELEGRAM_CHAT_ID", telegramChatId),
      upsertSetting("FUV_NOTIFICATION_EMAILS", fuvEmails),
      upsertSetting("SMTP_EMAIL", smtpEmail),
      upsertSetting("RESEND_FROM_EMAIL", resendFrom),
      upsertSetting("TELEGRAM_NOTIFICATIONS_ENABLED", telegramEnabled),
      upsertSetting("EMAIL_NOTIFICATIONS_ENABLED", emailEnabled),
    ]

    // Only update SMTP_PASSWORD if user actually provided a new password
    if (smtpPassword && smtpPassword.trim()) {
      tasks.push(upsertSetting("SMTP_PASSWORD", smtpPassword.trim().replace(/\s+/g, "")))
    }

    // Only update RESEND_API_KEY if user actually provided a new key
    if (resendApiKey && resendApiKey.trim()) {
      tasks.push(upsertSetting("RESEND_API_KEY", resendApiKey.trim()))
    }

    await Promise.all(tasks)

    revalidatePath("/settings")
    revalidatePath("/")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function testTelegramNotificationAction(token?: string, chatId?: string) {
  const session = await auth()
  if (session?.user.role !== "SUPERADMIN") return { success: false, error: "Unauthorized" }

  try {
    const res = await testTelegramConnection(token || "", chatId || "")
    return res
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: message }
  }
}

export async function testEmailNotificationAction(
  emailListStr?: string,
  smtpEmail?: string,
  smtpPassword?: string,
  resendApiKey?: string,
  resendFrom?: string
) {
  const session = await auth()
  if (session?.user.role !== "SUPERADMIN") return { success: false, error: "Unauthorized" }

  let emails: string[] = []
  if (emailListStr && emailListStr.trim()) {
    emails = emailListStr.split(",").map(e => e.trim()).filter(e => e && e.includes("@"))
  } else {
    const setting = await prisma.setting.findUnique({ where: { key: "FUV_NOTIFICATION_EMAILS" } })
    if (setting?.value) {
      emails = setting.value.split(",").map(e => e.trim()).filter(e => e && e.includes("@"))
    }
  }

  if (emails.length === 0) {
    return { success: false, error: "Tiada alamat emel penerima yang sah dimasukkan. Sila isi sekurang-kurangnya satu emel penerima." }
  }

  try {
    const baseUrl = process.env.NEXTAUTH_URL || "https://bubbleso2-aio.vercel.app"
    const nowStr = new Date().toLocaleDateString("ms-MY", { timeZone: "Asia/Kuala_Lumpur" })
    const timeFormatted = new Date().toLocaleTimeString("ms-MY", { timeZone: "Asia/Kuala_Lumpur", hour: "2-digit", minute: "2-digit" }) + " MYT"

    const { subject, html } = buildFUVInspectionEmailHtml({
      slotTime: "11.30 AM [UJIAN SISTEM]",
      shift: "DAY",
      dateStr: nowStr,
      formUrl: `${baseUrl}/forms/maintenance/fuv`,
      targetMinute: `${timeFormatted} (Ujian SuperAdmin)`,
    })

    const result = await sendEmailWithDetails({
      to: emails,
      subject: `🧪 [UJIAN SUPERADMIN] ${subject}`,
      html,
      smtpEmailOverride: smtpEmail,
      smtpPasswordOverride: smtpPassword,
      resendApiKeyOverride: resendApiKey,
      resendFromOverride: resendFrom,
    })

    if (!result.success) {
      return { success: false, error: result.error || "Gagal menghantar emel." }
    }

    return { success: true, recipients: emails }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: message }
  }
}

export async function testFUVFullAlertSimulationAction({
  token,
  chatId,
  emailsStr,
  smtpEmail,
  smtpPassword,
  resendApiKey,
  resendFrom,
}: {
  token?: string
  chatId?: string
  emailsStr?: string
  smtpEmail?: string
  smtpPassword?: string
  resendApiKey?: string
  resendFrom?: string
}) {
  const session = await auth()
  if (session?.user.role !== "SUPERADMIN") return { success: false, error: "Unauthorized" }

  const results: {
    telegram?: { success: boolean; error?: string }
    email?: { success: boolean; recipients?: string[]; error?: string }
  } = {}

  const baseUrl = process.env.NEXTAUTH_URL || "https://bubbleso2-aio.vercel.app"
  const nowStr = new Date().toLocaleDateString("ms-MY", { timeZone: "Asia/Kuala_Lumpur" })
  const timeFormatted =
    new Date().toLocaleTimeString("ms-MY", {
      timeZone: "Asia/Kuala_Lumpur",
      hour: "2-digit",
      minute: "2-digit",
    }) + " MYT"

  // 1. Send Rich FUV Telegram Simulation
  try {
    const rawAlertHtml = buildFUVTelegramAlertHtml({
      slotTime: "11.30 AM",
      shift: "DAY",
      dateStr: nowStr,
      timeFormatted: `${timeFormatted} (Simulasi Ujian)`,
    })

    const tgMessage =
      `🧪 <b>[SIMULASI UJIAN SUPERADMIN]</b>\n` +
      `<i>Mesej di bawah adalah contoh paparan sebenar yang akan disiarkan kepada operator setiap 2 jam.</i>\n\n` +
      rawAlertHtml

    const tgRes = await sendTelegramMessage({
      message: tgMessage,
      tokenOverride: token,
      chatIdOverride: chatId,
      buttons: [
        [{ text: "📝 Buka Borang FUV (Slot 11.30 AM)", url: `${baseUrl}/forms/maintenance/fuv` }],
        [{ text: "📊 Buka Laporan & Audit", url: `${baseUrl}/forms/maintenance/reports/fuv` }],
      ],
      parseMode: "HTML",
    })

    results.telegram = tgRes
  } catch (e: any) {
    results.telegram = { success: false, error: e.message }
  }

  // 2. Send Test Email Simulation
  try {
    const emRes = await testEmailNotificationAction(emailsStr, smtpEmail, smtpPassword, resendApiKey, resendFrom)
    results.email = emRes
  } catch (e: any) {
    results.email = { success: false, error: e.message }
  }

  return { success: true, results }
}

export async function generateBackup() {
  const session = await auth()
  if (session?.user.role !== "SUPERADMIN") return { success: false, error: "Unauthorized" }

  try {
    const [settings, branches, units, users, assets, tickets] = await Promise.all([
      prisma.setting.findMany(),
      prisma.branch.findMany(),
      prisma.unit.findMany(),
      prisma.user.findMany(),
      prisma.asset.findMany(),
      prisma.ticket.findMany()
    ])

    const backupData = {
      settings, branches, units, users, assets, tickets
    }

    return { success: true, data: JSON.stringify(backupData, null, 2) }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function restoreBackup(jsonString: string) {
  const session = await auth()
  if (session?.user.role !== "SUPERADMIN") return { success: false, error: "Unauthorized" }

  try {
    const data = JSON.parse(jsonString)

    // Execute in an interactive transaction to ensure complete rollback on failure
    await prisma.$transaction(async (tx) => {
      // 1. DELETE ALL EXISTING DATA IN CORRECT RELATIONAL ORDER
      await tx.ticket.deleteMany()
      await tx.asset.deleteMany()
      await tx.user.deleteMany()
      await tx.unit.deleteMany()
      await tx.branch.deleteMany()
      await tx.setting.deleteMany()

      // 2. INSERT NEW DATA IN CORRECT RELATIONAL ORDER
      if (data.settings?.length) await tx.setting.createMany({ data: data.settings })
      if (data.branches?.length) await tx.branch.createMany({ data: data.branches })
      if (data.units?.length) await tx.unit.createMany({ data: data.units })
      if (data.users?.length) await tx.user.createMany({ data: data.users })
      if (data.assets?.length) await tx.asset.createMany({ data: data.assets })
      if (data.tickets?.length) await tx.ticket.createMany({ data: data.tickets })
    }, {
      timeout: 20000 // Increase timeout for large data restores
    })

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
