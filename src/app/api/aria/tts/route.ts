import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { GEMINI_TTS_MODEL, geminiUserMessage, runGeminiRequest } from "@/lib/ai/gemini"

export const runtime = "nodejs"
export const maxDuration = 60

// Gemini prebuilt voice for Aria ("Sulafat" = warm). Swap here to change her voice.
const ARIA_VOICE = "Sulafat"
const ARIA_STYLE = "warm, friendly and cheerful young Malaysian woman, natural conversational pace"
const MAX_CHARS = 1500

type InteractionResponse = {
  steps?: { type?: string; content?: { type?: string; data?: string; mime_type?: string }[] }[]
}

// Turn Aria's markdown reply into something that reads naturally out loud.
function toSpeakableText(markdown: string) {
  const text = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^\s*\|?\s*:?-{2,}.*$/gm, " ")
    .replace(/^\s*\|(.*)\|\s*$/gm, (_, row: string) => row.split("|").map(cell => cell.trim()).filter(Boolean).join(", "))
    .replace(/\|/g, ", ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/[*_~`>#]/g, "")
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/\s*\n+\s*/g, ". ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([:,.!?])/g, "$1")
    .replace(/([:,.!?])\./g, "$1")
    .trim()

  if (text.length <= MAX_CHARS) return text
  const cut = text.slice(0, MAX_CHARS)
  const lastStop = cut.lastIndexOf(". ")
  return lastStop > MAX_CHARS * 0.6 ? cut.slice(0, lastStop + 1) : cut
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || apiKey === "your-gemini-api-key") {
    return NextResponse.json(
      { error: "Tetapan Gemini AI belum lengkap. Sila minta pentadbir menyemak GEMINI_API_KEY." },
      { status: 500 },
    )
  }

  const body = await request.json().catch(() => ({}))
  const text = toSpeakableText(typeof body?.text === "string" ? body.text : "")
  if (!text) return NextResponse.json({ error: "Tiada teks untuk dibaca." }, { status: 400 })

  try {
    const audio = await runGeminiRequest(async () => {
      const res = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
        method: "POST",
        headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: GEMINI_TTS_MODEL,
          input: [{
            type: "user_input",
            content: [{
              type: "text",
              text,
              annotations: [{ type: "speech_metadata", style: ARIA_STYLE }],
            }],
          }],
          response_format: { type: "audio" },
          generation_config: { speech_config: [{ voice: ARIA_VOICE }] },
        }),
      })
      if (!res.ok) throw new Error(`${res.status} ${await res.text()}`)

      const json = (await res.json()) as InteractionResponse
      const output = json.steps?.filter(step => step.type === "model_output").at(-1)
      const part = output?.content?.find(item => item.type === "audio" && item.data)
      if (!part?.data) throw new Error("Gemini TTS returned no audio")
      return { data: part.data, mimeType: part.mime_type || "audio/wav" }
    })

    return new Response(Buffer.from(audio.data, "base64"), {
      headers: { "Content-Type": audio.mimeType, "Cache-Control": "no-store" },
    })
  } catch (error: unknown) {
    console.error("Aria TTS Error:", error)
    return NextResponse.json(
      { error: geminiUserMessage(error, "Aria tidak dapat bercakap sekarang. Sila cuba lagi sebentar nanti.") },
      { status: 502 },
    )
  }
}
