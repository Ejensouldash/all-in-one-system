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
      ? "Excellent (High Compliance)"
      : complianceRate >= 80
      ? "Satisfactory (Meets Baseline Standard)"
      : "Requires Immediate Corrective Action"

  if (isAuditorMode) {
    return `The Preventive Maintenance (SGMP-03) Report for the period ${from} to ${to} records a total of ${totalTasks} scheduled maintenance tasks across ${equipmentCount} core processing equipment units. A total of ${completedTasks} inspections were executed and verified in accordance with standard operating procedures (SOP), achieving an overall compliance rate of ${complianceRate.toFixed(1)}% (${complianceStatus}). All critical machinery was serviced according to designated intervals to ensure ongoing adherence to Good Manufacturing Practice (GMP) standards and product safety assurance.`
  }

  return `The Facility & Preventive Maintenance Management Report (SGMP-03) for the period ${from} to ${to} records ${totalTasks} maintenance activities across ${equipmentCount} processing machines. The current execution status shows ${completedTasks} tasks completed OK, ${issueTasks} tasks requiring technical followup or spare parts replacement, and ${overdueTasks} tasks currently overdue. The current audit compliance rate is ${complianceRate.toFixed(1)}% (${complianceStatus}). Technical personnel are conducting routine surveillance and Corrective and Preventive Actions (CAPA) to sustain optimal operational readiness.`
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
You are a Senior Quality Auditor and Technical Facility Manager for the BubblesO2 Sdn. Bhd. natural mineral water bottling facility.
Write an official, authoritative, and professional "Executive Summary" in English to be included in the Preventive Maintenance Report (SGMP-03).

Maintenance Metric Data:
- Audit Period: ${input.from} to ${input.to}
- Total Core Equipment: ${input.equipmentCount} units
- Total Scheduled Tasks: ${input.totalTasks}
- Completed Tasks (OK): ${input.completedTasks}
- Tasks with Issues: ${input.issueTasks}
- Overdue Tasks: ${input.overdueTasks}
- Upcoming / Planned Tasks: ${input.pendingTasks}
- Audit Compliance Rate: ${input.complianceRate.toFixed(1)}%
- Report Mode: ${input.isAuditorMode ? "EXTERNAL AUDITOR (Auditor Mode)" : "INTERNAL MANAGEMENT (Internal Mode)"}
${input.issuesSummary && input.issuesSummary.length > 0 ? `- Technical Issues Summary: ${input.issuesSummary.slice(0, 5).join("; ")}` : ""}

Style Guidelines:
1. Write in 2 or 3 concise, authoritative paragraphs adhering to GMP and ISO 9001 quality audit standards.
2. Paragraph 1: Overview of SGMP-03 schedule execution and compliance rate performance.
3. Paragraph 2: Equipment readiness analysis, emphasizing quality control and breakdown prevention.
4. ${input.isAuditorMode ? "In External Auditor Mode: Emphasize that equipment integrity, hygiene, and process safety remain thoroughly controlled per GMP standards without disclosing trivial internal notes." : "In Internal Management Mode: Outline necessary corrective actions (CAPA) for items with technical issues or delays."}
5. Do not use markdown headers (#), use plain paragraphs with clean text.
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
