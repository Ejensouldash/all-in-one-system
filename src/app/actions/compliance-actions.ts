"use server"

import { prisma } from "@/lib/prisma"
import { getAccessInfo, hasAnyModule } from "@/lib/access"
import { listMyMaintenanceDrafts } from "@/app/actions/maintenance-drafts"
import {
  calculateMonthCompliance,
  getMYTDate,
  padZero,
  RawComplianceRecords,
} from "@/lib/compliance/obligation-calculator"
import { MonthDataPayload } from "@/lib/compliance/types"
import { GMP_FORM_REGISTRY } from "@/lib/compliance/gmp-registry"

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Mac",
  "April",
  "Mei",
  "Jun",
  "Julai",
  "Ogos",
  "September",
  "Oktober",
  "November",
  "Disember",
]

export async function getComplianceMonthData(
  year: number,
  month: number
): Promise<{ success: boolean; data?: MonthDataPayload; error?: string }> {
  try {
    const access = await getAccessInfo()
    if (!access) {
      return { success: false, error: "Sila log masuk untuk mengakses GMP Compliance." }
    }

    const canCompliance =
      access.isSuperAdmin ||
      hasAnyModule(access, [
        "GMP_FORMS",
        "MAINTENANCE_FORMS",
        "GMP_SUMMARY",
        "MAINTENANCE_SUMMARY",
        "GMP_REPORTS",
        "MAINTENANCE_REPORTS",
        "MAINTENANCE_DASHBOARD",
      ])

    if (!canCompliance) {
      return { success: false, error: "Anda tidak mempunyai kebenaran untuk modul GMP." }
    }

    const nowMYT = getMYTDate()

    // Build UTC date boundaries covering entire month
    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0))
    const endDate = new Date(Date.UTC(year, month, 1, 23, 59, 59))
    const monthKeyPrefix = `${year}-${padZero(month)}`

    const dateQuery = {
      gte: startDate,
      lte: endDate,
    }

    // Execute batch queries in parallel
    const [
      lighting,
      finishedGoods,
      wasteManagement,
      wasteDisposal,
      foodHandler,
      chemicalControl,
      cleaning,
      maintenanceRecord,
      pmir,
      pmr,
      fbsr,
      mgl,
      mgb,
      mwl,
      mwb,
      mpl,
      mpb,
      lfcr,
      ivvi,
      vchif,
      dqip,
      qcdr,
      pcs,
      pcdm,
      ftdm,
      fpir,
      wqtr,
      fuv,
      pmOccurrences,
      draftsRes,
    ] = await Promise.all([
      prisma.maintenanceLighting.findMany({ where: { date: dateQuery }, orderBy: { date: "asc" } }),
      prisma.maintenanceFinishedGoods.findMany({ where: { date: dateQuery }, orderBy: { date: "asc" } }),
      prisma.maintenanceWasteManagement.findMany({ where: { date: dateQuery }, orderBy: { date: "asc" } }),
      prisma.maintenanceWasteDisposal.findMany({ where: { date: dateQuery }, orderBy: { date: "asc" } }),
      prisma.maintenanceFoodHandler.findMany({ where: { date: dateQuery }, orderBy: { date: "asc" } }),
      prisma.maintenanceChemical.findMany({ where: { date: dateQuery }, orderBy: { date: "asc" } }),
      prisma.maintenanceCleaning.findMany({ where: { date: dateQuery }, orderBy: { date: "asc" } }),
      prisma.maintenanceEquipmentRecord.findMany({ where: { date: dateQuery }, orderBy: { date: "asc" } }),
      prisma.maintenancePreventiveInspection.findMany({ where: { date: dateQuery }, orderBy: { date: "asc" } }),
      prisma.maintenancePreventiveRecord.findMany({ where: { date: dateQuery }, orderBy: { date: "asc" } }),
      prisma.maintenanceFiltrationBackwash.findMany({ where: { date: dateQuery }, orderBy: { date: "asc" } }),
      prisma.productionGlassLog.findMany({ where: { createdAt: dateQuery }, orderBy: { createdAt: "asc" } }),
      prisma.productionGlassBreakage.findMany({ where: { createdAt: dateQuery }, orderBy: { createdAt: "asc" } }),
      prisma.productionWoodLog.findMany({ where: { createdAt: dateQuery }, orderBy: { createdAt: "asc" } }),
      prisma.productionWoodBreakage.findMany({ where: { createdAt: dateQuery }, orderBy: { createdAt: "asc" } }),
      prisma.productionPlasticLog.findMany({ where: { createdAt: dateQuery }, orderBy: { createdAt: "asc" } }),
      prisma.productionPlasticBreakage.findMany({ where: { createdAt: dateQuery }, orderBy: { createdAt: "asc" } }),
      prisma.productionLightingFixture.findMany({ where: { date: dateQuery }, orderBy: { date: "asc" } }),
      prisma.securityIncomingVehicle.findMany({ where: { date: dateQuery }, orderBy: { date: "asc" } }),
      prisma.securityVehicleHygiene.findMany({ where: { date: dateQuery }, orderBy: { date: "asc" } }),
      prisma.maintenanceDQIP.findMany({ where: { date: dateQuery }, orderBy: { date: "asc" } }),
      prisma.maintenanceQCDR.findMany({ where: { date: dateQuery }, orderBy: { date: "asc" } }),
      prisma.maintenancePestControlSchedule.findMany({ where: { date: dateQuery }, orderBy: { date: "asc" } }),
      prisma.maintenancePestControlDaily.findMany({ where: { date: dateQuery }, orderBy: { date: "asc" } }),
      prisma.maintenanceFlyTrapDaily.findMany({ where: { date: dateQuery }, orderBy: { date: "asc" } }),
      prisma.maintenanceFPIR.findMany({ where: { date: dateQuery }, orderBy: { date: "asc" } }),
      prisma.maintenanceWQTR.findMany({ where: { date: dateQuery }, orderBy: { date: "asc" } }),
      prisma.maintenanceHazardProcessControl.findMany({ where: { date: dateQuery }, orderBy: { date: "asc" } }),
      prisma.reminderPMOccurrence.findMany({
        where: { dueDate: { startsWith: monthKeyPrefix } },
        orderBy: { dueDate: "asc" },
      }),
      listMyMaintenanceDrafts(),
    ])

    const rawRecords: RawComplianceRecords = {
      lighting,
      finishedGoods,
      wasteManagement,
      wasteDisposal,
      foodHandler,
      chemicalControl,
      cleaning,
      maintenanceRecord,
      pmir,
      pmr,
      fbsr,
      mgl,
      mgb,
      mwl,
      mwb,
      mpl,
      mpb,
      lfcr,
      ivvi,
      vchif,
      dqip,
      qcdr,
      pcs,
      pcdm,
      ftdm,
      fpir,
      wqtr,
      fuv,
      pmOccurrences,
      drafts: draftsRes.data || [],
    }

    const { days, metrics } = calculateMonthCompliance(year, month, rawRecords, nowMYT)

    const payload: MonthDataPayload = {
      year,
      month,
      monthName: MONTH_NAMES[month - 1] || "",
      generatedAt: nowMYT.toISOString(),
      timezone: "Asia/Kuala_Lumpur",
      metrics,
      days,
      formsRegistry: GMP_FORM_REGISTRY,
      userPermissions: {
        canForms: access.isSuperAdmin || access.modules.includes("GMP_FORMS") || access.modules.includes("MAINTENANCE_FORMS"),
        canSummary: access.isSuperAdmin || access.modules.includes("GMP_SUMMARY") || access.modules.includes("MAINTENANCE_SUMMARY"),
        canReports: access.isSuperAdmin || access.modules.includes("GMP_REPORTS") || access.modules.includes("MAINTENANCE_REPORTS"),
        canDashboard: access.isSuperAdmin || access.modules.includes("MAINTENANCE_DASHBOARD"),
        isSuperAdmin: access.isSuperAdmin,
      },
    }

    return { success: true, data: payload }
  } catch (error: any) {
    console.error("Error loading GMP compliance month data:", error)
    return {
      success: false,
      error: error.message || "Ralat semasa memuatkan data pematuhan GMP.",
    }
  }
}
