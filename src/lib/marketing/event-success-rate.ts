/**
 * Weighted Event Success Rate engine.
 *
 * The post-event report success rate is a 100-point score made of four components:
 *   - Public feedback satisfaction ............ 50 points
 *   - Expected impact & stock distribution .... 20 points
 *   - Budget compliance (Finance & Claims) .... 15 points
 *   - Participants' suggestions (Gemini) ...... 15 points
 *
 * This module is intentionally free of server-only imports so the same formulas can be
 * used by Server Actions, the report modal preview, and the PDF renderer.
 */

export const EVENT_SUCCESS_WEIGHTS = {
  satisfaction: 50,
  impact: 20,
  budget: 15,
  suggestion: 15,
} as const

/** Single source of truth for the satisfaction index (aligned with the events dashboard). */
export const SATISFACTION_WEIGHTS: Record<string, number> = {
  EXTREMELY_SATISFIED: 100,
  VERY_SATISFIED: 80,
  SOMEWHAT_SATISFIED: 60,
  NOT_SO_SATISFIED: 40,
  NOT_AT_ALL_SATISFIED: 20,
}

export const DEFAULT_SATISFACTION_WEIGHT = 60

export type SentimentLabel = "GOOD" | "NEUTRAL" | "BAD"

export const SENTIMENT_POINTS: Record<SentimentLabel, number> = {
  GOOD: 1,
  NEUTRAL: 0.5,
  BAD: 0,
}

export interface ImpactItem {
  id: string
  name: string
  unit: string
  qtyGiven: number
  qtyUsed: number
}

export type ScoreFlag =
  | "NO_FEEDBACK"
  | "NO_IMPACT_DATA"
  | "NO_BUDGET_CAP"
  | "OVER_BUDGET"
  | "AI_PENDING"
  | "AI_PARTIAL"
  | "OVER_CONSUMPTION"
  | "MIXED_UNITS"

export interface SatisfactionComponent {
  earned: number
  max: number
  index: number
  positiveRate: number
  responses: number
}

export interface ImpactComponent {
  earned: number
  max: number
  given: number
  used: number
  achievement: number
}

export interface BudgetComponent {
  earned: number
  max: number
  cap: number | null
  claims: number
  ratio: number | null
}

export interface SuggestionComponent {
  earned: number
  max: number
  index: number
  good: number
  neutral: number
  bad: number
  analyzed: number
  responses: number
}

export interface EventScoreBreakdown {
  version: number
  components: {
    satisfaction: SatisfactionComponent
    impact: ImpactComponent
    budget: BudgetComponent
    suggestion: SuggestionComponent
  }
  total: number
  computedAt: string
  flags: ScoreFlag[]
}

export interface ScoreFeedbackInput {
  satisfaction: string
  aiSentiment?: string | null
}

export interface BuildScoreInput {
  feedbacks: ScoreFeedbackInput[]
  budgetCap?: number | null
  impactItems?: unknown
  totalClaimAmount?: number | null
  computedAt?: Date | string
}

export const SCORE_FLAG_LABELS: Record<ScoreFlag, string> = {
  NO_FEEDBACK: "No public feedback responses yet.",
  NO_IMPACT_DATA: "No stock / impact items recorded.",
  NO_BUDGET_CAP: "Maximum approved budget has not been set by Finance.",
  OVER_BUDGET: "Claims exceed the approved budget cap.",
  AI_PENDING: "Participant feedback has not been analysed by Gemini yet.",
  AI_PARTIAL: "Some participant feedback responses are not analysed yet.",
  OVER_CONSUMPTION: "Stock used is higher than the quantity given.",
  MIXED_UNITS: "Stock items use mixed units; per-item average is used.",
}

const BLOCKING_FLAGS: ScoreFlag[] = [
  "NO_FEEDBACK",
  "NO_IMPACT_DATA",
  "NO_BUDGET_CAP",
  "AI_PENDING",
  "AI_PARTIAL",
]

function toFiniteNumber(value: unknown): number {
  const num = typeof value === "number" ? value : Number(value)
  return Number.isFinite(num) ? num : 0
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10
}

export function formatScore(value: number, digits = 1): string {
  return Number.isFinite(value) ? value.toFixed(digits) : "0.0"
}

export function sanitizeImpactItems(raw: unknown): ImpactItem[] {
  if (!Array.isArray(raw)) return []

  return raw
    .map((entry, index) => {
      const item = (entry || {}) as Record<string, unknown>
      const name = typeof item.name === "string" ? item.name.trim().slice(0, 140) : ""
      const unitRaw = typeof item.unit === "string" ? item.unit.trim().slice(0, 20) : ""
      const qtyGiven = Math.max(0, round2(toFiniteNumber(item.qtyGiven)))
      const qtyUsed = Math.max(0, round2(toFiniteNumber(item.qtyUsed)))
      const id = typeof item.id === "string" && item.id.trim() ? item.id.trim() : `impact-${index}`

      return { id, name, unit: unitRaw || "ctn", qtyGiven, qtyUsed }
    })
    .filter((item) => item.name !== "" || item.qtyGiven > 0 || item.qtyUsed > 0)
}

export function parseImpactItems(raw: string | null | undefined): ImpactItem[] {
  if (!raw) return []
  try {
    return sanitizeImpactItems(JSON.parse(raw))
  } catch {
    return []
  }
}

export function computeSatisfactionComponent(feedbacks: ScoreFeedbackInput[]): SatisfactionComponent {
  const responses = feedbacks.length
  if (responses === 0) {
    return { earned: 0, max: EVENT_SUCCESS_WEIGHTS.satisfaction, index: 0, positiveRate: 0, responses: 0 }
  }

  let weightSum = 0
  let positiveCount = 0

  for (const feedback of feedbacks) {
    weightSum += SATISFACTION_WEIGHTS[feedback.satisfaction] ?? DEFAULT_SATISFACTION_WEIGHT
    if (feedback.satisfaction === "EXTREMELY_SATISFIED" || feedback.satisfaction === "VERY_SATISFIED") {
      positiveCount += 1
    }
  }

  const index = weightSum / responses
  const earned = round2((index / 100) * EVENT_SUCCESS_WEIGHTS.satisfaction)

  return {
    earned,
    max: EVENT_SUCCESS_WEIGHTS.satisfaction,
    index: round2(index),
    positiveRate: round2((positiveCount / responses) * 100),
    responses,
  }
}

export function computeImpactComponent(items: ImpactItem[]): { component: ImpactComponent; flags: ScoreFlag[] } {
  const flags: ScoreFlag[] = []
  const given = round2(items.reduce((sum, item) => sum + item.qtyGiven, 0))
  const used = round2(items.reduce((sum, item) => sum + item.qtyUsed, 0))

  const scoredRows = items.filter((item) => item.qtyGiven > 0)
  const hasOverConsumption = items.some((item) => item.qtyUsed > item.qtyGiven)
  const units = new Set(
    scoredRows.map((item) => item.unit.trim().toLowerCase()).filter((unit) => unit.length > 0)
  )
  const mixedUnits = units.size > 1

  let achievementRatio = 0

  if (scoredRows.length === 0) {
    flags.push("NO_IMPACT_DATA")
  } else if (mixedUnits) {
    flags.push("MIXED_UNITS")
    achievementRatio =
      scoredRows.reduce(
        (sum, item) => sum + Math.min(item.qtyUsed, item.qtyGiven) / item.qtyGiven,
        0
      ) / scoredRows.length
  } else {
    const totalGiven = scoredRows.reduce((sum, item) => sum + item.qtyGiven, 0)
    const totalUsed = scoredRows.reduce((sum, item) => sum + Math.min(item.qtyUsed, item.qtyGiven), 0)
    achievementRatio = totalGiven > 0 ? totalUsed / totalGiven : 0
  }

  if (hasOverConsumption) flags.push("OVER_CONSUMPTION")

  return {
    component: {
      earned: round2(achievementRatio * EVENT_SUCCESS_WEIGHTS.impact),
      max: EVENT_SUCCESS_WEIGHTS.impact,
      given,
      used,
      achievement: round2(achievementRatio * 100),
    },
    flags,
  }
}

export function computeBudgetComponent(
  budgetCap: number | null | undefined,
  totalClaimAmount: number | null | undefined
): { component: BudgetComponent; flags: ScoreFlag[] } {
  const flags: ScoreFlag[] = []
  const claims = Math.max(0, round2(toFiniteNumber(totalClaimAmount)))
  const cap = Number.isFinite(Number(budgetCap)) && Number(budgetCap) > 0 ? round2(Number(budgetCap)) : null

  if (cap === null) {
    return {
      component: {
        earned: 0,
        max: EVENT_SUCCESS_WEIGHTS.budget,
        cap: null,
        claims,
        ratio: null,
      },
      flags: ["NO_BUDGET_CAP"],
    }
  }

  const ratio = round2(claims / cap)
  let earned: number = EVENT_SUCCESS_WEIGHTS.budget

  if (claims > cap) {
    flags.push("OVER_BUDGET")
    // Linear penalty: full marks at or below the cap, zero once claims reach 2x the cap.
    earned = round2(EVENT_SUCCESS_WEIGHTS.budget * Math.max(0, (2 * cap - claims) / cap))
  }

  return {
    component: {
      earned,
      max: EVENT_SUCCESS_WEIGHTS.budget,
      cap,
      claims,
      ratio,
    },
    flags,
  }
}

export function isSentimentLabel(value: unknown): value is SentimentLabel {
  return value === "GOOD" || value === "NEUTRAL" || value === "BAD"
}

export function computeSuggestionComponent(
  feedbacks: ScoreFeedbackInput[]
): { component: SuggestionComponent; flags: ScoreFlag[] } {
  const flags: ScoreFlag[] = []
  const responses = feedbacks.length

  let good = 0
  let neutral = 0
  let bad = 0

  for (const feedback of feedbacks) {
    if (feedback.aiSentiment === "GOOD") good += 1
    else if (feedback.aiSentiment === "NEUTRAL") neutral += 1
    else if (feedback.aiSentiment === "BAD") bad += 1
  }

  const analyzed = good + neutral + bad
  const scoreSum = good * SENTIMENT_POINTS.GOOD + neutral * SENTIMENT_POINTS.NEUTRAL + bad * SENTIMENT_POINTS.BAD
  const index = analyzed > 0 ? scoreSum / analyzed : 0

  if (responses === 0) {
    flags.push("NO_FEEDBACK")
  } else if (analyzed === 0) {
    flags.push("AI_PENDING")
  } else if (analyzed < responses) {
    flags.push("AI_PARTIAL")
  }

  return {
    component: {
      earned: round2(index * EVENT_SUCCESS_WEIGHTS.suggestion),
      max: EVENT_SUCCESS_WEIGHTS.suggestion,
      index: round2(index * 100),
      good,
      neutral,
      bad,
      analyzed,
      responses,
    },
    flags,
  }
}

export function buildEventScoreBreakdown(input: BuildScoreInput): EventScoreBreakdown {
  const feedbacks = Array.isArray(input.feedbacks) ? input.feedbacks : []

  const satisfaction = computeSatisfactionComponent(feedbacks)
  const impactResult = computeImpactComponent(sanitizeImpactItems(input.impactItems ?? []))
  const budgetResult = computeBudgetComponent(input.budgetCap, input.totalClaimAmount)
  const suggestionResult = computeSuggestionComponent(feedbacks)

  const flags = Array.from(
    new Set<ScoreFlag>([
      ...(satisfaction.responses === 0 ? (["NO_FEEDBACK"] as ScoreFlag[]) : []),
      ...impactResult.flags,
      ...budgetResult.flags,
      ...suggestionResult.flags,
    ])
  )

  const total = round2(
    satisfaction.earned +
      impactResult.component.earned +
      budgetResult.component.earned +
      suggestionResult.component.earned
  )

  const computedAt =
    input.computedAt instanceof Date
      ? input.computedAt.toISOString()
      : typeof input.computedAt === "string"
        ? input.computedAt
        : new Date().toISOString()

  return {
    version: 1,
    components: {
      satisfaction,
      impact: impactResult.component,
      budget: budgetResult.component,
      suggestion: suggestionResult.component,
    },
    total,
    computedAt,
    flags,
  }
}

export function parseScoreBreakdown(raw: string | null | undefined): EventScoreBreakdown | null {
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as EventScoreBreakdown
    if (!parsed || typeof parsed !== "object") return null
    if (!parsed.components || typeof parsed.components !== "object") return null
    if (typeof parsed.total !== "number" || !Number.isFinite(parsed.total)) return null
    return parsed
  } catch {
    return null
  }
}

export function parseScoreFlags(raw: string | null | undefined): ScoreFlag[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed.filter((flag) => flag in SCORE_FLAG_LABELS) as ScoreFlag[]) : []
  } catch {
    return []
  }
}

/** Flags that block submitting the report for approval. */
export function getScoreMissingRequirements(
  flags: ScoreFlag[] | EventScoreBreakdown | null | undefined
): string[] {
  const list: ScoreFlag[] = Array.isArray(flags)
    ? flags
    : flags && typeof flags === "object" && Array.isArray(flags.flags)
      ? flags.flags
      : []

  return BLOCKING_FLAGS.filter((flag) => list.includes(flag)).map((flag) => SCORE_FLAG_LABELS[flag])
}

export function isScoreLocked(status: string | null | undefined): boolean {
  return status === "SUBMITTED" || status === "APPROVED"
}
