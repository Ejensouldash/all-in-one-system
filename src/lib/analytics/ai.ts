import { GoogleGenerativeAI } from "@google/generative-ai"
import { GEMINI_MODEL, generateGeminiJson } from "@/lib/ai/gemini"
import { generateNvidiaJson, hasNvidiaAi } from "@/lib/ai/nvidia"
import type { AnalyticsPayload, ExecutiveSummary } from "./types"
import { buildAnalyticsBrief, buildRuleBasedSummary } from "./summary"

const ANALYTICS_SYSTEM_INSTRUCTION = `Anda seorang penganalisis pengeluaran di kilang air minuman BubblesO2.
Tugas anda menulis Executive Summary untuk laporan pengeluaran rasmi.

PERATURAN MUTLAK:
- Gunakan HANYA angka yang diberikan dalam data. JANGAN cipta, anggar, atau ubah sebarang nombor.
- Tulis dalam Bahasa Melayu formal dan profesional. Bukan bahasa pasar.
- Ringkas dan padat. Setiap ayat mesti membawa maklumat, bukan pengisi.
- Jika sesuatu maklumat tiada dalam data, jangan sebut langsung.
- Nyatakan implikasi operasi, bukan sekadar mengulang nombor.
- Dalam "kadarIkutKategori", JANGAN sekali-kali laporkan kadar bagi kategori yang "bolehDibanding"
  bernilai false. Unit penggunaan dan reject bagi kategori itu berbeza, jadi peratusannya tidak sah.
  Jika perlu disebut, nyatakan bahawa unit perlu diselaraskan dahulu — jangan sebut nombor peratus.
- "peratusBorangDiisi" ialah kadar borang yang lengkap diisi oleh operator. Ia BUKAN kadar kualiti,
  bukan kadar lulus, dan bukan kadar pematuhan produk. Jangan salah label.

Balas HANYA dengan JSON yang sah mengikut bentuk ini:
{
  "headline": "satu ayat ringkas merumuskan tempoh ini",
  "overview": ["3 hingga 4 ayat gambaran keseluruhan"],
  "findings": ["3 hingga 5 penemuan utama"],
  "risks": ["2 hingga 4 risiko atau isu"],
  "recommendations": ["3 hingga 4 cadangan tindakan yang boleh dilaksanakan"]
}`

async function generateAnalyticsWithGemini(prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || apiKey === "your-gemini-api-key") throw new Error("Gemini API key is not configured")

  const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: { responseMimeType: "application/json" },
    systemInstruction: ANALYTICS_SYSTEM_INSTRUCTION,
  })

  return generateGeminiJson<Record<string, unknown>>(async () => {
    const result = await model.generateContent(prompt)
    return result.response.text()
  })
}

/**
 * Executive summary for the generated PDF report.
 * NVIDIA Kimi is primary, DeepSeek is the automatic NVIDIA fallback, Gemini is third,
 * and the deterministic rule-based summary keeps report generation available offline.
 */
export async function generateExecutiveSummary(data: AnalyticsPayload, useAi: boolean): Promise<ExecutiveSummary> {
  const fallback = buildRuleBasedSummary(data)
  if (!useAi) return fallback

  const brief = buildAnalyticsBrief(data)
  const prompt = `Berikut data pengeluaran sebenar dalam format JSON. Hasilkan Executive Summary.\n\n${JSON.stringify(brief)}`
  let parsed: Record<string, unknown> | undefined

  if (hasNvidiaAi()) {
    try {
      parsed = (await generateNvidiaJson<Record<string, unknown>>([
        { role: "system", content: ANALYTICS_SYSTEM_INSTRUCTION },
        { role: "user", content: prompt },
      ], 4096)).value
    } catch (error) {
      console.warn("NVIDIA analytics generation failed; trying Gemini", error)
    }
  }

  if (!parsed) {
    try {
      parsed = await generateAnalyticsWithGemini(prompt)
    } catch (error) {
      console.error("Executive summary AI generation failed, using rule-based fallback:", error instanceof Error ? error.message : error)
      return fallback
    }
  }

  const asList = (value: unknown): string[] =>
    Array.isArray(value) ? value.filter(item => typeof item === "string" && item.trim() !== "") : []

  const summary: ExecutiveSummary = {
    headline: typeof parsed.headline === "string" && parsed.headline.trim() ? parsed.headline : fallback.headline,
    overview: asList(parsed.overview),
    findings: asList(parsed.findings),
    risks: asList(parsed.risks),
    recommendations: asList(parsed.recommendations),
    source: "ai",
  }

  if (summary.overview.length === 0 && summary.findings.length === 0) return fallback
  if (summary.risks.length === 0) summary.risks = fallback.risks
  if (summary.recommendations.length === 0) summary.recommendations = fallback.recommendations

  return summary
}
