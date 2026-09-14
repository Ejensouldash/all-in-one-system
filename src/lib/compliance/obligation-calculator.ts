import {
  ComplianceDaySummary,
  ComplianceSummaryMetrics,
  GMPObligation,
  GMPScheduleRule,
  GMPCategory,
} from "./types"
import { GMP_FORM_REGISTRY, GMP_SECTIONS_LIST } from "./gmp-registry"

/**
 * Returns current timestamp in Asia/Kuala_Lumpur (MYT, UTC+8).
 */
export function getMYTDate(date = new Date()): Date {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000
  return new Date(utc + 8 * 3600000)
}

export function formatMYTDateString(date = new Date()): string {
  const myt = getMYTDate(date)
  const y = myt.getFullYear()
  const m = String(myt.getMonth() + 1).padStart(2, "0")
  const d = String(myt.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

export function padZero(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

export interface RawComplianceRecords {
  lighting: any[]
  finishedGoods: any[]
  wasteManagement: any[]
  wasteDisposal: any[]
  foodHandler: any[]
  chemicalControl: any[]
  cleaning: any[]
  maintenanceRecord: any[]
  pmir: any[]
  pmr: any[]
  fbsr: any[]
  mgl: any[]
  mgb: any[]
  mwl: any[]
  mwb: any[]
  mpl: any[]
  mpb: any[]
  lfcr: any[]
  ivvi: any[]
  vchif: any[]
  dqip: any[]
  qcdr: any[]
  pcs: any[]
  pcdm: any[]
  ftdm: any[]
  fpir: any[]
  wqtr: any[]
  fuv: any[]
  pmOccurrences: any[]
  drafts: Array<{ formType: string; updatedAt: Date | string }>
}

/**
 * Normalize Date into YYYY-MM-DD string in MYT.
 */
export function toMYTDateKey(d: Date | string | null | undefined): string {
  if (!d) return ""
  if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d
  const parsed = new Date(d)
  if (Number.isNaN(parsed.getTime())) return ""
  return formatMYTDateString(parsed)
}

/**
 * Helper to build deadline ISO string in MYT (+08:00).
 */
function buildDeadlineISO(dateStr: string, timeStr = "23:59", nextDayHours = 0): string {
  const [year, month, day] = dateStr.split("-").map(Number)
  const d = new Date(Date.UTC(year, month - 1, day))
  if (nextDayHours > 0) {
    d.setUTCDate(d.getUTCDate() + 1)
  }
  const y = d.getUTCFullYear()
  const m = padZero(d.getUTCMonth() + 1)
  const dt = padZero(d.getUTCDate())
  return `${y}-${m}-${dt}T${timeStr}:00+08:00`
}

/**
 * Generates all obligations and evaluates statuses for a given month.
 */
export function calculateMonthCompliance(
  year: number,
  month: number, // 1-12
  records: RawComplianceRecords,
  nowMYT = getMYTDate()
): {
  days: ComplianceDaySummary[]
  metrics: ComplianceSummaryMetrics
} {
  const daysInMonth = getDaysInMonth(year, month)
  const todayKey = formatMYTDateString(nowMYT)
  const currentMonthPrefix = `${year}-${padZero(month)}`
  const nowISO = nowMYT.toISOString()

  // Pre-index user drafts by formType
  const draftMap = new Map<string, { updatedAt: string }>()
  for (const dr of records.drafts || []) {
    draftMap.set(dr.formType, {
      updatedAt: typeof dr.updatedAt === "string" ? dr.updatedAt : dr.updatedAt.toISOString(),
    })
  }

  // Pre-index records by formType and date key
  const recordsByForm = new Map<string, any[]>()
  recordsByForm.set("lighting", records.lighting || [])
  recordsByForm.set("finished-goods", records.finishedGoods || [])
  recordsByForm.set("waste-management", records.wasteManagement || [])
  recordsByForm.set("waste-disposal", records.wasteDisposal || [])
  recordsByForm.set("food-handler", records.foodHandler || [])
  recordsByForm.set("chemical-control", records.chemicalControl || [])
  recordsByForm.set("cleaning", records.cleaning || [])
  recordsByForm.set("maintenance-record", records.maintenanceRecord || [])
  recordsByForm.set("pmir", records.pmir || [])
  recordsByForm.set("pmr", records.pmr || [])
  recordsByForm.set("fbsr", records.fbsr || [])
  recordsByForm.set("mgl", records.mgl || [])
  recordsByForm.set("mgb", records.mgb || [])
  recordsByForm.set("mwl", records.mwl || [])
  recordsByForm.set("mwb", records.mwb || [])
  recordsByForm.set("mpl", records.mpl || [])
  recordsByForm.set("mpb", records.mpb || [])
  recordsByForm.set("lfcr", records.lfcr || [])
  recordsByForm.set("ivvi", records.ivvi || [])
  recordsByForm.set("vchif", records.vchif || [])
  recordsByForm.set("dqip", records.dqip || [])
  recordsByForm.set("qcdr", records.qcdr || [])
  recordsByForm.set("pcs", records.pcs || [])
  recordsByForm.set("pcdm", records.pcdm || [])
  recordsByForm.set("ftdm", records.ftdm || [])
  recordsByForm.set("fpir", records.fpir || [])
  recordsByForm.set("wqtr", records.wqtr || [])
  recordsByForm.set("fuv", records.fuv || [])

  // Days array
  const days: ComplianceDaySummary[] = []

  let totalPassedDeadline = 0
  let totalSubmittedOnTime = 0
  let totalSubmittedLate = 0
  let totalMissingAfterDeadline = 0
  let totalPendingVerification = 0

  for (let day = 1; day <= daysInMonth; day++) {
    const dayStr = `${year}-${padZero(month)}-${padZero(day)}`
    const isToday = dayStr === todayKey
    const isFuture = dayStr > todayKey
    const dateObj = new Date(year, month - 1, day)
    const dayOfWeek = dateObj.getDay()

    const dayObligations: GMPObligation[] = []

    // -------------------------------------------------------------
    // 1. Confirmed Forms: FUV (SGMP/19/FUV) - 2 Shifts Daily
    // -------------------------------------------------------------
    const fuvRule = GMP_FORM_REGISTRY.find(r => r.formType === "fuv")!
    const fuvRecordsForDay = (records.fuv || []).filter(r => toMYTDateKey(r.date) === dayStr)

    for (const shift of ["DAY", "NIGHT"] as const) {
      const isNight = shift === "NIGHT"
      const deadlineISO = isNight
        ? buildDeadlineISO(dayStr, "07:00", 1)
        : buildDeadlineISO(dayStr, "19:00", 0)
      const isDeadlinePassed = new Date(deadlineISO) < nowMYT

      const matchedRec = fuvRecordsForDay.find(r => (r.shift || "").toUpperCase() === shift)
      const draft = draftMap.get("fuv")

      const ob = createObligation({
        rule: fuvRule,
        targetDate: dayStr,
        shift,
        deadlineISO,
        isDeadlinePassed,
        matchedRec,
        draft: !matchedRec ? draft : undefined,
        nowMYT,
        dayStr,
        reportingPeriodLabel: `${dayStr} (${shift})`,
      })
      dayObligations.push(ob)
    }

    // -------------------------------------------------------------
    // 2. Confirmed Forms: Cleaning (SGMP/05) - 9 Sections x 2 Shifts (AM/PM)
    // -------------------------------------------------------------
    const cleaningRule = GMP_FORM_REGISTRY.find(r => r.formType === "cleaning")!
    const cleaningRecordsForDay = (records.cleaning || []).filter(
      r => toMYTDateKey(r.date) === dayStr
    )

    for (const sec of GMP_SECTIONS_LIST) {
      for (const shift of ["AM", "PM"] as const) {
        const deadlineISO =
          shift === "AM"
            ? buildDeadlineISO(dayStr, "15:00", 0)
            : buildDeadlineISO(dayStr, "23:00", 0)
        const isDeadlinePassed = new Date(deadlineISO) < nowMYT

        const matchedRec = cleaningRecordsForDay.find(
          r =>
            r.section === sec.id &&
            (r.shift || "").toUpperCase().startsWith(shift)
        )
        const draft = draftMap.get(`cleaning:${sec.id}`)

        const ob = createObligation({
          rule: cleaningRule,
          targetDate: dayStr,
          section: sec.id,
          shift,
          deadlineISO,
          isDeadlinePassed,
          matchedRec,
          draft: !matchedRec ? draft : undefined,
          nowMYT,
          dayStr,
          reportingPeriodLabel: `${sec.name} (${shift})`,
        })
        dayObligations.push(ob)
      }
    }

    // -------------------------------------------------------------
    // 3. Confirmed Forms: Monthly Logs (MGL, MWL, MPL)
    // Only appear as an obligation on the LAST DAY of the month!
    // -------------------------------------------------------------
    const isLastDayOfMonth = day === daysInMonth
    if (isLastDayOfMonth) {
      const monthStrFormatted = `${year}-${padZero(month)}`
      const monthlyDeadlineISO = buildDeadlineISO(dayStr, "23:59", 0)
      const isDeadlinePassed = new Date(monthlyDeadlineISO) < nowMYT

      const monthlyTypes = ["mgl", "mwl", "mpl"] as const
      for (const mType of monthlyTypes) {
        const rule = GMP_FORM_REGISTRY.find(r => r.formType === mType)!
        const recList = recordsByForm.get(mType) || []
        // Match record by inspectionMonth or createdAt within current month
        const matchedRec = recList.find(r => {
          if (r.inspectionMonth && r.inspectionMonth.startsWith(monthStrFormatted)) return true
          const createdKey = toMYTDateKey(r.createdAt)
          return createdKey.startsWith(monthStrFormatted)
        })
        const draft = draftMap.get(mType)

        const ob = createObligation({
          rule,
          targetDate: dayStr,
          deadlineISO: monthlyDeadlineISO,
          isDeadlinePassed,
          matchedRec,
          draft: !matchedRec ? draft : undefined,
          nowMYT,
          dayStr,
          reportingPeriodLabel: `Bulan ${padZero(month)}/${year}`,
        })
        dayObligations.push(ob)
      }
    }

    // -------------------------------------------------------------
    // 4. Equipment PM: ReminderPMSchedule Occurrences (SGMP-03)
    // Synchronized with ReminderPMOccurrence records for this dueDate
    // -------------------------------------------------------------
    const occurrencesForDay = (records.pmOccurrences || []).filter(
      occ => occ.dueDate === dayStr
    )
    for (const occ of occurrencesForDay) {
      const rule = GMP_FORM_REGISTRY.find(r => r.formType === "pmir")!
      const deadlineISO = buildDeadlineISO(dayStr, "18:00", 0)
      const isDeadlinePassed = new Date(deadlineISO) < nowMYT
      const isCompleted = Boolean(occ.completedAt)

      const ob: GMPObligation = {
        id: `pm:${occ.id}`,
        formType: "pmir",
        formCode: "SGMP/03/PMIR",
        formTitle: `Preventive Maintenance - ${occ.equipment}`,
        category: "MAINTENANCE",
        targetDate: dayStr,
        reportingPeriodLabel: `${occ.equipment} (Jadual PM)`,
        frequency: "SCHEDULED_PM",
        deadline: deadlineISO,
        isDeadlinePassed,
        equipment: occ.equipment,
        submissionStatus: isCompleted
          ? occ.completedAt && new Date(occ.completedAt) > new Date(deadlineISO)
            ? "SUBMITTED_LATE"
            : "SUBMITTED_ON_TIME"
          : isDeadlinePassed
          ? "MISSING_OVERDUE"
          : isToday
          ? "NOT_SUBMITTED"
          : "UPCOMING",
        verificationStatus: occ.verifiedAt ? "VERIFIED" : isCompleted ? "PENDING" : "NOT_REQUIRED",
        recordId: occ.id,
        submittedAt: occ.completedAt ? new Date(occ.completedAt).toISOString() : null,
        submittedBy: occ.completedById,
        verifiedBy: occ.verifiedById,
        verifiedAt: occ.verifiedAt ? new Date(occ.verifiedAt).toISOString() : null,
        hasDraft: false,
        actionUrl: `/forms/maintenance/pmir?date=${dayStr}&equipment=${encodeURIComponent(
          occ.equipment
        )}`,
        actionLabel: isCompleted ? "Lihat rekod" : "Isi borang",
        canAction: true,
        attentionPriority: !isCompleted && isDeadlinePassed ? 1 : isCompleted && !occ.verifiedAt ? 4 : 6,
      }
      dayObligations.push(ob)
    }

    // -------------------------------------------------------------
    // 5. Event-based Forms: Logged occurrences for this day
    // (IVVI, VCHIF, MGB, MWB, MPB, Pallet-Transfer)
    // -------------------------------------------------------------
    const eventForms = ["ivvi", "vchif", "mgb", "mwb", "mpb"]
    for (const efType of eventForms) {
      const rule = GMP_FORM_REGISTRY.find(r => r.formType === efType)!
      const recList = (recordsByForm.get(efType) || []).filter(r => {
        const d = r.date || r.createdAt
        return toMYTDateKey(d) === dayStr
      })

      for (const rec of recList) {
        const ob = createObligation({
          rule,
          targetDate: dayStr,
          deadlineISO: buildDeadlineISO(dayStr, "23:59", 0),
          isDeadlinePassed: true,
          matchedRec: rec,
          nowMYT,
          dayStr,
          reportingPeriodLabel: `${dayStr} (Insiden/Ketibaan)`,
        })
        dayObligations.push(ob)
      }
    }

    // -------------------------------------------------------------
    // 6. Unconfigured Forms with Submissions or Active Drafts on this day
    // (Exposed so users can see submitted records or continue drafts,
    // but marked with status "UNCONFIGURED" to prevent false overdue alerts)
    // -------------------------------------------------------------
    for (const rule of GMP_FORM_REGISTRY) {
      if (rule.frequency !== "UNCONFIGURED") continue

      const recList = (recordsByForm.get(rule.formType) || []).filter(r => {
        const d = r.date || r.createdAt
        return toMYTDateKey(d) === dayStr
      })

      for (const rec of recList) {
        const ob = createObligation({
          rule,
          targetDate: dayStr,
          deadlineISO: buildDeadlineISO(dayStr, "23:59", 0),
          isDeadlinePassed: true,
          matchedRec: rec,
          nowMYT,
          dayStr,
          reportingPeriodLabel: `${dayStr} (Rekod Diserah)`,
        })
        dayObligations.push(ob)
      }
    }

    // Sort obligations by attention priority (1 = highest urgency)
    dayObligations.sort((a, b) => a.attentionPriority - b.attentionPriority)

    // Calculate day counts
    let dayExpected = 0
    let daySubmitted = 0
    let dayMissing = 0
    let dayPendingVerify = 0
    let dayDraft = 0
    let dayUnconfigured = 0

    for (const ob of dayObligations) {
      if (ob.submissionStatus === "UNCONFIGURED") {
        dayUnconfigured++
        continue
      }
      if (ob.frequency === "EVENT_BASED") {
        // Event-based records only count as submitted when present
        if (
          ob.submissionStatus === "SUBMITTED_ON_TIME" ||
          ob.submissionStatus === "SUBMITTED_LATE"
        ) {
          daySubmitted++
          if (ob.verificationStatus === "PENDING") {
            dayPendingVerify++
          }
        }
        continue
      }

      // Applicable scheduled obligation
      dayExpected++

      if (
        ob.submissionStatus === "SUBMITTED_ON_TIME" ||
        ob.submissionStatus === "SUBMITTED_LATE"
      ) {
        daySubmitted++
        if (ob.submissionStatus === "SUBMITTED_ON_TIME") {
          totalSubmittedOnTime++
        } else {
          totalSubmittedLate++
        }

        if (ob.verificationStatus === "PENDING") {
          dayPendingVerify++
          totalPendingVerification++
        }

        if (ob.isDeadlinePassed) {
          totalPassedDeadline++
        }
      } else if (ob.submissionStatus === "DRAFT") {
        dayDraft++
        if (ob.isDeadlinePassed) {
          dayMissing++
          totalMissingAfterDeadline++
          totalPassedDeadline++
        }
      } else if (ob.submissionStatus === "MISSING_OVERDUE") {
        dayMissing++
        totalMissingAfterDeadline++
        totalPassedDeadline++
      } else if (ob.submissionStatus === "NOT_SUBMITTED") {
        // Not submitted yet today, deadline not passed
      }
    }

    const hasAttention = dayMissing > 0 || dayDraft > 0 || dayPendingVerify > 0

    days.push({
      date: dayStr,
      dayOfMonth: day,
      dayOfWeek,
      isCurrentMonth: true,
      isToday,
      isFuture,
      totalExpected: dayExpected,
      totalSubmitted: daySubmitted,
      totalMissing: dayMissing,
      totalPendingVerification: dayPendingVerify,
      totalDraft: dayDraft,
      totalUnconfigured: dayUnconfigured,
      hasAttention,
      obligations: dayObligations,
    })
  }

  const onTimeRate =
    totalPassedDeadline > 0
      ? Math.round((totalSubmittedOnTime / totalPassedDeadline) * 100)
      : null

  const unconfiguredCount = GMP_FORM_REGISTRY.filter(r => r.frequency === "UNCONFIGURED").length

  return {
    days,
    metrics: {
      passedDeadlineExpected: totalPassedDeadline,
      submittedOnTime: totalSubmittedOnTime,
      submittedLate: totalSubmittedLate,
      missingAfterDeadline: totalMissingAfterDeadline,
      pendingVerification: totalPendingVerification,
      onTimeRate,
      totalUnconfiguredForms: unconfiguredCount,
    },
  }
}

/**
 * Creates and evaluates a single GMPObligation item.
 */
function createObligation({
  rule,
  targetDate,
  section,
  shift,
  deadlineISO,
  isDeadlinePassed,
  matchedRec,
  draft,
  nowMYT,
  dayStr,
  reportingPeriodLabel,
}: {
  rule: GMPScheduleRule
  targetDate: string
  section?: string
  shift?: string
  deadlineISO: string
  isDeadlinePassed: boolean
  matchedRec?: any
  draft?: { updatedAt: string }
  nowMYT: Date
  dayStr: string
  reportingPeriodLabel: string
}): GMPObligation {
  const isToday = targetDate === formatMYTDateString(nowMYT)
  const isFuture = targetDate > formatMYTDateString(nowMYT)

  let submissionStatus: GMPObligation["submissionStatus"] = "UPCOMING"
  let verificationStatus: GMPObligation["verificationStatus"] = "NOT_REQUIRED"
  let actionLabel: GMPObligation["actionLabel"] = "Isi borang"
  let actionUrl = rule.route
  let attentionPriority = 6

  // Query parameters to pass context
  const queryParams = new URLSearchParams()
  queryParams.set("date", targetDate)
  if (section) queryParams.set("section", section)
  if (shift) queryParams.set("shift", shift)
  queryParams.set("returnUrl", `/forms/maintenance/compliance?date=${targetDate}`)

  actionUrl = `${rule.route}?${queryParams.toString()}`

  if (matchedRec) {
    // Record is submitted
    const deadlineDate = new Date(deadlineISO)
    const createdAt = matchedRec.createdAt ? new Date(matchedRec.createdAt) : null

    // Determine on-time vs late
    if (createdAt && createdAt > deadlineDate) {
      submissionStatus = "SUBMITTED_LATE"
      attentionPriority = 5
    } else {
      submissionStatus = "SUBMITTED_ON_TIME"
      attentionPriority = 6
    }

    // Determine verification
    const isVerified = Boolean(matchedRec.verifiedBy || matchedRec.verifiedSignature)
    if (rule.requiresVerification) {
      verificationStatus = isVerified ? "VERIFIED" : "PENDING"
      if (!isVerified) {
        attentionPriority = 4
        actionLabel = "Semak / Sahkan"
      } else {
        actionLabel = "Lihat rekod"
      }
    } else {
      actionLabel = "Lihat rekod"
    }

    // Deep link directly to Maintenance Summary scoped to this record
    actionUrl = `/forms/maintenance/summary?formType=${rule.formType}&startDate=${targetDate}&endDate=${targetDate}&recordId=${matchedRec.id}&returnUrl=/forms/maintenance/compliance?date=${targetDate}`
  } else if (draft) {
    // Has a resumable draft
    submissionStatus = "DRAFT"
    actionLabel = "Sambung draft"
    attentionPriority = 2
  } else if (rule.frequency === "UNCONFIGURED") {
    // Unconfigured schedule
    submissionStatus = "UNCONFIGURED"
    actionLabel = "Jadual belum ditetapkan"
    attentionPriority = 7
  } else if (isDeadlinePassed) {
    // Deadline passed and missing
    submissionStatus = "MISSING_OVERDUE"
    actionLabel = "Isi borang"
    attentionPriority = 1
  } else if (isToday) {
    // Today, deadline not yet passed
    submissionStatus = "NOT_SUBMITTED"
    actionLabel = "Isi borang"
    attentionPriority = 3
  } else {
    // Future date
    submissionStatus = "UPCOMING"
    actionLabel = "Isi borang"
    attentionPriority = 6
  }

  const idParts = [rule.formType, targetDate]
  if (section) idParts.push(section)
  if (shift) idParts.push(shift)
  if (matchedRec?.id) idParts.push(matchedRec.id)

  return {
    id: idParts.join(":"),
    formType: rule.formType,
    formCode: rule.formCode,
    formTitle: rule.formTitle,
    category: rule.category,
    targetDate,
    reportingPeriodLabel,
    frequency: rule.frequency,
    deadline: deadlineISO,
    isDeadlinePassed,
    section,
    shift,
    submissionStatus,
    verificationStatus,
    recordId: matchedRec?.id || null,
    submittedAt: matchedRec?.createdAt ? new Date(matchedRec.createdAt).toISOString() : null,
    submittedBy: matchedRec?.checkedBy || matchedRec?.performedBy || matchedRec?.doneBy || null,
    verifiedBy: matchedRec?.verifiedBy || null,
    verifiedAt: matchedRec?.updatedAt ? new Date(matchedRec.updatedAt).toISOString() : null,
    hasDraft: Boolean(draft),
    draftUpdatedAt: draft?.updatedAt || null,
    actionUrl,
    actionLabel,
    canAction: true,
    attentionPriority,
  }
}
