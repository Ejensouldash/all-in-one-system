import { prisma } from "@/lib/prisma"
import { mytDate, ruleLabel, pmStatus, validDate } from "./pm-core"
import { lockPM, materializePM, pmVisibleWhere } from "./pm-store"
import type { PMAuditMatrixRow, PMAuditRecord } from "@/lib/pdf/PMAuditReportDocument"

export interface PMAuditFilter {
  from: string
  to: string
  equipment?: string
  status?: string
}

export async function fetchPMAuditData(
  access: { userId: string; isSuperAdmin: boolean; name?: string },
  filter: PMAuditFilter
) {
  const today = mytDate()
  const from = validDate(filter.from) ? filter.from : `${today.slice(0, 4)}-01-01`
  const to = validDate(filter.to) ? filter.to : `${today.slice(0, 4)}-12-31`

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

  // 4. Fetch User Name Map
  const allUserIds = new Set<string>()
  occurrences.forEach((occ) => {
    occ.picIds.forEach((id) => allUserIds.add(id))
    if (occ.completedById) allUserIds.add(occ.completedById)
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

  occurrences.forEach((occ) => {
    if (occ.completedAt) {
      if (occ.result === "ISSUE") issueTasks++
      else completedTasks++
    } else if (occ.dueDate < today) {
      overdueTasks++
    } else {
      pendingTasks++
    }
  })

  const totalTasks = occurrences.length
  const complianceRate =
    totalTasks > 0
      ? ((completedTasks + issueTasks) / totalTasks) * 100
      : 100

  // 6. Build 12-Month Calendar Matrix
  // Group occurrences by scheduleId and month (1-12)
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

      // Priority: ISSUE > OVERDUE > DONE > PENDING
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

  // 7. Build Formatted Clean Records
  const records: PMAuditRecord[] = occurrences.map((occ, idx) => {
    let status: "DONE" | "ISSUE" | "OVERDUE" | "PENDING" = "PENDING"
    if (occ.completedAt) {
      status = occ.result === "ISSUE" ? "ISSUE" : "DONE"
    } else if (occ.dueDate < today) {
      status = "OVERDUE"
    }

    return {
      index: idx + 1,
      dueDate: occ.dueDate,
      inspectedDate: occ.inspectedDate,
      equipment: occ.equipment,
      srs: occ.srs,
      frequency: ruleLabel(occ.schedule),
      checklist: occ.checklist,
      pics: occ.picIds.map((id) => userMap.get(id) || id),
      status,
      result: occ.result,
      notes: occ.notes,
      completedBy: occ.completedById ? userMap.get(occ.completedById) || occ.completedById : null,
      completedAt: occ.completedAt ? occ.completedAt.toISOString() : null,
    }
  })

  return {
    today,
    from,
    to,
    preparedBy: access.name || "Pegawai Penyelenggaraan Bubbles O2",
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
