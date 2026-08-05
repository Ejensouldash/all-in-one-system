import "server-only"

const RETRY_DELAYS_MS = [1800, 4500]

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : String(error ?? "Unknown Gemini error")
}

function looksTransient(message: string) {
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

function parseJsonResponse<T>(rawResponse: string): T {
  const cleaned = rawResponse.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim()
  const objectStart = cleaned.indexOf("{")
  const objectEnd = cleaned.lastIndexOf("}")
  if (objectStart < 0 || objectEnd <= objectStart) {
    const preview = cleaned.slice(0, 90).replace(/\s+/g, " ")
    throw new Error(`Gemini response did not contain valid JSON${preview ? `: ${preview}` : ""}`)
  }
  try {
    return JSON.parse(cleaned.slice(objectStart, objectEnd + 1)) as T
  } catch {
    throw new Error("Gemini response did not contain valid JSON")
  }
}

export async function generateGeminiJson<T>(
  generate: () => Promise<string>,
  onRetry?: (attempt: number) => Promise<void> | void,
): Promise<T> {
  let lastError: unknown
  for (let attempt = 1; attempt <= RETRY_DELAYS_MS.length + 1; attempt += 1) {
    try {
      return parseJsonResponse<T>(await generate())
    } catch (error) {
      lastError = error
      if (!looksTransient(messageOf(error)) || attempt > RETRY_DELAYS_MS.length) break
      await onRetry?.(attempt + 1)
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS_MS[attempt - 1]))
    }
  }

  const message = messageOf(lastError).toLowerCase()
  if (looksTransient(message)) {
    throw new Error("Gemini sedang sibuk atau memberi respons tidak lengkap. Sistem sudah mencuba 3 kali; sila cuba semula sebentar lagi.")
  }
  throw lastError instanceof Error ? lastError : new Error("Gemini gagal memproses dokumen.")
}
