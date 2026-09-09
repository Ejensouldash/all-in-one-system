import { prisma } from "@/lib/prisma"
import { mytDate, ruleLabel, pmStatus, validDate } from "./pm-core"
import { lockPM, materializePM, pmVisibleWhere } from "./pm-store"
import { generatePMExecutiveSummaryAI } from "./pm-ai-summary"
import type { PMAuditMatrixRow, PMAuditRecord } from "@/lib/pdf/PMAuditReportDocument"

export interface PMAuditFilter {
  from: string
  to: string
  equipment?: string
  status?: string
  mode?: "INTERNAL" | "AUDITOR"
  hideInternalNotes?: boolean
  hideOverduePending?: boolean
  hidePersonalContact?: boolean
  hideSignatures?: boolean
}

export async function fetchPMAuditData(
  access: { userId: string; isSuperAdmin: boolean; name?: string },
  filter: PMAuditFilter
) {
  const today = mytDate()
  const from = validDate(filter.from) ? filter.from : `${today.slice(0, 4)}-01-01`
  const to = validDate(filter.to) ? filter.to : `${today.slice(0, 4)}-12-31`
  const isAuditorMode = filter.mode === "AUDITOR"

  // 1. Fetch schedules
  const scheduleWhere: any = {
    ...pmVisibleWhere(access),
    ...(filter.equipment && filter.equipment !== "ALL"
      ? { equipment: { equals: filter.equipment, mode: "insensitive" } }
      : {}),
  }

  const schedules = await prisma.reminderPMSchedule.findMany({
    where: scheduleWhere,
    orderBy: [{ equipment: "asc" }, { srs: "asc" }],
  })

  // 2. Materialize occurrences if needed
  if (schedules.length > 0 && to >= today) {
    await prisma.$transaction(
      async (tx) => {
        await lockPM(tx)
        await materializePM(tx, to, schedules.map((s) => s.id))
      },
      { timeout: 30000 }
    )
  }

  // 3. Fetch occurrences in date range
  const occurrenceWhere: any = {
    scheduleId: { in: schedules.map((s) => s.id) },
    dueDate: { gte: from, lte: to },
  }

  if (!access.isSuperAdmin) {
    occurrenceWhere.OR = [
      { picIds: { has: access.userId } },
      { schedule: { createdById: access.userId } },
    ]
  }

  if (filter.status && filter.status !== "ALL") {
    if (filter.status === "DONE") {
      occurrenceWhere.completedAt = { not: null }
      occurrenceWhere.result = "OK"
    } else if (filter.status === "ISSUE") {
      occurrenceWhere.completedAt = { not: null }
      occurrenceWhere.result = "ISSUE"
    } else if (filter.status === "OVERDUE") {
      occurrenceWhere.completedAt = null
      occurrenceWhere.dueDate = { lt: today, gte: from }
    } else if (filter.status === "TODAY") {
      occurrenceWhere.dueDate = today
    } else if (filter.status === "UPCOMING") {
      occurrenceWhere.completedAt = null
      occurrenceWhere.dueDate = { gt: today, lte: to }
    }
  }

  // If auditor mode requested to hide overdue/pending tasks
  if (isAuditorMode && filter.hideOverduePending) {
    occurrenceWhere.completedAt = { not: null }
  }

  const occurrences = await prisma.reminderPMOccurrence.findMany({
    where: occurrenceWhere,
    include: {
      schedule: {
        select: {
          id: true,
          equipment: true,
          srs: true,
          intervalUnit: true,
          intervalCount: true,
          startDate: true,
        },
      },
    },
    orderBy: [{ dueDate: "asc" }, { equipment: "asc" }],
  })

  // 4. Fetch User Name Map (PIC, completedById, verifiedById)
  const allUserIds = new Set<string>()
  occurrences.forEach((occ) => {
    occ.picIds.forEach((id) => allUserIds.add(id))
    if (occ.completedById) allUserIds.add(occ.completedById)
    if (occ.verifiedById) allUserIds.add(occ.verifiedById)
  })

  const users = allUserIds.size > 0
    ? await prisma.user.findMany({
        where: { id: { in: [...allUserIds] } },
        select: { id: true, name: true, email: true },
      })
    : []

  const userMap = new Map<string, string>()
  users.forEach((u) => userMap.set(u.id, u.name || u.email))

  // 5. Calculate KPI Metrics
  let completedTasks = 0
  let issueTasks = 0
  let overdueTasks = 0
  let pendingTasks = 0
  const issuesList: string[] = []

  occurrences.forEach((occ) => {
    if (occ.completedAt) {
      if (occ.result === "ISSUE") {
        issueTasks++
        if (occ.notes) issuesList.push(`${occ.equipment}: ${occ.notes}`)
      } else {
        completedTasks++
      }
    } else if (occ.dueDate < today) {
      overdueTasks++
    } else {
      pendingTasks++
    }
  })

  const totalTasks = occurrences.length
  const complianceRate =
    totalTasks > 0
      ? ((completedTasks + (isAuditorMode ? 0 : issueTasks)) / totalTasks) * 100
      : 100

  // 6. Generate AI / Rule-based Executive Summary
  const executiveSummary = await generatePMExecutiveSummaryAI({
    from,
    to,
    totalTasks,
    completedTasks,
    issueTasks,
    overdueTasks,
    pendingTasks,
    complianceRate,
    equipmentCount: schedules.length,
    issuesSummary: issuesList,
    isAuditorMode,
  })

  // 7. Build 12-Month Calendar Matrix
  const occsBySchedule = new Map<string, typeof occurrences>()
  occurrences.forEach((occ) => {
    const list = occsBySchedule.get(occ.scheduleId) || []
    list.push(occ)
    occsBySchedule.set(occ.scheduleId, list)
  })

  const calendarMatrix: PMAuditMatrixRow[] = schedules.map((sched) => {
    const schedOccs = occsBySchedule.get(sched.id) || []
    const months: PMAuditMatrixRow["months"] = {}

    for (let m = 1; m <= 12; m++) {
      months[m] = { status: "NONE", count: 0 }
    }

    schedOccs.forEach((occ) => {
      const occMonth = Number(occ.dueDate.slice(5, 7))
      const currentMonth = months[occMonth] || { status: "NONE", count: 0 }

      let status: "DONE" | "ISSUE" | "OVERDUE" | "PENDING" = "PENDING"
      if (occ.completedAt) {
        status = occ.result === "ISSUE" ? "ISSUE" : "DONE"
      } else if (occ.dueDate < today) {
        status = "OVERDUE"
      }

      // In Auditor mode with overdue hidden, don't flag OVERDUE as red
      if (isAuditorMode && filter.hideOverduePending && status === "OVERDUE") {
        status = "PENDING"
      }

      if (currentMonth.status === "NONE") {
        currentMonth.status = status
      } else if (status === "ISSUE" || currentMonth.status === "ISSUE") {
        currentMonth.status = "ISSUE"
      } else if (status === "OVERDUE" || currentMonth.status === "OVERDUE") {
        currentMonth.status = "OVERDUE"
      } else if (status === "DONE" && currentMonth.status === "PENDING") {
        currentMonth.status = "DONE"
      }

      currentMonth.count += 1
      months[occMonth] = currentMonth
    })

    const totalScheduled = schedOccs.length
    const totalCompleted = schedOccs.filter((o) => !!o.completedAt).length

    return {
      equipment: sched.equipment,
      srs: sched.srs,
      frequency: ruleLabel(sched),
      months,
      totalCompleted,
      totalScheduled,
    }
  })

  // 8. Build Formatted Clean Records with Auditor Filtering
  const records: PMAuditRecord[] = occurrences.map((occ, idx) => {
    let status: "DONE" | "ISSUE" | "OVERDUE" | "PENDING" = "PENDING"
    if (occ.completedAt) {
      status = occ.result === "ISSUE" ? "ISSUE" : "DONE"
    } else if (occ.dueDate < today) {
      status = "OVERDUE"
    }

    // Auditor Sanitization
    let cleanNotes = occ.notes
    if (isAuditorMode && filter.hideInternalNotes) {
      cleanNotes = occ.result === "ISSUE" ? "Tindakan pembetulan telah diselaraskan." : null
    }

    let pics = occ.picIds.map((id) => userMap.get(id) || id)
    let completedBy = occ.completedById ? userMap.get(occ.completedById) || occ.completedById : null
    let verifiedByName = occ.verifiedById ? userMap.get(occ.verifiedById) || occ.verifiedById : null

    if (isAuditorMode && filter.hidePersonalContact) {
      pics = pics.map(() => "Juruteknik Penyelenggaraan")
      if (completedBy) completedBy = "Juruteknik Penyelenggaraan"
      if (verifiedByName) verifiedByName = "Penyelia Operasi Kualiti GMP"
    }

    return {
      id: occ.id,
      index: idx + 1,
      dueDate: occ.dueDate,
      inspectedDate: occ.inspectedDate,
      equipment: occ.equipment,
      srs: occ.srs,
      frequency: ruleLabel(occ.schedule),
      checklist: occ.checklist,
      completedChecklist: occ.completedChecklist || [],
      pics,
      status,
      result: occ.result,
      notes: cleanNotes,
      performedSignature: filter.hideSignatures ? null : occ.performedSignature,
      completedBy,
      completedAt: occ.completedAt ? occ.completedAt.toISOString() : null,
      verifiedByName,
      verifiedSignature: filter.hideSignatures ? null : occ.verifiedSignature,
      verifiedAt: occ.verifiedAt ? occ.verifiedAt.toISOString() : null,
    }
  })

  return {
    today,
    from,
    to,
    mode: (isAuditorMode ? "AUDITOR" : "INTERNAL") as "AUDITOR" | "INTERNAL",
    filterSettings: {
      hideInternalNotes: Boolean(filter.hideInternalNotes),
      hideOverduePending: Boolean(filter.hideOverduePending),
      hidePersonalContact: Boolean(filter.hidePersonalContact),
      hideSignatures: Boolean(filter.hideSignatures),
    },
    preparedBy: access.name || "Pegawai Penyelenggaraan Bubbles O2",
    executiveSummary,
    summary: {
      totalTasks,
      completedTasks,
      issueTasks,
      overdueTasks,
      pendingTasks,
      complianceRate,
    },
    calendarMatrix,
    records,
    schedules: schedules.map((s) => ({
      equipment: s.equipment,
      srs: s.srs,
      frequency: ruleLabel(s),
      startDate: s.startDate,
      checklist: s.checklist,
      picCount: s.picIds.length,
    })),
  }
}
