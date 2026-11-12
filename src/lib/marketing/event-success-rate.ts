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

export type ImpactItemType = "WATER" | "MERCHANDISE"

export interface ImpactItem {
  id: string
  type: ImpactItemType
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
  waterUtilisation: number
  merchandiseUtilisation: number
  merchandiseCount?: number
  waterGiven?: number
  waterUsed?: number
}

export type BudgetCategoryKey = "meals" | "accommodation" | "transportation" | "miscellaneous" | "pettyCash"

export const BUDGET_CATEGORY_LABELS: Record<BudgetCategoryKey, string> = {
  meals: "Meals",
  accommodation: "Accommodation",
  transportation: "Transportation",
  miscellaneous: "Miscellaneous",
  pettyCash: "Petty Cash",
}

export interface EventCategoryBudgets {
  meals: number
  accommodation: number
  transportation: number
  miscellaneous: number
  pettyCash: number
}

export interface CategoryBudgetDetail {
  category: BudgetCategoryKey
  label: string
  approved: number
  actual: number
  variance: number
  diff: number
  pct: number
  score: number
  status: "within" | "over" | "unused" | "used" | "zero"
  statusLabel: string
}

export interface BudgetComponent {
  earned: number
  max: number
  totalApproved: number
  totalActual: number
  totalCategoryScore: number
  categories: Record<BudgetCategoryKey, CategoryBudgetDetail>
  categoryList: CategoryBudgetDetail[]
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
  categoryBudgets?: EventCategoryBudgets | string | null
  claimBreakdown?: unknown
  hasBudgetBeenSet?: boolean
  impactItems?: unknown
  totalClaimAmount?: number | null
  computedAt?: Date | string
}

export const SCORE_FLAG_LABELS: Record<ScoreFlag, string> = {
  NO_FEEDBACK: "No public feedback responses yet.",
  NO_IMPACT_DATA: "No stock / impact items recorded.",
  NO_BUDGET_CAP: "Category budget allocations have not been set by Finance.",
  OVER_BUDGET: "Claims exceed approved category budget allocations.",
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
      const rawType = typeof item.type === "string" ? item.type.trim().toUpperCase() : ""
      const type: ImpactItemType = rawType === "MERCHANDISE" ? "MERCHANDISE" : "WATER"
      const name = typeof item.name === "string" ? item.name.trim().slice(0, 140) : ""
      const unitRaw = typeof item.unit === "string" ? item.unit.trim().slice(0, 20) : ""
      const qtyGiven = Math.max(0, round2(toFiniteNumber(item.qtyGiven)))
      const rawQtyUsed = Math.max(0, round2(toFiniteNumber(item.qtyUsed)))
      // Prevent quantities used/given from exceeding quantities brought
      const qtyUsed = qtyGiven > 0 ? Math.min(rawQtyUsed, qtyGiven) : rawQtyUsed
      const id = typeof item.id === "string" && item.id.trim() ? item.id.trim() : `impact-${index}`

      return { id, type, name, unit: unitRaw || (type === "WATER" ? "ctn" : "pcs"), qtyGiven, qtyUsed }
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

export interface StaffInvolvedEntry {
  name: string
  department: string
}

export const DEFAULT_STAFF_DEPARTMENTS = [
  "MARKETING",
  "LOGISTIC",
  "HUMAN RESOURCES",
  "IT",
  "FINANCE",
  "PRODUCTION (RANTAU)",
  "PRODUCTION (PEDAS)",
  "ONLINE SALES",
  "CORPORATE",
  "BRAND DEVELOPMENT",
]

export function parseStaffInvolved(raw: unknown): StaffInvolvedEntry[] {
  if (!raw) return []
  let arr: unknown = raw
  if (typeof raw === "string") {
    try {
      arr = JSON.parse(raw)
    } catch {
      return []
    }
  }
  if (!Array.isArray(arr)) return []
  return arr.map((item) => {
    if (typeof item === "string") {
      const str = item.trim()
      if (DEFAULT_STAFF_DEPARTMENTS.includes(str.toUpperCase())) {
        return { name: "", department: str.toUpperCase() }
      }
      return { name: str, department: "MARKETING" }
    }
    if (item && typeof item === "object") {
      const obj = item as Record<string, unknown>
      return {
        name: typeof obj.name === "string" ? obj.name : "",
        department: typeof obj.department === "string" ? obj.department : "MARKETING",
      }
    }
    return { name: "", department: "MARKETING" }
  })
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

  const waterItems = items.filter((item) => (item.type || "WATER") === "WATER")
  const merchItems = items.filter((item) => item.type === "MERCHANDISE")

  // 1. Water Utilisation Calculation
  // Water Utilisation (%) = (Total Water Used / Total Water Brought) × 100
  const totalWaterBrought = waterItems.reduce((sum, item) => sum + item.qtyGiven, 0)
  const totalWaterUsed = waterItems.reduce(
    (sum, item) => sum + Math.min(item.qtyUsed, item.qtyGiven),
    0
  )
  const waterUtilisation =
    totalWaterBrought > 0 ? (totalWaterUsed / totalWaterBrought) * 100 : 0

  // 2. Merchandise Distribution Calculation
  // Merchandise weightage dynamically distributed based on the number of different merchandise types brought to the event.
  // Each merchandise type carries an equal weightage: 100% / Number of Merchandise Types
  // Individual Merchandise Utilisation (%) = (Quantity Given / Quantity Brought) × 100
  // Overall Merchandise Utilisation (%) = Sum of (Individual Merchandise Utilisation × Individual Merchandise Weightage)
  const scoredMerchItems = merchItems.filter((item) => item.qtyGiven > 0)
  const numMerchTypes = scoredMerchItems.length

  let merchandiseUtilisation = 0
  if (numMerchTypes > 0) {
    const individualUtilisations = scoredMerchItems.map(
      (item) => (Math.min(item.qtyUsed, item.qtyGiven) / item.qtyGiven) * 100
    )
    const sumUtilisation = individualUtilisations.reduce((acc, curr) => acc + curr, 0)
    merchandiseUtilisation = sumUtilisation / numMerchTypes
  }

  const hasOverConsumption = items.some((item) => item.qtyUsed > item.qtyGiven)
  if (hasOverConsumption) flags.push("OVER_CONSUMPTION")

  if (totalWaterBrought === 0 && numMerchTypes === 0) {
    flags.push("NO_IMPACT_DATA")
  }

  // 3. Final 20% Calculation
  // Water and merchandise utilisation must contribute equally to the overall 20% component.
  // Formula:
  // Items & Merchandise Score = ((Water Utilisation % + Overall Merchandise Utilisation %) / 2) × 20%
  const averageUtilisation = (waterUtilisation + merchandiseUtilisation) / 2
  const earned = round2((averageUtilisation / 100) * EVENT_SUCCESS_WEIGHTS.impact)

  return {
    component: {
      earned,
      max: EVENT_SUCCESS_WEIGHTS.impact,
      given,
      used,
      achievement: round2(averageUtilisation),
      waterUtilisation: round2(waterUtilisation),
      merchandiseUtilisation: round2(merchandiseUtilisation),
      merchandiseCount: numMerchTypes,
      waterGiven: round2(totalWaterBrought),
      waterUsed: round2(totalWaterUsed),
    },
    flags,
  }
}

export function normalizeClaimCategory(catRaw: unknown): BudgetCategoryKey {
  const c = typeof catRaw === "string" ? catRaw.trim().toUpperCase().replace(/[\s_-]+/g, "") : ""
  if (c === "MEAL" || c === "MEALS") return "meals"
  if (c === "ACCOMMODATION" || c === "HOTEL") return "accommodation"
  if (
    c === "TRANSPORTATION" ||
    c === "TRANSPORT" ||
    c === "PETROL" ||
    c === "TNG" ||
    c === "FUEL" ||
    c === "TOLL"
  ) {
    return "transportation"
  }
  if (c === "PETTYCASH" || c === "PETTY") return "pettyCash"
  return "miscellaneous"
}

export const CLAIM_CATEGORY_MAP: Record<BudgetCategoryKey, string> = {
  meals: "MEALS",
  accommodation: "ACCOMMODATION",
  transportation: "TRANSPORTATION",
  miscellaneous: "MISCELLANEOUS",
  pettyCash: "PETTY CASH",
}

export function getClaimCategoryFormValue(catRaw: unknown): string {
  if (!catRaw) return "MEALS"
  const normalizedKey = normalizeClaimCategory(catRaw)
  return CLAIM_CATEGORY_MAP[normalizedKey] || "MEALS"
}

export function aggregateClaimsByCategory(claimBreakdown: unknown): Record<BudgetCategoryKey, number> {
  const totals: Record<BudgetCategoryKey, number> = {
    meals: 0,
    accommodation: 0,
    transportation: 0,
    miscellaneous: 0,
    pettyCash: 0,
  }

  if (!Array.isArray(claimBreakdown)) return totals

  for (const group of claimBreakdown) {
    if (!group || typeof group !== "object") continue
    const items = (group as Record<string, unknown>).items
    if (!Array.isArray(items)) continue
    for (const item of items) {
      if (!item || typeof item !== "object") continue
      const rawItem = item as Record<string, unknown>
      const amount = Math.max(0, round2(toFiniteNumber(rawItem.amount)))
      if (amount <= 0) continue
      const catKey = normalizeClaimCategory(rawItem.category)
      totals[catKey] = round2(totals[catKey] + amount)
    }
  }

  return totals
}

export function parseCategoryBudgets(
  raw: unknown,
  legacyBudgetCap?: number | null
): EventCategoryBudgets {
  const defaults: EventCategoryBudgets = {
    meals: 0,
    accommodation: 0,
    transportation: 0,
    miscellaneous: 0,
    pettyCash: 0,
  }

  if (!raw) {
    return defaults
  }

  try {
    const obj = (typeof raw === "string" ? JSON.parse(raw) : raw) as Record<string, unknown>
    if (!obj || typeof obj !== "object") return defaults

    return {
      meals: Math.max(0, round2(toFiniteNumber(obj.meals))),
      accommodation: Math.max(0, round2(toFiniteNumber(obj.accommodation))),
      transportation: Math.max(0, round2(toFiniteNumber(obj.transportation))),
      miscellaneous: Math.max(0, round2(toFiniteNumber(obj.miscellaneous))),
      pettyCash: Math.max(0, round2(toFiniteNumber(obj.pettyCash))),
    }
  } catch {
    return defaults
  }
}

export function computeCategoryScore(
  category: BudgetCategoryKey,
  approved: number,
  actual: number
): CategoryBudgetDetail {
  const label = BUDGET_CATEGORY_LABELS[category]
  const safeApproved = Math.max(0, round2(toFiniteNumber(approved)))
  const safeActual = Math.max(0, round2(toFiniteNumber(actual)))
  const variance = round2(safeActual - safeApproved)
  const diff = round2(safeApproved - safeActual)

  if (category === "pettyCash") {
    // Special calculation for Petty Cash:
    // "If no petty cash is used, award the full 20 points."
    if (safeActual === 0) {
      return {
        category,
        label,
        approved: safeApproved,
        actual: 0,
        variance,
        diff,
        pct: 0,
        score: 20,
        status: "unused",
        statusLabel: "Zero Usage (RM 0.00 spent)",
      }
    }

    // Actual spending > 0:
    // "If an approved budget is RM0 but actual spending is greater than RM0, award 0 points."
    if (safeApproved === 0) {
      return {
        category,
        label,
        approved: 0,
        actual: safeActual,
        variance,
        diff,
        pct: 100,
        score: 0,
        status: "over",
        statusLabel: `Unbudgeted (RM ${safeActual.toFixed(2)})`,
      }
    }

    // "Petty Cash Usage (%) = (Actual Petty Cash Used / Approved Petty Cash Allocation) × 100"
    // Apply the same scoring legend:
    // greater than 0% but less than 50% = 15 points
    // 50% to less than 75% = 10 points
    // 75% to 100% = 5 points
    // greater than 100% = 0 points
    const usagePct = round2((safeActual / safeApproved) * 100)
    let score = 0
    if (usagePct > 0 && usagePct < 50) {
      score = 15
    } else if (usagePct >= 50 && usagePct < 75) {
      score = 10
    } else if (usagePct >= 75 && usagePct <= 100) {
      score = 5
    } else {
      score = 0
    }

    return {
      category,
      label,
      approved: safeApproved,
      actual: safeActual,
      variance,
      diff,
      pct: usagePct,
      score,
      status: "used",
      statusLabel: `${usagePct.toFixed(1)}% Used`,
    }
  }

  // Categories A: Meals, Accommodation, Transportation, Miscellaneous
  // Handle RM0 approved budget:
  if (safeApproved === 0) {
    if (safeActual === 0) {
      // "If an approved budget is RM0 and actual spending is also RM0, award 20 points."
      return {
        category,
        label,
        approved: 0,
        actual: 0,
        variance: 0,
        diff: 0,
        pct: 0,
        score: 20,
        status: "zero",
        statusLabel: "RM 0.00 Budget (No Spending)",
      }
    } else {
      // "If an approved budget is RM0 but actual spending is greater than RM0, award 0 points."
      return {
        category,
        label,
        approved: 0,
        actual: safeActual,
        variance,
        diff,
        pct: 100,
        score: 0,
        status: "over",
        statusLabel: `Unbudgeted (+100%)`,
      }
    }
  }

  // safeApproved > 0:
  // "Only penalise categories when actual spending exceeds the approved allocation."
  if (safeActual <= safeApproved) {
    // 0% or below (within budget) = 20 points
    const overbudgetPct = round2(((safeActual - safeApproved) / safeApproved) * 100)
    return {
      category,
      label,
      approved: safeApproved,
      actual: safeActual,
      variance,
      diff,
      pct: Math.min(0, overbudgetPct),
      score: 20,
      status: "within",
      statusLabel: diff === 0 ? "Exact Budget" : `Within Budget (RM ${diff.toFixed(2)} left)`,
    }
  }

  // safeActual > safeApproved:
  // Overbudget (%) = ((Actual Spending - Approved Budget) / Approved Budget) × 100
  const overbudgetPct = round2(((safeActual - safeApproved) / safeApproved) * 100)
  let score = 0
  if (overbudgetPct > 0 && overbudgetPct < 50) {
    score = 15
  } else if (overbudgetPct >= 50 && overbudgetPct < 75) {
    score = 10
  } else if (overbudgetPct >= 75 && overbudgetPct <= 100) {
    score = 5
  } else {
    score = 0
  }

  return {
    category,
    label,
    approved: safeApproved,
    actual: safeActual,
    variance,
    diff,
    pct: overbudgetPct,
    score,
    status: "over",
    statusLabel: `+${overbudgetPct.toFixed(1)}% Over`,
  }
}

export interface ComputeBudgetInput {
  categoryBudgets?: EventCategoryBudgets | string | null
  claimBreakdown?: unknown
  actualClaimsByCategory?: Record<BudgetCategoryKey, number>
  budgetCap?: number | null
  totalClaimAmount?: number | null
  hasBudgetBeenSet?: boolean
}

export function computeBudgetComponent(
  input: ComputeBudgetInput | number | null | undefined,
  legacyClaimAmount?: number | null | undefined
): { component: BudgetComponent; flags: ScoreFlag[] } {
  const flags: ScoreFlag[] = []

  let categoryBudgets: EventCategoryBudgets
  let actualSpending: Record<BudgetCategoryKey, number>
  let hasBudgetBeenSet = false

  if (input !== null && typeof input === "object" && !("toFixed" in input)) {
    categoryBudgets = parseCategoryBudgets(input.categoryBudgets, input.budgetCap)
    actualSpending = input.actualClaimsByCategory
      ? input.actualClaimsByCategory
      : aggregateClaimsByCategory(input.claimBreakdown)
    hasBudgetBeenSet =
      typeof input.hasBudgetBeenSet === "boolean"
        ? input.hasBudgetBeenSet
        : Boolean(
            (input.categoryBudgets !== undefined && input.categoryBudgets !== null) ||
            (input.budgetCap !== undefined && input.budgetCap !== null)
          )
  } else {
    // Legacy numeric call: computeBudgetComponent(budgetCap, totalClaimAmount)
    const legacyCap = Number.isFinite(Number(input)) ? Number(input) : null
    const legacyClaims = Math.max(0, round2(toFiniteNumber(legacyClaimAmount)))
    hasBudgetBeenSet = legacyCap !== null
    categoryBudgets = {
      meals: legacyCap ? round2(legacyCap * 0.25) : 0,
      accommodation: legacyCap ? round2(legacyCap * 0.35) : 0,
      transportation: legacyCap ? round2(legacyCap * 0.25) : 0,
      miscellaneous: legacyCap ? round2(legacyCap * 0.15) : 0,
      pettyCash: 0,
    }
    actualSpending = {
      meals: round2(legacyClaims * 0.25),
      accommodation: round2(legacyClaims * 0.35),
      transportation: round2(legacyClaims * 0.25),
      miscellaneous: round2(legacyClaims * 0.15),
      pettyCash: 0,
    }
  }

  const categoryKeys: BudgetCategoryKey[] = [
    "meals",
    "accommodation",
    "transportation",
    "miscellaneous",
    "pettyCash",
  ]

  const categories = {} as Record<BudgetCategoryKey, CategoryBudgetDetail>
  const categoryList: CategoryBudgetDetail[] = []
  let totalCategoryScore = 0
  let totalApproved = 0
  let totalActual = 0

  for (const catKey of categoryKeys) {
    const approved = categoryBudgets[catKey] || 0
    const actual = actualSpending[catKey] || 0
    totalApproved = round2(totalApproved + approved)
    totalActual = round2(totalActual + actual)

    const detail = computeCategoryScore(catKey, approved, actual)
    categories[catKey] = detail
    categoryList.push(detail)
    totalCategoryScore += detail.score
  }

  if (!hasBudgetBeenSet) {
    flags.push("NO_BUDGET_CAP")
  }

  const hasAnyOverbudget = categoryKeys.some((k) => categories[k].status === "over")
  if (hasAnyOverbudget || (totalApproved > 0 && totalActual > totalApproved)) {
    flags.push("OVER_BUDGET")
  }

  // Final Budget Performance Score = (Total Category Score / 100) * 15%
  const earned = hasBudgetBeenSet
    ? round2((totalCategoryScore / 100) * EVENT_SUCCESS_WEIGHTS.budget)
    : 0

  const ratio = totalApproved > 0 ? round2(totalActual / totalApproved) : null

  return {
    component: {
      earned,
      max: EVENT_SUCCESS_WEIGHTS.budget,
      totalApproved,
      totalActual,
      totalCategoryScore,
      categories,
      categoryList,
      cap: hasBudgetBeenSet ? totalApproved : null,
      claims: totalActual,
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
  const budgetResult = computeBudgetComponent({
    categoryBudgets: input.categoryBudgets,
    claimBreakdown: input.claimBreakdown,
    budgetCap: input.budgetCap,
    totalClaimAmount: input.totalClaimAmount,
    hasBudgetBeenSet: input.hasBudgetBeenSet,
  })
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
