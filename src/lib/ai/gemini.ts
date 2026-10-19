try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("server-only")
} catch {}

export const GEMINI_MODEL = "gemini-3.1-flash-lite"

const RETRY_DELAYS_MS = [2500, 7000]

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : String(error ?? "Unknown Gemini error")
}

function isDailyFreeTierQuota(message: string) {
  const value = message.toLowerCase()
  return (
    value.includes("generaterequestsperdayperprojectpermodel-freetier") ||
    value.includes("generate_content_free_tier_requests") ||
    (value.includes("free tier") && (value.includes("per day") || value.includes("perday")))
  )
}

function isTransient(message: string) {
  const value = message.toLowerCase()
  return [
    "429",
    "500",
    "502",
    "503",
    "504",
    "high demand",
    "overload",
    "resource exhausted",
    "service unavailable",
    "temporarily unavailable",
    "fetch failed",
    "network",
    "timed out",
    "timeout",
    "valid json",
  ].some(token => value.includes(token))
}

function retryDelay(error: unknown, attempt: number) {
  const message = messageOf(error)
  const requestedDelay = message.match(/retry(?:\s+in|delay["':\s]*)\s*"?(\d+(?:\.\d+)?)s/i)
  const requestedMs = requestedDelay ? Math.ceil(Number(requestedDelay[1]) * 1000) + 250 : 0
  return Math.min(15_000, Math.max(RETRY_DELAYS_MS[attempt - 1] ?? 7000, requestedMs))
}

export function geminiUserMessage(error: unknown, fallback = "AI gagal memproses permintaan ini.") {
  const message = messageOf(error)
  const value = message.toLowerCase()

  if (
    value.startsWith("kuota harian percuma") ||
    value.startsWith("perkhidmatan ai sedang") ||
    value.startsWith("respons ai tidak lengkap") ||
    value.startsWith("tetapan ai belum") ||
    value.startsWith("model ai belum")
  ) return message

  if (isDailyFreeTierQuota(message)) {
    return `Kuota harian percuma untuk ${GEMINI_MODEL} telah habis. Cuba semula selepas kuota Google diperbaharui atau teruskan semakan secara manual buat sementara waktu.`
  }
  if (value.includes("api key") || value.includes("api_key_invalid") || value.includes("permission denied")) {
    return "Tetapan AI belum sah. Sila minta pentadbir menyemak Gemini API key."
  }
  if (value.includes("404") || value.includes("model not found") || value.includes("not found for api version")) {
    return `Model AI ${GEMINI_MODEL} belum tersedia untuk API key ini. Sila minta pentadbir menyemak akses model.`
  }
  if (value.includes("valid json")) {
    return "Respons AI tidak lengkap walaupun sistem sudah mencuba semula. Sila cuba sekali lagi."
  }
  if (isTransient(message)) {
    return "Perkhidmatan AI sedang sibuk atau sambungan terganggu. Sistem sudah mencuba semula; sila cuba lagi sebentar nanti."
  }
  return fallback
}

export async function runGeminiRequest<T>(
  request: () => Promise<T>,
  onRetry?: (attempt: number) => Promise<void> | void,
): Promise<T> {
  let lastError: unknown

  for (let attempt = 1; attempt <= RETRY_DELAYS_MS.length + 1; attempt += 1) {
    try {
      return await request()
    } catch (error) {
      lastError = error
      const message = messageOf(error)
      if (isDailyFreeTierQuota(message) || !isTransient(message) || attempt > RETRY_DELAYS_MS.length) break
      await onRetry?.(attempt + 1)
      await new Promise(resolve => setTimeout(resolve, retryDelay(error, attempt)))
    }
  }

  throw new Error(geminiUserMessage(lastError))
}

export function parseAiJsonResponse<T>(rawResponse: string): T {
  const cleaned = rawResponse.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim()
  const objectStart = cleaned.indexOf("{")
  const arrayStart = cleaned.indexOf("[")
  const starts = [objectStart, arrayStart].filter(index => index >= 0)
  const start = starts.length ? Math.min(...starts) : -1
  const end = start === arrayStart ? cleaned.lastIndexOf("]") : cleaned.lastIndexOf("}")

  if (start < 0 || end <= start) throw new Error("AI response did not contain valid JSON")

  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as T
  } catch {
    throw new Error("AI response did not contain valid JSON")
  }
}

export async function generateGeminiJson<T>(
  generate: () => Promise<string>,
  onRetry?: (attempt: number) => Promise<void> | void,
) {
  return runGeminiRequest(async () => parseAiJsonResponse<T>(await generate()), onRetry)
}
