import { GoogleGenerativeAI } from "@google/generative-ai"
import { GEMINI_MODEL, runGeminiRequest } from "@/lib/ai/gemini"

export interface PMExecutiveSummaryInput {
  from: string
  to: string
  totalTasks: number
  completedTasks: number
  issueTasks: number
  overdueTasks: number
  pendingTasks: number
  complianceRate: number
  equipmentCount: number
  issuesSummary?: string[]
  isAuditorMode?: boolean
}

/**
 * Generates a rule-based executive summary narrative as a reliable fallback
 * or instant local analysis.
 */
export function buildRuleBasedPMSummary(input: PMExecutiveSummaryInput): string {
  const {
    from,
    to,
    totalTasks,
    completedTasks,
    issueTasks,
    overdueTasks,
    complianceRate,
    equipmentCount,
    isAuditorMode,
  } = input

  const complianceStatus =
    complianceRate >= 95
      ? "Cemerlang (Tahap Pematuhan Tinggi)"
      : complianceRate >= 80
      ? "Memuaskan (Memenuhi Piawaian Asas)"
      : "Perlu Penambahbaikan Segera"

  if (isAuditorMode) {
    return `Laporan Penyelenggaraan Pencegahan (SGMP-03) bagi tempoh ${from} hingga ${to} merekodkan sejumlah ${totalTasks} tugasan berjadual merangkumi ${equipmentCount} unit alatan utama di fasiliti pemprosesan. Sebanyak ${completedTasks} pemeriksaan telah disempurnakan dan diverifikasi mengikut prosedur operasi standard (SOP) dengan kadar pematuhan keseluruhan ${complianceRate.toFixed(1)}% (${complianceStatus}). Semua alatan kritikal telah diselenggara mengikut frekuensi jadual yang ditetapkan bagi memastikan pematuhan berterusan terhadap piawaian GMP dan keselamatan kualiti.`
  }

  return `Laporan Pengurusan Fasiliti & Penyelenggaraan Pencegahan SGMP-03 bagi tempoh ${from} hingga ${to} merekodkan ${totalTasks} aktiviti penyelenggaraan merentasi ${equipmentCount} unit mesin. Status pelaksanaan semasa mencatatkan ${completedTasks} tugasan selesai OK, manakala ${issueTasks} tugasan memerlukan tindakan susulan kerosakan/alat ganti, dan ${overdueTasks} tugasan berada dalam status tertunggak. Kadar pematuhan audit semasa adalah ${complianceRate.toFixed(1)}% (${complianceStatus}). Pengawasan berterusan dan tindakan pembetulan (CAPA) sedang dilaksanakan oleh pasukan teknikal untuk memastikan kesiapsiagaan operasi optimum.`
}

/**
 * Calls Gemini AI to generate a polished, formal Executive Summary narrative
 * tailored specifically for internal management or external auditors.
 */
export async function generatePMExecutiveSummaryAI(input: PMExecutiveSummaryInput): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || apiKey === "your-gemini-api-key") {
    return buildRuleBasedPMSummary(input)
  }

  const prompt = `
Anda adalah Juruaudit Kualiti & Pengurus Fasiliti Teknikal Kanan bagi kilang pembotolan air mineral semulajadi BubblesO2 Sdn. Bhd.
Tuliskan "Executive Summary" (Rumusan Eksekutif) rasmi dan profesional dalam Bahasa Melayu untuk dilampirkan dalam Laporan Penyelenggaraan Pencegahan (SGMP-03).

Data Metrik Penyelenggaraan:
- Tempoh Audit: ${input.from} hingga ${input.to}
- Jumlah Alatan Utama: ${input.equipmentCount} unit
- Jumlah Tugasan Berjadual: ${input.totalTasks}
- Tugasan Selesai (OK): ${input.completedTasks}
- Tugasan Ada Isu / Kerosakan: ${input.issueTasks}
- Tugasan Tertunggak (Overdue): ${input.overdueTasks}
- Tugasan Belum Matang / Akan Datang: ${input.pendingTasks}
- Kadar Pematuhan Audit: ${input.complianceRate.toFixed(1)}%
- Mod Laporan: ${input.isAuditorMode ? "AUDIT LUARAN (Auditor Mode)" : "PENGURUSAN DALAMAN (Internal Mode)"}
${input.issuesSummary && input.issuesSummary.length > 0 ? `- Ringkasan Isu Teknikal: ${input.issuesSummary.slice(0, 5).join("; ")}` : ""}

Panduan Gaya Penulisan:
1. Tulis dalam 2 atau 3 perenggan yang padat, berwibawa, dan bernada korporat formal (Standard GMP & ISO 9001).
2. Perenggan 1: Gambaran keseluruhan pelaksanaan jadual SGMP-03 dan pencapaian kadar pematuhan.
3. Perenggan 2: Analisis kesiapsiagaan alatan dan penekanan kawalan kualiti / pencegahan kerosakan mesin.
4. ${input.isAuditorMode ? "Dalam Mod Audit Luaran: Tekankan bahawa integriti alatan, sanitasi, dan keselamatan proses sentiasa dikawal selia mengikut spesifikasi kawalan kualiti GMP tanpa menyebut isu dalaman remeh." : "Dalam Mod Pengurusan Dalaman: Nyatakan keperluan tindakan susulan bagi sebarang alatan yang mencatatkan isu teknikal atau kelewatan."}
5. Jangan gunakan markdown tajuk (#), gunakan teks biasa dengan perenggan yang bersih.
`

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL })
    const result = await runGeminiRequest(() => model.generateContent(prompt))
    const text = result.response.text().trim()
    return text || buildRuleBasedPMSummary(input)
  } catch (err: unknown) {
    console.error("Gemini PM Summary Generation Error (Falling back to rule-based summary):", err)
    return buildRuleBasedPMSummary(input)
  }
}
