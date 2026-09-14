export type GMPCategory = "QC" | "PRODUCTION" | "MAINTENANCE" | "SECURITY" | "LOGISTICS"

export type GMPSubmissionStatus =
  | "UPCOMING" // Submission window is still in the future or not yet due today
  | "NOT_SUBMITTED" // Due today, within open submission window
  | "DRAFT" // Has an unfinished user draft
  | "SUBMITTED_ON_TIME" // Submitted before or at deadline
  | "SUBMITTED_LATE" // Submitted after deadline
  | "MISSING_OVERDUE" // Deadline has passed and no record exists
  | "NOT_APPLICABLE" // Approved shutdown or non-operational exception
  | "UNCONFIGURED" // "Jadual belum ditetapkan"

export type GMPVerificationStatus =
  | "NOT_REQUIRED" // Form does not have a verification workflow
  | "PENDING" // Submitted but not yet verified
  | "VERIFIED" // Verified by supervisor/manager
  | "REJECTED" // Verification rejected (if supported)

export type GMPFrequency =
  | "DAILY"
  | "PER_SHIFT"
  | "WEEKLY"
  | "MONTHLY"
  | "SCHEDULED_PM"
  | "EVENT_BASED"
  | "UNCONFIGURED"

export interface GMPScheduleRule {
  formType: string // Slug matching route e.g. "fuv", "cleaning"
  formCode: string // Standard code e.g. "SGMP/19/FUV"
  formTitle: string // Descriptive title
  category: GMPCategory
  frequency: GMPFrequency
  shifts?: string[] // e.g. ["DAY", "NIGHT"] or ["AM", "PM"]
  sections?: string[] // e.g. for cleaning: 9 sections
  lines?: string[] // e.g. ["Line 1", "Line 2"] or ["800ML", "425ML"]
  deadlineTime?: string // 24-hr format "HH:mm" in MYT (Asia/Kuala_Lumpur)
  deadlineNextDayHours?: number // For night shifts spanning midnight
  requiresVerification: boolean
  route: string // Base route e.g. "/forms/maintenance/fuv"
  description?: string
  location?: string
  notes?: string
}

export interface GMPObligation {
  id: string // Stable unique identifier e.g. "fuv:2026-09-14:DAY"
  formType: string
  formCode: string
  formTitle: string
  category: GMPCategory
  targetDate: string // YYYY-MM-DD in MYT
  reportingPeriodLabel: string // Human readable period representation
  frequency: GMPFrequency
  deadline: string // ISO string or MYT formatted datetime
  isDeadlinePassed: boolean
  section?: string
  shift?: string
  line?: string
  equipment?: string
  location?: string

  // Two-dimensional statuses
  submissionStatus: GMPSubmissionStatus
  verificationStatus: GMPVerificationStatus

  // Record details when matched
  recordId?: string | null
  submittedAt?: string | null
  submittedBy?: string | null
  verifiedBy?: string | null
  verifiedAt?: string | null

  // Draft details
  hasDraft: boolean
  draftUpdatedAt?: string | null

  // Action links
  actionUrl: string
  actionLabel: "Isi borang" | "Sambung draft" | "Lihat rekod" | "Semak / Sahkan" | "Jadual belum ditetapkan"
  canAction: boolean
  attentionPriority: number // 1 (highest) to 7 (lowest) for sorting
}

export interface ComplianceDaySummary {
  date: string // YYYY-MM-DD
  dayOfMonth: number
  dayOfWeek: number // 0 = Sun, 1 = Mon ...
  isCurrentMonth: boolean
  isToday: boolean
  isFuture: boolean

  // Counts
  totalExpected: number // Configured obligations with active deadlines
  totalSubmitted: number // All submitted records (on-time + late)
  totalMissing: number // Deadline passed without submission
  totalPendingVerification: number // Strictly a subset of submitted
  totalDraft: number
  totalUnconfigured: number

  hasAttention: boolean
  obligations: GMPObligation[]
}

export interface ComplianceSummaryMetrics {
  passedDeadlineExpected: number // Total obligations whose deadline has passed
  submittedOnTime: number
  submittedLate: number
  missingAfterDeadline: number
  pendingVerification: number // Strictly a subset of submitted
  onTimeRate: number | null // Percentage 0-100 or null if denominator is 0
  totalUnconfiguredForms: number
}

export interface GMPFilterState {
  category: string // "ALL" | GMPCategory
  formType: string // "ALL" | formType slug
  location: string // "ALL" | location name
  shift: string // "ALL" | "DAY" | "NIGHT" | "AM" | "PM" | "Pagi" | "Malam"
  statusFilter: "ALL" | "ATTENTION_ONLY" | "OVERDUE" | "PENDING_VERIFY"
}

export interface MonthDataPayload {
  year: number
  month: number // 1-12
  monthName: string
  generatedAt: string
  timezone: string
  metrics: ComplianceSummaryMetrics
  days: ComplianceDaySummary[]
  formsRegistry: GMPScheduleRule[]
  userPermissions: {
    canForms: boolean
    canSummary: boolean
    canReports: boolean
    canDashboard: boolean
    isSuperAdmin: boolean
  }
}
