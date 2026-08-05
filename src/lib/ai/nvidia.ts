import "server-only"

import { parseAiJsonResponse } from "./gemini"

export const KIMI_MODEL = "moonshotai/kimi-k2.6"
export const MINIMAX_MODEL = "minimaxai/minimax-m3"
export const GLM_MODEL = "z-ai/glm-5.2"
export const NVIDIA_ENDPOINT = "https://integrate.api.nvidia.com/v1/chat/completions"
const TRANSIENT_STATUS = new Set([408, 429, 500, 502, 503, 504])
const PROVIDER_TIMEOUT_MS = 120_000
const RETRIES = 2

class NvidiaApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = "NvidiaApiError"
  }
}

type NvidiaRole = "system" | "user" | "assistant"
export type NvidiaMessage = { role: NvidiaRole; content: string }

export type NvidiaGeneration<T = string> = {
  value: T
  provider: "NVIDIA Kimi"
  model: typeof KIMI_MODEL
}

type StreamChunk = { choices?: Array<{ delta?: { content?: string }; message?: { content?: string } }>; error?: { message?: string } }

function parseSse(raw: string) {
  const chunks: string[] = []
  for (const line of raw.split(/\r?\n/)) {
    if (!line.startsWith("data:")) continue
    const payload = line.slice(5).trim()
    if (!payload || payload === "[DONE]") continue
    try {
      const data = JSON.parse(payload) as StreamChunk
      if (data.error?.message) throw new Error(data.error.message)
      const content = data.choices?.[0]?.delta?.content ?? data.choices?.[0]?.message?.content
      if (content) chunks.push(content)
    } catch (error) {
      throw error instanceof Error ? new Error(`NVIDIA Kimi stream tidak sah: ${error.message}`) : new Error("NVIDIA Kimi stream tidak sah")
    }
  }
  return chunks.join("").trim()
}

function retryDelay(response: Response) {
  const retryAfter = Number(response.headers.get("retry-after"))
  return Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(15_000, Math.ceil(retryAfter * 1000) + 250) : 2500
}

async function callNvidia(messages: NvidiaMessage[], maxTokens: number) {
  const key = process.env.NVIDIA_API_KEY?.trim()
  if (!key) throw new Error("NVIDIA_API_KEY is not configured")
  let lastError: unknown

  for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS)
    try {
      const response = await fetch(NVIDIA_ENDPOINT, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, Accept: "text/event-stream", "Content-Type": "application/json" },
        body: JSON.stringify({ model: KIMI_MODEL, messages, max_tokens: maxTokens, temperature: 0.2, top_p: 0.95, stream: true }),
        signal: controller.signal,
      })
      const raw = await response.text()
      if (!response.ok) {
        let detail = `HTTP ${response.status}`
        try { detail = (JSON.parse(raw) as StreamChunk).error?.message?.slice(0, 240) || detail } catch { /* preserve HTTP status */ }
        const error = new NvidiaApiError(`NVIDIA Kimi: ${detail}`, response.status)
        lastError = error
        if (attempt < RETRIES && TRANSIENT_STATUS.has(response.status)) { await new Promise(resolve => setTimeout(resolve, retryDelay(response))); continue }
        throw error
      }
      const content = parseSse(raw)
      if (!content) throw new Error("NVIDIA Kimi returned an empty response")
      return content
    } catch (error) {
      lastError = error
      if (attempt < RETRIES && (error instanceof NvidiaApiError ? TRANSIENT_STATUS.has(error.status) : true)) {
        await new Promise(resolve => setTimeout(resolve, 2500))
        continue
      }
      throw error
    } finally {
      clearTimeout(timeout)
    }
  }
  throw lastError instanceof Error ? lastError : new Error("NVIDIA Kimi tidak tersedia")
}

async function generateWithNvidia<T>(messages: NvidiaMessage[], maxTokens: number, transform: (text: string) => T): Promise<NvidiaGeneration<T>> {
  const text = await callNvidia(messages, maxTokens)
  return { value: transform(text), provider: "NVIDIA Kimi", model: KIMI_MODEL }
}

export function hasNvidiaAi() { return Boolean(process.env.NVIDIA_API_KEY?.trim()) }
export function generateNvidiaText(messages: NvidiaMessage[], maxTokens = 4096) { return generateWithNvidia(messages, maxTokens, text => text) }
export function generateNvidiaJson<T>(messages: NvidiaMessage[], maxTokens = 4096) { return generateWithNvidia(messages, maxTokens, text => parseAiJsonResponse<T>(text)) }
