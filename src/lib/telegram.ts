import { prisma } from "@/lib/prisma"

export interface TelegramInlineButton {
  text: string
  url: string
}

interface SendTelegramOptions {
  message: string
  buttonText?: string
  buttonUrl?: string
  buttons?: TelegramInlineButton[][]
  tokenOverride?: string
  chatIdOverride?: string
  parseMode?: "HTML" | "MarkdownV2" | "Markdown"
}

interface TelegramResult {
  success: boolean
  error?: string
  messageId?: number
}

/**
 * Retrieve Telegram Bot Token and Chat ID from database settings with fallback to environment variables.
 */
export async function getTelegramConfig(): Promise<{ token: string; chatId: string; enabled: boolean }> {
  try {
    const settings = await prisma.setting.findMany({
      where: {
        key: {
          in: [
            "TELEGRAM_BOT_TOKEN",
            "TELEGRAM_CHAT_ID",
            "TELEGRAM_NOTIFICATIONS_ENABLED",
          ],
        },
      },
    })

    const configMap: Record<string, string> = {}
    settings.forEach((s) => {
      configMap[s.key] = s.value
    })

    const token = configMap["TELEGRAM_BOT_TOKEN"] || process.env.TELEGRAM_BOT_TOKEN || ""
    const chatId = configMap["TELEGRAM_CHAT_ID"] || process.env.TELEGRAM_CHAT_ID || ""
    const enabledSetting = configMap["TELEGRAM_NOTIFICATIONS_ENABLED"]
    // Enabled by default if token and chatId are present, unless explicitly set to "false"
    const enabled = enabledSetting !== undefined ? enabledSetting === "true" : Boolean(token && chatId)

    return { token: token.trim(), chatId: chatId.trim(), enabled }
  } catch (err: unknown) {
    console.error("Failed to retrieve Telegram configuration from settings:", err)
    return {
      token: (process.env.TELEGRAM_BOT_TOKEN || "").trim(),
      chatId: (process.env.TELEGRAM_CHAT_ID || "").trim(),
      enabled: true,
    }
  }
}

/**
 * Build a beautifully styled HTML message for 2-hour FUV inspection alerts in Telegram.
 */
export function buildFUVTelegramAlertHtml({
  slotTime,
  shift,
  dateStr,
  timeFormatted,
}: {
  slotTime: string
  shift: "DAY" | "NIGHT"
  dateStr: string
  timeFormatted: string
}): string {
  const shiftBadge =
    shift === "DAY" ? "☀️ <b>Syif Siang</b> (07:30 AM – 05:30 PM)" : "🌙 <b>Syif Malam</b> (07:30 PM – 05:30 AM)"

  return (
    `💧 <b>BUBBLES O2 • GMP WATER TREATMENT PLANT</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `⏰ <b>PERINGATAN PEMERIKSAAN BERKALA (2-JAM)</b>\n` +
    `📋 <b>Borang:</b> <code>SGMP/19/FUV</code> • Hazard & Process Control\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `🕒 <b>Slot Sasaran:</b> <b><u>${slotTime.toUpperCase()}</u></b>\n` +
    `⏳ <b>Masa Peringatan:</b> ⚠️ <i>Bermula dalam 10 minit</i> (${timeFormatted})\n` +
    `📅 <b>Tarikh Pemeriksaan:</b> <code>${dateStr}</code>\n` +
    `🔄 <b>Syif Bertugas:</b> ${shiftBadge}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `⚙️ <b>SENARAI SEMAKAN PARAMETER KRITIKAL:</b>\n` +
    `🔹 <b>[VFD01 / VFD02]</b> Pam Mentah & Booster : <code>Max 25 Hz</code>\n` +
    `🔹 <b>[SP01 / 02 / 03]</b> Kualiti Air & pH : <code>6.5 – 7.5 (Clear)</code>\n` +
    `🔹 <b>[CS02 / CS01]</b> Konduktiviti Air : <code>50 – 270 µS/cm</code>\n` +
    `🔹 <b>[PG01 / PT01]</b> Tekanan Saluran Mentah : <code>Max 1.1 Bar</code>\n` +
    `🚨 <b>[PG02] Sand + Carbon : CCP1 (Max 3.0 Bar)</b>\n` +
    `🚨 <b>[PG05] Outlet UF Memb : CCP1 (Max 2.0 Bar)</b>\n` +
    `🚨 <b>[UV INTENSITY] Sistem UV : CCP2 (80% – 99%)</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `📢 <i>Sila ambil bacaan instrumen loji sekarang dan lengkapkan rekod di dalam sistem AIO.</i>\n\n` +
    `⚠️ <b>Peringatan Kepatuhan GMP:</b>\n` +
    `<i>Sekiranya terdapat sebarang sisihan had CCP di atas, ruangan Catatan / Tindakan Pembetulan (Corrective Action) WAJIB diisi sebelum rekod disimpan.</i>`
  )
}

/**
 * Send a message via Telegram Bot API with optional inline keyboard link button(s).
 */
export async function sendTelegramMessage({
  message,
  buttonText,
  buttonUrl,
  buttons,
  tokenOverride,
  chatIdOverride,
  parseMode = "HTML",
}: SendTelegramOptions): Promise<TelegramResult> {
  const config = await getTelegramConfig()
  const token = tokenOverride?.trim() || config.token
  const chatId = chatIdOverride?.trim() || config.chatId

  if (!token || !chatId) {
    return {
      success: false,
      error: "Telegram Bot Token atau Chat ID tiada. Sila masukkan konfigurasi di menu Settings.",
    }
  }

  const endpoint = `https://api.telegram.org/bot${token}/sendMessage`

  const payload: Record<string, unknown> = {
    chat_id: chatId,
    text: message,
    parse_mode: parseMode,
    disable_web_page_preview: false,
  }

  // Construct inline keyboard (support multi-row array or single button fallback)
  let inlineKeyboard: TelegramInlineButton[][] | undefined

  if (buttons && buttons.length > 0) {
    inlineKeyboard = buttons
  } else if (buttonText && buttonUrl) {
    inlineKeyboard = [[{ text: buttonText, url: buttonUrl }]]
  }

  if (inlineKeyboard) {
    payload.reply_markup = {
      inline_keyboard: inlineKeyboard,
    }
  }

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    const data = await res.json()

    if (!res.ok || !data.ok) {
      console.error("Telegram API Error:", data)
      return {
        success: false,
        error: data.description || `Telegram API responded with status ${res.status}`,
      }
    }

    return {
      success: true,
      messageId: data.result?.message_id,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("Network error sending Telegram message:", err)
    return {
      success: false,
      error: message || "Ralat sambungan rangkaian ke Telegram API",
    }
  }
}

/**
 * Test connectivity with a Telegram Bot Token and Chat ID by sending an upgraded ping message.
 */
export async function testTelegramConnection(
  token: string,
  chatId: string
): Promise<TelegramResult> {
  const nowStr = new Date().toLocaleString("ms-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    dateStyle: "full",
    timeStyle: "medium",
  })

  const baseUrl = process.env.NEXTAUTH_URL || "https://bubbleso2-aio.vercel.app"

  const testMessage =
    `🤖 <b>BUBBLES O2 AIO SYSTEM • BOT DIAGNOSTIC PING</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `✅ <b>STATUS: SAMBUNGAN TELEGRAM BERJAYA DISAHKAN!</b>\n\n` +
    `Bot rasmi telah berjaya disambungkan ke kumpulan operasi loji ini.\n\n` +
    `📅 <b>Masa Ujian:</b> <code>${nowStr}</code>\n` +
    `🔐 <b>Keselamatan:</b> Mod Penyulitan Aktif (Verified Admin)\n` +
    `🎯 <b>Skop Operasi:</b> Notifikasi Peringatan SGMP/19/FUV (Setiap 2 Jam)\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `<i>Sistem kini bersedia untuk menyiarkan amaran berkala 10 minit sebelum setiap slot pemeriksaan kepada semua operator dan penyelia bertugas.</i>`

  return sendTelegramMessage({
    message: testMessage,
    tokenOverride: token,
    chatIdOverride: chatId,
    buttons: [
      [{ text: "📝 Uji Buka Borang FUV", url: `${baseUrl}/forms/maintenance/fuv` }],
      [{ text: "📊 Buka Dashboard Laporan", url: `${baseUrl}/forms/maintenance/reports/fuv` }],
    ],
    parseMode: "HTML",
  })
}

/**
 * Helper to escape special HTML characters for Telegram Bot HTML parse mode.
 */
function escapeTgHtml(text: string): string {
  return (text || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

/**
 * Build a beautifully formatted HTML message for Preventive Maintenance (SGMP-03) alerts in Telegram.
 */
export function buildPMTaskTelegramHtml({
  equipment,
  srs,
  dueDate,
  statusLabel,
  checklist,
  picNames,
  isSimulation = false,
}: {
  equipment: string
  srs?: string | null
  dueDate: string
  statusLabel: string
  checklist: string[]
  picNames: string
  isSimulation?: boolean
}): string {
  const headerBadge = isSimulation
    ? `🧪 <b>[SIMULASI SUPERADMIN • TUGASAN PM SEBENAR]</b>\n`
    : `🔧 <b>BUBBLES O2 • PREVENTIVE MAINTENANCE</b>\n`

  const checklistItems = (checklist || [])
    .slice(0, 10)
    .map((item, idx) => `  ${idx + 1}. ▫️ ${escapeTgHtml(item)}`)
    .join("\n")

  const extraCount = (checklist || []).length - 10
  const moreText = extraCount > 0 ? `\n  <i>...dan ${extraCount} lagi arahan kerja</i>` : ""

  return (
    `${headerBadge}` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `📋 <b>PERINGATAN PENYELENGGARAAN PENCEGAHAN</b>\n` +
    `🏷️ <b>SOP:</b> <code>SGMP-03</code> • Jadual Penyelenggaraan Berkala\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `⚙️ <b>Mesin / Peralatan:</b> <b><u>${escapeTgHtml(equipment)}</u></b>\n` +
    (srs ? `📌 <b>Kod SRS:</b> <code>${escapeTgHtml(srs)}</code>\n` : "") +
    `📅 <b>Tarikh Pemeriksaan:</b> <code>${escapeTgHtml(dueDate)}</code>\n` +
    `📊 <b>Status:</b> <b>${escapeTgHtml(statusLabel)}</b>\n` +
    `👤 <b>PIC Bertugas:</b> <code>${escapeTgHtml(picNames)}</code>\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `📝 <b>SENARAI SEMAKAN / ARAHAN KERJA:</b>\n` +
    `${checklistItems}${moreText}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `📢 <i>Sila laksanakan kerja penyelenggaraan mengikut checklist dan kemas kini status di dalam sistem AIO.</i>`
  )
}

