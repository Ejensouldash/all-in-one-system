import { prisma } from "@/lib/prisma"

interface SendTelegramOptions {
  message: string
  buttonText?: string
  buttonUrl?: string
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
 * Send a message via Telegram Bot API with optional inline keyboard link button.
 */
export async function sendTelegramMessage({
  message,
  buttonText,
  buttonUrl,
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
      error: "Telegram Bot Token or Chat ID is missing. Please configure it in System Settings.",
    }
  }

  const endpoint = `https://api.telegram.org/bot${token}/sendMessage`

  const payload: Record<string, unknown> = {
    chat_id: chatId,
    text: message,
    parse_mode: parseMode,
    disable_web_page_preview: false,
  }

  if (buttonText && buttonUrl) {
    payload.reply_markup = {
      inline_keyboard: [
        [
          {
            text: buttonText,
            url: buttonUrl,
          },
        ],
      ],
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
      error: message || "Network error communicating with Telegram API",
    }
  }
}

/**
 * Test connectivity with a Telegram Bot Token and Chat ID by sending a ping message.
 */
export async function testTelegramConnection(
  token: string,
  chatId: string
): Promise<TelegramResult> {
  const testMessage = `🤖 <b>Bubbles O2 AIO System - Telegram Test Alert</b>\n\n` +
    `✅ Sambungan Telegram Bot berjaya disahkan!\n` +
    `📅 Tarikh/Masa: <code>${new Date().toLocaleString("ms-MY", { timeZone: "Asia/Kuala_Lumpur" })}</code>\n` +
    `🔔 Sistem bersedia untuk menghantar peringatan pemeriksaan berjadual SGMP/19/FUV.`

  return sendTelegramMessage({
    message: testMessage,
    tokenOverride: token,
    chatIdOverride: chatId,
    buttonText: "🌐 Buka Sistem AIO",
    buttonUrl: process.env.NEXTAUTH_URL || "https://bubbleso2-aio.vercel.app",
    parseMode: "HTML",
  })
}

