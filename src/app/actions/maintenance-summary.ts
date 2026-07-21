"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function getMaintenanceSummaryRecords(
  formType: string,
  startDate?: string,
  endDate?: string
) {
  try {
    const where: any = {}
    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate + "T23:59:59"),
      }
    }

    let data: any[] = []
    switch (formType) {
      case "lighting":
        data = await prisma.maintenanceLighting.findMany({ where, orderBy: { date: "desc" } })
        break
      case "finished-goods":
        data = await prisma.maintenanceFinishedGoods.findMany({ where, orderBy: { date: "desc" } })
        break
      case "waste-management":
        data = await prisma.maintenanceWasteManagement.findMany({ where, orderBy: { date: "desc" } })
        break
      case "waste-disposal":
        data = await prisma.maintenanceWasteDisposal.findMany({ where, orderBy: { date: "desc" } })
        break
      case "food-handler":
        data = await prisma.maintenanceFoodHandler.findMany({ where, orderBy: { date: "desc" } })
        break
      case "chemical-control":
        data = await prisma.maintenanceChemical.findMany({ where, orderBy: { date: "desc" } })
        break
      case "cleaning":
        data = await prisma.maintenanceCleaning.findMany({ where, orderBy: { date: "desc" } })
        break
      case "maintenance-record":
        data = await prisma.maintenanceEquipmentRecord.findMany({ where, orderBy: { date: "desc" } })
        break
      case "pmir":
        data = await prisma.maintenancePreventiveInspection.findMany({ where, orderBy: { date: "desc" } })
        break
      case "pmr":
        data = await prisma.maintenancePreventiveRecord.findMany({ where, orderBy: { date: "desc" } })
        break
      case "fbsr":
        data = await prisma.maintenanceFiltrationBackwash.findMany({ where, orderBy: { date: "desc" } })
        break
      case "mgl":
        data = await prisma.productionGlassLog.findMany({ orderBy: { createdAt: "desc" } })
        data = data.map(d => ({ ...d, date: d.createdAt }))
        break
      case "mgb":
        data = await prisma.productionGlassBreakage.findMany({ orderBy: { createdAt: "desc" } })
        data = data.map(d => ({ ...d, date: d.createdAt }))
        break
      case "mwl":
        data = await prisma.productionWoodLog.findMany({ orderBy: { createdAt: "desc" } })
        data = data.map(d => ({ ...d, date: d.createdAt }))
        break
      case "mwb":
        data = await prisma.productionWoodBreakage.findMany({ orderBy: { createdAt: "desc" } })
        data = data.map(d => ({ ...d, date: d.createdAt }))
        break
      case "mpl":
        data = await prisma.productionPlasticLog.findMany({ orderBy: { createdAt: "desc" } })
        data = data.map(d => ({ ...d, date: d.createdAt }))
        break
      case "mpb":
        data = await prisma.productionPlasticBreakage.findMany({ orderBy: { createdAt: "desc" } })
        data = data.map(d => ({ ...d, date: d.createdAt }))
        break
      case "lfcr":
        data = await prisma.productionLightingFixture.findMany({ where, orderBy: { date: "desc" } })
        break
      case "ivvi":
        data = await prisma.securityIncomingVehicle.findMany({ where, orderBy: { date: "desc" } })
        break
      case "vchif":
        data = await prisma.securityVehicleHygiene.findMany({ where, orderBy: { date: "desc" } })
        break
      default:
        return { success: false, error: "Invalid form type" }
    }

    return { success: true, data }
  } catch (error: any) {
    console.error("Error fetching maintenance summary:", error)
    return { success: false, error: error.message || "Failed to load records." }
  }
}

export async function updateMaintenanceRecord(formType: string, id: string, data: Record<string, any>) {
  try {
    switch (formType) {
      case "lighting":
        await prisma.maintenanceLighting.update({ where: { id }, data })
        break
      case "finished-goods":
        await prisma.maintenanceFinishedGoods.update({ where: { id }, data })
        break
      case "waste-management":
        await prisma.maintenanceWasteManagement.update({ where: { id }, data })
        break
      case "waste-disposal":
        await prisma.maintenanceWasteDisposal.update({ where: { id }, data })
        break
      case "food-handler":
        await prisma.maintenanceFoodHandler.update({ where: { id }, data })
        break
      case "chemical-control":
        await prisma.maintenanceChemical.update({ where: { id }, data })
        break
      case "cleaning":
        await prisma.maintenanceCleaning.update({ where: { id }, data })
        break
      case "maintenance-record":
        await prisma.maintenanceEquipmentRecord.update({ where: { id }, data })
        break
      case "pmir":
        await prisma.maintenancePreventiveInspection.update({ where: { id }, data })
        break
      case "pmr":
        await prisma.maintenancePreventiveRecord.update({ where: { id }, data })
        break
      case "fbsr":
        await prisma.maintenanceFiltrationBackwash.update({ where: { id }, data })
        break
      case "mgl":
        await prisma.productionGlassLog.update({ where: { id }, data })
        break
      case "mgb":
        await prisma.productionGlassBreakage.update({ where: { id }, data })
        break
      case "mwl":
        await prisma.productionWoodLog.update({ where: { id }, data })
        break
      case "mwb":
        await prisma.productionWoodBreakage.update({ where: { id }, data })
        break
      case "mpl":
        await prisma.productionPlasticLog.update({ where: { id }, data })
        break
      case "mpb":
        await prisma.productionPlasticBreakage.update({ where: { id }, data })
        break
      case "lfcr":
        await prisma.productionLightingFixture.update({ where: { id }, data })
        break
      case "ivvi":
        await prisma.securityIncomingVehicle.update({ where: { id }, data })
        break
      case "vchif":
        await prisma.securityVehicleHygiene.update({ where: { id }, data })
        break
      default:
        return { success: false, error: "Invalid form type" }
    }
    revalidatePath("/forms/maintenance/summary")
    return { success: true }
  } catch (error: any) {
    console.error("Error updating maintenance record:", error)
    return { success: false, error: error.message || "Failed to update record." }
  }
}

export async function deleteMaintenanceRecord(formType: string, id: string) {
  try {
    switch (formType) {
      case "lighting":
        await prisma.maintenanceLighting.delete({ where: { id } })
        break
      case "finished-goods":
        await prisma.maintenanceFinishedGoods.delete({ where: { id } })
        break
      case "waste-management":
        await prisma.maintenanceWasteManagement.delete({ where: { id } })
        break
      case "waste-disposal":
        await prisma.maintenanceWasteDisposal.delete({ where: { id } })
        break
      case "food-handler":
        await prisma.maintenanceFoodHandler.delete({ where: { id } })
        break
      case "chemical-control":
        await prisma.maintenanceChemical.delete({ where: { id } })
        break
      case "cleaning":
        await prisma.maintenanceCleaning.delete({ where: { id } })
        break
      case "maintenance-record":
        await prisma.maintenanceEquipmentRecord.delete({ where: { id } })
        break
      case "pmir":
        await prisma.maintenancePreventiveInspection.delete({ where: { id } })
        break
      case "pmr":
        await prisma.maintenancePreventiveRecord.delete({ where: { id } })
        break
      case "fbsr":
        await prisma.maintenanceFiltrationBackwash.delete({ where: { id } })
        break
      case "mgl":
        await prisma.productionGlassLog.delete({ where: { id } })
        break
      case "mgb":
        await prisma.productionGlassBreakage.delete({ where: { id } })
        break
      case "mwl":
        await prisma.productionWoodLog.delete({ where: { id } })
        break
      case "mwb":
        await prisma.productionWoodBreakage.delete({ where: { id } })
        break
      case "mpl":
        await prisma.productionPlasticLog.delete({ where: { id } })
        break
      case "mpb":
        await prisma.productionPlasticBreakage.delete({ where: { id } })
        break
      case "lfcr":
        await prisma.productionLightingFixture.delete({ where: { id } })
        break
      case "ivvi":
        await prisma.securityIncomingVehicle.delete({ where: { id } })
        break
      case "vchif":
        await prisma.securityVehicleHygiene.delete({ where: { id } })
        break
      default:
        return { success: false, error: "Invalid form type" }
    }
    revalidatePath("/forms/maintenance/summary")
    return { success: true }
  } catch (error: any) {
    console.error("Error deleting maintenance record:", error)
    return { success: false, error: error.message || "Failed to delete record." }
  }
}

export async function verifyMaintenanceRecord(
  formType: string,
  id: string,
  verifiedBy: string,
  verifiedSignature: string
) {
  try {
    const data = { verifiedBy, verifiedSignature }

    switch (formType) {
      case "lighting":
        await prisma.maintenanceLighting.update({ where: { id }, data })
        break
      case "finished-goods":
        await prisma.maintenanceFinishedGoods.update({ where: { id }, data })
        break
      case "waste-management":
        await prisma.maintenanceWasteManagement.update({ where: { id }, data })
        break
      case "waste-disposal":
        await prisma.maintenanceWasteDisposal.update({ where: { id }, data })
        break
      case "food-handler":
        await prisma.maintenanceFoodHandler.update({ where: { id }, data })
        break
      case "chemical-control":
        await prisma.maintenanceChemical.update({ where: { id }, data })
        break
      case "cleaning":
        await prisma.maintenanceCleaning.update({ where: { id }, data })
        break
      case "maintenance-record":
        await prisma.maintenanceEquipmentRecord.update({ where: { id }, data })
        break
      case "pmir":
        await prisma.maintenancePreventiveInspection.update({ where: { id }, data })
        break
      case "pmr":
        await prisma.maintenancePreventiveRecord.update({ where: { id }, data })
        break
      case "fbsr":
        await prisma.maintenanceFiltrationBackwash.update({ where: { id }, data })
        break
      case "mgl":
        await prisma.productionGlassLog.update({ where: { id }, data })
        break
      case "mgb":
        await prisma.productionGlassBreakage.update({ where: { id }, data })
        break
      case "mwl":
        await prisma.productionWoodLog.update({ where: { id }, data })
        break
      case "mwb":
        await prisma.productionWoodBreakage.update({ where: { id }, data })
        break
      case "mpl":
        await prisma.productionPlasticLog.update({ where: { id }, data })
        break
      case "mpb":
        await prisma.productionPlasticBreakage.update({ where: { id }, data })
        break
      case "lfcr":
        await prisma.productionLightingFixture.update({ where: { id }, data })
        break
      case "ivvi":
        await prisma.securityIncomingVehicle.update({ where: { id }, data })
        break
      case "vchif":
        await prisma.securityVehicleHygiene.update({ where: { id }, data })
        break
      default:
        return { success: false, error: "Invalid form type" }
    }
    revalidatePath("/forms/maintenance/summary")
    return { success: true }
  } catch (error: any) {
    console.error("Error verifying maintenance record:", error)
    return { success: false, error: error.message || "Failed to verify record." }
  }
}
