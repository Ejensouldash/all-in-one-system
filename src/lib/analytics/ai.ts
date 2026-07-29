import { GoogleGenerativeAI } from "@google/generative-ai"
import type { AnalyticsPayload, ExecutiveSummary } from "./types"
import { buildAnalyticsBrief, buildRuleBasedSummary } from "./summary"

/**
 * Executive summary for the generated PDF report.
 *
 * Follows the same Gemini setup already used in src/app/actions/ai.ts and the Smart Import route.
 * If the key is missing or the call fails for any reason, the deterministic rule-based summary is
 * returned instead — the report must always be produceable.
 */
export async function generateExecutiveSummary(data: AnalyticsPayload, useAi: boolean): Promise<ExecutiveSummary> {
  const fallback = buildRuleBasedSummary(data)
  if (!useAi) return fallback

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || apiKey === "your-gemini-api-key") return fallback

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: "gemini-3.6-flash",
      generationConfig: { responseMimeType: "application/json" },
      systemInstruction: `Anda seorang penganalisis pengeluaran di kilang air minuman BubblesO2.
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
}`,
    })

    const brief = buildAnalyticsBrief(data)
    const result = await model.generateContent(
      `Berikut data pengeluaran sebenar dalam format JSON. Hasilkan Executive Summary.\n\n${JSON.stringify(brief)}`
    )

    const parsed = JSON.parse(result.response.text())

    const asList = (v: unknown): string[] =>
      Array.isArray(v) ? v.filter(x => typeof x === "string" && x.trim() !== "") : []

    const summary: ExecutiveSummary = {
      headline: typeof parsed.headline === "string" && parsed.headline.trim() ? parsed.headline : fallback.headline,
      overview: asList(parsed.overview),
      findings: asList(parsed.findings),
      risks: asList(parsed.risks),
      recommendations: asList(parsed.recommendations),
      source: "ai",
    }

    // A model that returns valid JSON but empty content is no better than no model at all.
    if (summary.overview.length === 0 && summary.findings.length === 0) return fallback

    if (summary.risks.length === 0) summary.risks = fallback.risks
    if (summary.recommendations.length === 0) summary.recommendations = fallback.recommendations

    return summary
  } catch (error: any) {
    console.error("Executive summary AI generation failed, using rule-based fallback:", error?.message)
    return fallback
  }
}
