import "server-only"

import { parseAiJsonResponse } from "./gemini"

export const KIMI_MODEL = "moonshotai/kimi-k2.6"
export const DEEPSEEK_MODEL = "deepseek-ai/deepseek-v4-flash"
const NVIDIA_ENDPOINT = "https://integrate.api.nvidia.com/v1/chat/completions"
const TRANSIENT_STATUS = new Set([408, 429, 500, 502, 503, 504])
const PROVIDER_TIMEOUT_MS = 30_000
const PROVIDER_COOLDOWN_MS = 10 * 60_000
const providerCooldown = new Map<string, number>()

class NvidiaApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = "NvidiaApiError"
  }
}

type NvidiaRole = "system" | "user" | "assistant"
export type NvidiaMessage = { role: NvidiaRole; content: string }

type NvidiaProvider = {
  label: "Kimi K2.6" | "DeepSeek V4 Flash"
  model: typeof KIMI_MODEL | typeof DEEPSEEK_MODEL
  envName: "KIMI_K26_KEY" | "DEEPSEEK_V4_KEY"
}

const PROVIDERS: NvidiaProvider[] = [
  { label: "Kimi K2.6", model: KIMI_MODEL, envName: "KIMI_K26_KEY" },
  { label: "DeepSeek V4 Flash", model: DEEPSEEK_MODEL, envName: "DEEPSEEK_V4_KEY" },
]

type NvidiaResponse = {
  choices?: Array<{ message?: { content?: string } }>
  error?: { message?: string }
}

export type NvidiaGeneration<T = string> = {
  value: T
  provider: NvidiaProvider["label"]
  model: NvidiaProvider["model"]
}

function configuredProviders() {
  const now = Date.now()
  return PROVIDERS.flatMap(provider => {
    const key = process.env[provider.envName]?.trim()
    const cooldownUntil = providerCooldown.get(provider.model) ?? 0
    return key && cooldownUntil <= now ? [{ provider, key }] : []
  })
}

function retryDelay(response: Response) {
  const retryAfter = Number(response.headers.get("retry-after"))
  return Number.isFinite(retryAfter) && retryAfter > 0
    ? Math.min(15_000, Math.ceil(retryAfter * 1000) + 250)
    : 2500
}

async function callNvidia(
  provider: NvidiaProvider,
  key: string,
  messages: NvidiaMessage[],
  maxTokens: number,
) {
  let lastError: unknown

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS)

    try {
      const response = await fetch(NVIDIA_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: provider.model,
          messages,
          max_tokens: maxTokens,
          temperature: provider.model === DEEPSEEK_MODEL ? 0.6 : 0.2,
          top_p: 0.95,
          stream: false,
        }),
        signal: controller.signal,
      })

      const raw = await response.text()
      let data: NvidiaResponse = {}
      try {
        data = JSON.parse(raw) as NvidiaResponse
      } catch {
        if (response.ok) throw new Error("NVIDIA AI returned an invalid response")
      }

      if (!response.ok) {
        const detail = data.error?.message?.slice(0, 240) || `HTTP ${response.status}`
        const error = new NvidiaApiError(`${provider.label}: ${detail}`, response.status)
        lastError = error
        if (attempt === 1 && TRANSIENT_STATUS.has(response.status)) {
          await new Promise(resolve => setTimeout(resolve, retryDelay(response)))
          continue
        }
        throw error
      }

      const content = data.choices?.[0]?.message?.content?.trim()
      if (!content) throw new Error(`${provider.label}: empty response`)
      return content
    } catch (error) {
      lastError = error
      throw error
    } finally {
      clearTimeout(timeout)
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`${provider.label} tidak tersedia`)
}

async function generateWithProviders<T>(
  messages: NvidiaMessage[],
  maxTokens: number,
  transform: (text: string) => T,
): Promise<NvidiaGeneration<T>> {
  const providers = configuredProviders()
  if (providers.length === 0) throw new Error("NVIDIA AI keys are not configured")

  const failures: string[] = []
  for (const { provider, key } of providers) {
    try {
      const text = await callNvidia(provider, key, messages, maxTokens)
      return { value: transform(text), provider: provider.label, model: provider.model }
    } catch (error) {
      failures.push(error instanceof Error ? error.message : `${provider.label} gagal`)
      if (error instanceof NvidiaApiError && [401, 403, 404].includes(error.status)) {
        providerCooldown.set(provider.model, Date.now() + PROVIDER_COOLDOWN_MS)
      }
    }
  }

  console.warn("All NVIDIA AI providers failed", failures)
  throw new Error("Kedua-dua perkhidmatan NVIDIA AI tidak tersedia sekarang.")
}

export function hasNvidiaAi() {
  return configuredProviders().length > 0
}

export function generateNvidiaText(messages: NvidiaMessage[], maxTokens = 4096) {
  return generateWithProviders(messages, maxTokens, text => text)
}

export function generateNvidiaJson<T>(messages: NvidiaMessage[], maxTokens = 4096) {
  return generateWithProviders(messages, maxTokens, text => parseAiJsonResponse<T>(text))
}
