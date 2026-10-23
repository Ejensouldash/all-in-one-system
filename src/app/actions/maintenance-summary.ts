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
      case "dqip":
        data = await prisma.maintenanceDQIP.findMany({ where, orderBy: { date: "desc" } })
        break
      case "qcdr":
        data = await prisma.maintenanceQCDR.findMany({ where, orderBy: { date: "desc" } })
        break
      case "fpir":
        data = await prisma.maintenanceFPIR.findMany({ where, orderBy: { date: "desc" } })
        break
      case "wqtr":
        data = await prisma.maintenanceWQTR.findMany({ where, orderBy: { date: "desc" } })
        break
      case "pcs":
        data = await prisma.maintenancePestControlSchedule.findMany({ where, orderBy: { date: "desc" } })
        break
      case "pcdm":
        data = await prisma.maintenancePestControlDaily.findMany({ where, orderBy: { date: "desc" } })
        break
      case "ftdm":
        data = await prisma.maintenanceFlyTrapDaily.findMany({ where, orderBy: { date: "desc" } })
        break
      case "fuv":
        data = await prisma.maintenanceHazardProcessControl.findMany({ where, orderBy: { date: "desc" } })
        break
      case "uv-machine-3-in-1":
        data = await prisma.productionUVMachineChecklist.findMany({ where, orderBy: { date: "desc" } })
        break
      case "retention-sample": {
        const sampleWhere: any = {}
        if (startDate && endDate) {
          sampleWhere.sampleDateTime = {
            gte: new Date(startDate),
            lte: new Date(endDate + "T23:59:59"),
          }
        }
        const records = await prisma.retentionSampleRecord.findMany({
          where: sampleWhere,
          orderBy: { sampleDateTime: "desc" },
        })
        data = records.map((r) => {
          const dt = new Date(r.sampleDateTime)
          const time = dt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true })
          return {
            ...r,
            date: r.sampleDateTime,
            time,
          }
        })
        break
      }
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
      case "dqip":
        await prisma.maintenanceDQIP.update({ where: { id }, data })
        break
      case "qcdr":
        await prisma.maintenanceQCDR.update({ where: { id }, data })
        break
      case "fpir":
        await prisma.maintenanceFPIR.update({ where: { id }, data })
        break
      case "wqtr":
        await prisma.maintenanceWQTR.update({ where: { id }, data })
        break
      case "pcs":
        await prisma.maintenancePestControlSchedule.update({ where: { id }, data })
        break
      case "pcdm":
        await prisma.maintenancePestControlDaily.update({ where: { id }, data })
        break
      case "ftdm":
        await prisma.maintenanceFlyTrapDaily.update({ where: { id }, data })
        break
      case "fuv": {
        const current = await prisma.maintenanceHazardProcessControl.findUnique({
          where: { id },
          select: { isLocked: true },
        })
        if (current?.isLocked) {
          return {
            success: false,
            error: "Rekod ini telah disahkan dan dikunci oleh Penyelia / QC. Pengubahsuaian tidak dibenarkan.",
          }
        }
        await prisma.maintenanceHazardProcessControl.update({ where: { id }, data })
        revalidatePath("/forms/maintenance/fuv")
        revalidatePath("/forms/maintenance/reports/fuv")
        break
      }
      case "retention-sample":
        await prisma.retentionSampleRecord.update({ where: { id }, data })
        revalidatePath("/forms/maintenance/reports/retention-sample")
        break
      case "uv-machine-3-in-1":
        await prisma.productionUVMachineChecklist.update({ where: { id }, data })
        revalidatePath("/forms/maintenance/reports/uv-machine-3-in-1")
        revalidatePath("/forms/maintenance/uv-machine-3-in-1")
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
      case "dqip":
        await prisma.maintenanceDQIP.delete({ where: { id } })
        break
      case "qcdr":
        await prisma.maintenanceQCDR.delete({ where: { id } })
        break
      case "fpir":
        await prisma.maintenanceFPIR.delete({ where: { id } })
        break
      case "wqtr":
        await prisma.maintenanceWQTR.delete({ where: { id } })
        break
      case "pcs":
        await prisma.maintenancePestControlSchedule.delete({ where: { id } })
        break
      case "pcdm":
        await prisma.maintenancePestControlDaily.delete({ where: { id } })
        break
      case "ftdm":
        await prisma.maintenanceFlyTrapDaily.delete({ where: { id } })
        break
      case "fuv": {
        const current = await prisma.maintenanceHazardProcessControl.findUnique({
          where: { id },
          select: { isLocked: true },
        })
        if (current?.isLocked) {
          return {
            success: false,
            error: "Rekod yang telah disahkan dan dikunci oleh Penyelia / QC tidak boleh dipadam.",
          }
        }
        await prisma.maintenanceHazardProcessControl.delete({ where: { id } })
        revalidatePath("/forms/maintenance/fuv")
        revalidatePath("/forms/maintenance/reports/fuv")
        break
      }
      case "retention-sample":
        await prisma.retentionSampleRecord.delete({ where: { id } })
        revalidatePath("/forms/maintenance/reports/retention-sample")
        break
      case "uv-machine-3-in-1":
        await prisma.productionUVMachineChecklist.delete({ where: { id } })
        revalidatePath("/forms/maintenance/reports/uv-machine-3-in-1")
        revalidatePath("/forms/maintenance/uv-machine-3-in-1")
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
      case "maintenance-record": {
        const rec = await prisma.maintenanceEquipmentRecord.findUnique({ where: { id } })
        const updateData: any = { verifiedBy, verifiedSignature }
        if (rec) {
          if (rec.signature800M) {
            updateData.verifiedBy800M = verifiedBy
            updateData.verifiedSig800M = verifiedSignature
          }
          if (rec.signature800N) {
            updateData.verifiedBy800N = verifiedBy
            updateData.verifiedSig800N = verifiedSignature
          }
          if (rec.signature425M) {
            updateData.verifiedBy425M = verifiedBy
            updateData.verifiedSig425M = verifiedSignature
          }
          if (rec.signature425N) {
            updateData.verifiedBy425N = verifiedBy
            updateData.verifiedSig425N = verifiedSignature
          }
        }
        await prisma.maintenanceEquipmentRecord.update({ where: { id }, data: updateData })
        revalidatePath("/forms/maintenance/reports/maintenance-record")
        break
      }
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
      case "dqip":
        await prisma.maintenanceDQIP.update({ where: { id }, data })
        break
      case "qcdr":
        await prisma.maintenanceQCDR.update({ where: { id }, data })
        break
      case "fpir":
        await prisma.maintenanceFPIR.update({ where: { id }, data })
        break
      case "wqtr":
        await prisma.maintenanceWQTR.update({ where: { id }, data })
        break
      case "pcs":
        await prisma.maintenancePestControlSchedule.update({ where: { id }, data })
        break
      case "pcdm":
        await prisma.maintenancePestControlDaily.update({ where: { id }, data })
        break
      case "ftdm":
        await prisma.maintenanceFlyTrapDaily.update({ where: { id }, data })
        break
      case "fuv":
        await prisma.maintenanceHazardProcessControl.update({
          where: { id },
          data: { ...data, isLocked: true },
        })
        revalidatePath("/forms/maintenance/fuv")
        revalidatePath("/forms/maintenance/reports/fuv")
        break
      case "retention-sample":
        await prisma.retentionSampleRecord.update({
          where: { id },
          data: {
            verifiedBy,
            verifiedSignature,
            verifiedAt: new Date(),
          },
        })
        revalidatePath("/forms/maintenance/reports/retention-sample")
        break
      case "uv-machine-3-in-1":
        await prisma.productionUVMachineChecklist.update({
          where: { id },
          data: {
            verifiedBy,
            verifiedSignature,
            verifiedAt: new Date(),
          },
        })
        revalidatePath("/forms/maintenance/reports/uv-machine-3-in-1")
        revalidatePath("/forms/maintenance/uv-machine-3-in-1")
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

export async function batchVerifyMaintenanceRecords(
  formType: string,
  ids: string[],
  verifiedBy: string,
  verifiedSignature: string
) {
  try {
    if (!ids || ids.length === 0) {
      return { success: false, error: "Tiada rekod dipilih untuk disahkan." }
    }

    const data = { verifiedBy, verifiedSignature }

    switch (formType) {
      case "maintenance-record": {
        const records = await prisma.maintenanceEquipmentRecord.findMany({
          where: { id: { in: ids } },
        })
        for (const rec of records) {
          const updateData: any = { verifiedBy, verifiedSignature }
          if (rec.signature800M) {
            updateData.verifiedBy800M = verifiedBy
            updateData.verifiedSig800M = verifiedSignature
          }
          if (rec.signature800N) {
            updateData.verifiedBy800N = verifiedBy
            updateData.verifiedSig800N = verifiedSignature
          }
          if (rec.signature425M) {
            updateData.verifiedBy425M = verifiedBy
            updateData.verifiedSig425M = verifiedSignature
          }
          if (rec.signature425N) {
            updateData.verifiedBy425N = verifiedBy
            updateData.verifiedSig425N = verifiedSignature
          }
          await prisma.maintenanceEquipmentRecord.update({
            where: { id: rec.id },
            data: updateData,
          })
        }
        revalidatePath("/forms/maintenance/reports/maintenance-record")
        break
      }
      case "lighting":
        await prisma.maintenanceLighting.updateMany({ where: { id: { in: ids } }, data })
        break
      case "finished-goods":
        await prisma.maintenanceFinishedGoods.updateMany({ where: { id: { in: ids } }, data })
        break
      case "waste-management":
        await prisma.maintenanceWasteManagement.updateMany({ where: { id: { in: ids } }, data })
        break
      case "waste-disposal":
        await prisma.maintenanceWasteDisposal.updateMany({ where: { id: { in: ids } }, data })
        break
      case "food-handler":
        await prisma.maintenanceFoodHandler.updateMany({ where: { id: { in: ids } }, data })
        break
      case "chemical-control":
        await prisma.maintenanceChemical.updateMany({ where: { id: { in: ids } }, data })
        break
      case "cleaning":
        await prisma.maintenanceCleaning.updateMany({ where: { id: { in: ids } }, data })
        break
      case "pmir":
        await prisma.maintenancePreventiveInspection.updateMany({ where: { id: { in: ids } }, data })
        break
      case "pmr":
        await prisma.maintenancePreventiveRecord.updateMany({ where: { id: { in: ids } }, data })
        break
      case "fbsr":
        await prisma.maintenanceFiltrationBackwash.updateMany({ where: { id: { in: ids } }, data })
        break
      case "mgl":
        await prisma.productionGlassLog.updateMany({ where: { id: { in: ids } }, data })
        break
      case "mgb":
        await prisma.productionGlassBreakage.updateMany({ where: { id: { in: ids } }, data })
        break
      case "mwl":
        await prisma.productionWoodLog.updateMany({ where: { id: { in: ids } }, data })
        break
      case "mwb":
        await prisma.productionWoodBreakage.updateMany({ where: { id: { in: ids } }, data })
        break
      case "mpl":
        await prisma.productionPlasticLog.updateMany({ where: { id: { in: ids } }, data })
        break
      case "mpb":
        await prisma.productionPlasticBreakage.updateMany({ where: { id: { in: ids } }, data })
        break
      case "lfcr":
        await prisma.productionLightingFixture.updateMany({ where: { id: { in: ids } }, data })
        break
      case "ivvi":
        await prisma.securityIncomingVehicle.updateMany({ where: { id: { in: ids } }, data })
        break
      case "vchif":
        await prisma.securityVehicleHygiene.updateMany({ where: { id: { in: ids } }, data })
        break
      case "dqip":
        await prisma.maintenanceDQIP.updateMany({ where: { id: { in: ids } }, data })
        break
      case "qcdr":
        await prisma.maintenanceQCDR.updateMany({ where: { id: { in: ids } }, data })
        break
      case "fpir":
        await prisma.maintenanceFPIR.updateMany({ where: { id: { in: ids } }, data })
        break
      case "wqtr":
        await prisma.maintenanceWQTR.updateMany({ where: { id: { in: ids } }, data })
        break
      case "pcs":
        await prisma.maintenancePestControlSchedule.updateMany({ where: { id: { in: ids } }, data })
        break
      case "pcdm":
        await prisma.maintenancePestControlDaily.updateMany({ where: { id: { in: ids } }, data })
        break
      case "ftdm":
        await prisma.maintenanceFlyTrapDaily.updateMany({ where: { id: { in: ids } }, data })
        break
      case "fuv":
        await prisma.maintenanceHazardProcessControl.updateMany({
          where: { id: { in: ids }, isLocked: false },
          data: { ...data, isLocked: true },
        })
        revalidatePath("/forms/maintenance/fuv")
        revalidatePath("/forms/maintenance/reports/fuv")
        break
      case "retention-sample":
        await prisma.retentionSampleRecord.updateMany({
          where: { id: { in: ids } },
          data: { verifiedBy, verifiedSignature, verifiedAt: new Date() },
        })
        revalidatePath("/forms/maintenance/reports/retention-sample")
        break
      case "uv-machine-3-in-1":
        await prisma.productionUVMachineChecklist.updateMany({
          where: { id: { in: ids } },
          data: { verifiedBy, verifiedSignature, verifiedAt: new Date() },
        })
        revalidatePath("/forms/maintenance/reports/uv-machine-3-in-1")
        revalidatePath("/forms/maintenance/uv-machine-3-in-1")
        break
      default:
        return { success: false, error: "Invalid form type" }
    }

    revalidatePath("/forms/maintenance/summary")
    revalidatePath("/forms/maintenance/reports")
    revalidatePath("/forms/maintenance/compliance")
    return { success: true, count: ids.length }
  } catch (error: any) {
    console.error("Error batch verifying maintenance records:", error)
    return { success: false, error: error.message || "Failed to batch verify records." }
  }
}
