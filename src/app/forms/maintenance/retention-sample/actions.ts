"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { getAccessInfo } from "@/lib/access"
import { logUserAction } from "@/app/actions/audit"
import { revalidatePath } from "next/cache"
import {
  RETENTION_SKU_OPTIONS,
  isValidBatchFormat,
  type RetentionSampleRecordDTO,
  type RetentionSampleFilterParams,
} from "./types"

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message
  return fallback
}

/**
 * Fetch retention sample records for a specific month and year in Asia/Kuala_Lumpur timezone.
 */
export async function getRetentionSampleRecords(params: RetentionSampleFilterParams) {
  try {
    const access = await getAccessInfo()
    if (!access) {
      return { success: false, error: "Unauthorized access. Please sign in.", data: [] }
    }

    const { month, year, search, sku, includeVoided } = params

    // Month boundary calculations in Asia/Kuala_Lumpur (UTC+8)
    const startOfMonthMyt = new Date(Date.UTC(year, month - 1, 1, -8, 0, 0, 0))
    const lastDay = new Date(year, month, 0).getDate()
    const endOfMonthMyt = new Date(Date.UTC(year, month - 1, lastDay, 15, 59, 59, 999))

    const whereClause: Prisma.RetentionSampleRecordWhereInput = {
      sampleDateTime: {
        gte: startOfMonthMyt,
        lte: endOfMonthMyt,
      },
    }

    if (!includeVoided) {
      whereClause.status = "ACTIVE"
    }

    if (sku && sku !== "ALL") {
      whereClause.sku = sku
    }

    if (search && search.trim()) {
      const q = search.trim()
      whereClause.OR = [
        { batchNo: { contains: q, mode: "insensitive" } },
        { preparedByName: { contains: q, mode: "insensitive" } },
        { remarks: { contains: q, mode: "insensitive" } },
      ]
    }

    const records = await prisma.retentionSampleRecord.findMany({
      where: whereClause,
      orderBy: {
        sampleDateTime: "asc", // Chronological sequence matching original physical sheet
      },
    })

    const canManage = access.isSuperAdmin || access.modules.includes("RETENTION_SAMPLE_MANAGE")

    return {
      success: true,
      canManage,
      currentUserName: access.name || "Current User",
      currentUserId: access.userId,
      data: records.map(r => ({
        ...r,
        sampleDateTime: r.sampleDateTime.toISOString(),
        voidedAt: r.voidedAt ? r.voidedAt.toISOString() : null,
        editedAt: r.editedAt ? r.editedAt.toISOString() : null,
        verifiedAt: r.verifiedAt ? r.verifiedAt.toISOString() : null,
        performedSignature: r.performedSignature || null,
        verifiedBy: r.verifiedBy || null,
        verifiedSignature: r.verifiedSignature || null,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })) as RetentionSampleRecordDTO[],
    }
  } catch (error: unknown) {
    console.error("Failed to fetch retention sample records:", error)
    return { success: false, error: getErrorMessage(error, "Failed to load records."), data: [] }
  }
}

/**
 * Creates a new Retention Sample Record.
 * Prepared By identity is strictly extracted from server authentication session.
 */
export async function createRetentionSampleRecord(data: {
  sampleDateTime: string
  sku: string
  amountSample: number
  batchNo: string
  remarks?: string
}) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: "Sesi tidak sah. Sila log masuk semula." }
    }

    const access = await getAccessInfo()
    if (!access) {
      return { success: false, error: "Akses ditolak." }
    }

    // Input Validation
    const cleanBatchNo = (data.batchNo || "").trim()
    if (!isValidBatchFormat(cleanBatchNo)) {
      return {
        success: false,
        error: "Format No Batch tidak sah. Wajib menggunakan format standard (6 digit tarikh - 2 digit giliran, cth: 013526-01).",
      }
    }

    const amount = Number(data.amountSample)
    if (!Number.isInteger(amount) || amount <= 0) {
      return {
        success: false,
        error: "Kuantiti 'Amount Sample' mestilah nombor bulat positif (cth: 12, 24).",
      }
    }

    if (!data.sku || !data.sku.trim()) {
      return { success: false, error: "Sila pilih SKU." }
    }

    const sampleDate = new Date(data.sampleDateTime)
    if (isNaN(sampleDate.getTime())) {
      return { success: false, error: "Tarikh & Masa persampelan tidak sah." }
    }

    const selectedSkuOption = RETENTION_SKU_OPTIONS.find(o => o.value === data.sku)
    const skuLabelSnapshot = selectedSkuOption ? selectedSkuOption.label : data.sku

    const record = await prisma.retentionSampleRecord.create({
      data: {
        sampleDateTime: sampleDate,
        sku: data.sku.trim(),
        skuLabel: skuLabelSnapshot,
        amountSample: amount,
        batchNo: cleanBatchNo,
        preparedById: session.user.id,
        preparedByName: session.user.name || "Pegawai Kualiti",
        remarks: data.remarks?.trim() || null,
        status: "ACTIVE",
      },
    })

    await logUserAction(
      "RETENTION_SAMPLE_CREATED",
      JSON.stringify({
        id: record.id,
        batchNo: record.batchNo,
        sku: record.sku,
        amountSample: record.amountSample,
        sampleDateTime: record.sampleDateTime,
      })
    )

    revalidatePath("/forms/maintenance/retention-sample")
    return { success: true, recordId: record.id }
  } catch (error: unknown) {
    console.error("Failed to create retention sample record:", error)
    return { success: false, error: getErrorMessage(error, "Gagal menyimpan rekod sampel.") }
  }
}

/**
 * Updates an existing Retention Sample Record.
 * Guarded by RETENTION_SAMPLE_MANAGE permission or SUPERADMIN.
 */
export async function updateRetentionSampleRecord(
  id: string,
  data: {
    sampleDateTime: string
    sku: string
    amountSample: number
    batchNo: string
    remarks?: string
    editReason: string
  }
) {
  try {
    const access = await getAccessInfo()
    if (!access) {
      return { success: false, error: "Sesi tidak sah." }
    }

    const canManage = access.isSuperAdmin || access.modules.includes("RETENTION_SAMPLE_MANAGE")
    if (!canManage) {
      return { success: false, error: "Anda tiada kebenaran untuk mengedit rekod ini (Memerlukan hak RETENTION_SAMPLE_MANAGE)." }
    }

    if (!data.editReason || data.editReason.trim().length < 3) {
      return { success: false, error: "Sila nyatakan sebab pembetulan/edit bagi tujuan audit GMP." }
    }

    const existing = await prisma.retentionSampleRecord.findUnique({ where: { id } })
    if (!existing) {
      return { success: false, error: "Rekod tidak ditemui." }
    }

    if (existing.status === "VOID") {
      return { success: false, error: "Rekod yang telah dibatalkan (VOID) tidak boleh diedit." }
    }

    const cleanBatchNo = (data.batchNo || "").trim()
    if (!isValidBatchFormat(cleanBatchNo)) {
      return {
        success: false,
        error: "Format No Batch tidak sah. Wajib mengikut format standard (cth: 013526-01).",
      }
    }

    const amount = Number(data.amountSample)
    if (!Number.isInteger(amount) || amount <= 0) {
      return { success: false, error: "Kuantiti 'Amount Sample' mestilah nombor bulat positif." }
    }

    const sampleDate = new Date(data.sampleDateTime)
    if (isNaN(sampleDate.getTime())) {
      return { success: false, error: "Tarikh & Masa persampelan tidak sah." }
    }

    const selectedSkuOption = RETENTION_SKU_OPTIONS.find(o => o.value === data.sku)
    const skuLabelSnapshot = selectedSkuOption ? selectedSkuOption.label : data.sku

    const updated = await prisma.retentionSampleRecord.update({
      where: { id },
      data: {
        sampleDateTime: sampleDate,
        sku: data.sku.trim(),
        skuLabel: skuLabelSnapshot,
        amountSample: amount,
        batchNo: cleanBatchNo,
        remarks: data.remarks?.trim() || null,
        editedAt: new Date(),
        editedById: access.userId,
        editReason: data.editReason.trim(),
      },
    })

    await logUserAction(
      "RETENTION_SAMPLE_UPDATED",
      JSON.stringify({
        id,
        before: {
          batchNo: existing.batchNo,
          sku: existing.sku,
          amountSample: existing.amountSample,
          sampleDateTime: existing.sampleDateTime,
        },
        after: {
          batchNo: updated.batchNo,
          sku: updated.sku,
          amountSample: updated.amountSample,
          sampleDateTime: updated.sampleDateTime,
        },
        reason: data.editReason.trim(),
        editor: access.name,
      })
    )

    revalidatePath("/forms/maintenance/retention-sample")
    return { success: true }
  } catch (error: unknown) {
    console.error("Failed to update retention sample record:", error)
    return { success: false, error: getErrorMessage(error, "Gagal mengemaskini rekod.") }
  }
}

/**
 * Voids a Retention Sample Record with audit reason.
 * Does not physically delete data to preserve strict GMP traceability.
 */
export async function voidRetentionSampleRecord(id: string, voidReason: string) {
  try {
    const access = await getAccessInfo()
    if (!access) {
      return { success: false, error: "Sesi tidak sah." }
    }

    const canManage = access.isSuperAdmin || access.modules.includes("RETENTION_SAMPLE_MANAGE")
    if (!canManage) {
      return { success: false, error: "Anda tiada kebenaran untuk membatalkan rekod ini (Memerlukan hak RETENTION_SAMPLE_MANAGE)." }
    }

    const cleanReason = (voidReason || "").trim()
    if (cleanReason.length < 3) {
      return { success: false, error: "Sila nyatakan sebab pembatalan (minima 3 aksara) untuk log audit." }
    }

    const existing = await prisma.retentionSampleRecord.findUnique({ where: { id } })
    if (!existing) {
      return { success: false, error: "Rekod tidak ditemui." }
    }

    if (existing.status === "VOID") {
      return { success: false, error: "Rekod ini sudah pun dibatalkan sebelum ini." }
    }

    await prisma.retentionSampleRecord.update({
      where: { id },
      data: {
        status: "VOID",
        voidedAt: new Date(),
        voidedById: access.userId,
        voidReason: cleanReason,
      },
    })

    await logUserAction(
      "RETENTION_SAMPLE_VOIDED",
      JSON.stringify({
        id,
        batchNo: existing.batchNo,
        sku: existing.sku,
        voidReason: cleanReason,
        actor: access.name,
      })
    )

    revalidatePath("/forms/maintenance/retention-sample")
    revalidatePath("/forms/maintenance/reports/retention-sample")
    revalidatePath("/forms/maintenance/summary")
    return { success: true }
  } catch (error: unknown) {
    console.error("Failed to void retention sample record:", error)
    return { success: false, error: getErrorMessage(error, "Gagal membatalkan rekod.") }
  }
}

export interface CreateRetentionSampleRow {
  time: string // "09:00" or "09:00 AM"
  sku: string
  amountSample: number
  batchNo: string
  remarks?: string
}

/**
 * Submits a batch of retention sample rows entered from the paperlike form table.
 */
export async function submitRetentionSampleBatch({
  date,
  rows,
  performedSignature,
}: {
  date: string // "YYYY-MM-DD"
  rows: CreateRetentionSampleRow[]
  performedSignature?: string
}) {
  try {
    const access = await getAccessInfo()
    if (!access) {
      return { success: false, error: "Akses tidak dibenarkan. Sila log masuk." }
    }

    if (!date) {
      return { success: false, error: "Tarikh sampel diperlukan." }
    }

    if (!rows || rows.length === 0) {
      return { success: false, error: "Sila masukkan sekurang-kurangnya satu baris sampel." }
    }

    const createdRecords = []
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      if (!row.sku) {
        return { success: false, error: `Baris #${i + 1}: Sila pilih SKU.` }
      }
      if (!row.amountSample || row.amountSample < 1) {
        return { success: false, error: `Baris #${i + 1}: Kuantiti sampel mestilah sekurang-kurangnya 1.` }
      }
      if (!row.batchNo || !isValidBatchFormat(row.batchNo)) {
        return { success: false, error: `Baris #${i + 1}: Format No Batch '${row.batchNo || ""}' tidak sah. Gunakan format 6 digit - 2 digit (cth: 013526-01).` }
      }

      // Parse time
      const timePart = row.time?.trim() || "09:00"
      let dt: Date
      if (timePart.includes(":")) {
        const parts = timePart.split(":")
        const hh = parseInt(parts[0], 10) || 9
        const mm = parseInt(parts[1], 10) || 0
        dt = new Date(`${date}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00`)
      } else {
        dt = new Date(`${date}T09:00:00`)
      }

      const skuOption = RETENTION_SKU_OPTIONS.find((o) => o.value === row.sku)
      const skuLabel = skuOption ? skuOption.label : row.sku

      const record = await prisma.retentionSampleRecord.create({
        data: {
          sampleDateTime: dt,
          sku: row.sku.trim(),
          skuLabel,
          amountSample: Math.floor(Number(row.amountSample)),
          batchNo: row.batchNo.trim(),
          preparedById: access.userId,
          preparedByName: access.name || "Unknown User",
          remarks: row.remarks?.trim() || null,
          status: "ACTIVE",
          performedSignature: performedSignature || null,
        },
      })
      createdRecords.push(record)
    }

    await logUserAction(
      "RETENTION_SAMPLE_BATCH_CREATED",
      JSON.stringify({
        count: createdRecords.length,
        date,
        batchNumbers: rows.map((r) => r.batchNo),
        actor: access.name,
      })
    )

    revalidatePath("/forms/maintenance/retention-sample")
    revalidatePath("/forms/maintenance/reports/retention-sample")
    revalidatePath("/forms/maintenance/summary")

    return { success: true, count: createdRecords.length }
  } catch (error: unknown) {
    console.error("Failed to submit retention sample batch:", error)
    return { success: false, error: getErrorMessage(error, "Gagal menyimpan sampel simpanan.") }
  }
}
