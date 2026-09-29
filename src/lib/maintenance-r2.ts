import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3"
import { getR2Client, getR2Config } from "@/lib/sales-ordering/r2"

export function getMaintenancePhotoKey(filename: string): string {
  return `maintenance-tickets/images/${filename}`
}

export function getMaintenanceDocKey(filename: string): string {
  return `maintenance-tickets/docs/${filename}`
}

export function getMaintenanceJobSheetKey(jobSheetNumber: string): string {
  return `maintenance-tickets/job-sheets/${jobSheetNumber}.pdf`
}

/**
 * Uploads a maintenance photo buffer to Cloudflare R2.
 */
export async function uploadMaintenancePhotoToR2(
  fileBuffer: Buffer,
  originalFilename: string,
  contentType: string = "image/jpeg"
): Promise<{ key: string; url: string }> {
  const { bucket } = getR2Config()
  const client = getR2Client()

  const ext = originalFilename.split(".").pop()?.toLowerCase() || "jpg"
  const cleanBase = originalFilename
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .substring(0, 30)
  const uniqueKeyName = `${Date.now()}-${cleanBase}.${ext}`
  const objectKey = getMaintenancePhotoKey(uniqueKeyName)

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      Body: fileBuffer,
      ContentType: contentType,
    })
  )

  const publicUrl = `/api/public/maintenance/image/${uniqueKeyName}`
  return { key: objectKey, url: publicUrl }
}

/**
 * Uploads an intake PDF document to Cloudflare R2.
 */
export async function uploadMaintenancePdfToR2(
  fileBuffer: Buffer,
  originalFilename: string
): Promise<{ key: string; url: string }> {
  const { bucket } = getR2Config()
  const client = getR2Client()

  const cleanBase = originalFilename
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .substring(0, 35)
  const uniqueKeyName = `${Date.now()}-${cleanBase}.pdf`
  const objectKey = getMaintenanceDocKey(uniqueKeyName)

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      Body: fileBuffer,
      ContentType: "application/pdf",
    })
  )

  const publicUrl = `/api/public/maintenance/doc/${uniqueKeyName}`
  return { key: objectKey, url: publicUrl }
}

/**
 * Uploads a generated Job Sheet & Billing Memo PDF to Cloudflare R2.
 */
export async function uploadMaintenanceJobSheetPdfToR2(
  fileBuffer: Buffer,
  jobSheetNumber: string
): Promise<{ key: string; url: string }> {
  const { bucket } = getR2Config()
  const client = getR2Client()

  const objectKey = getMaintenanceJobSheetKey(jobSheetNumber)

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      Body: fileBuffer,
      ContentType: "application/pdf",
    })
  )

  const publicUrl = `/api/public/maintenance/jobsheet/${jobSheetNumber}`
  return { key: objectKey, url: publicUrl }
}

/**
 * Retrieves a maintenance photo buffer from Cloudflare R2.
 */
export async function getMaintenancePhotoFromR2(uniqueKeyName: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  const { bucket } = getR2Config()
  const client = getR2Client()
  const objectKey = getMaintenancePhotoKey(uniqueKeyName)

  try {
    const response = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: objectKey,
      })
    )

    if (!response.Body) return null
    const buffer = Buffer.from(await response.Body.transformToByteArray())
    const contentType = response.ContentType || "image/jpeg"
    return { buffer, contentType }
  } catch (error: any) {
    if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
      return null
    }
    throw error
  }
}

/**
 * Retrieves a maintenance document or job sheet PDF from Cloudflare R2.
 */
export async function getMaintenanceFileByExactKeyFromR2(objectKey: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  const { bucket } = getR2Config()
  const client = getR2Client()

  try {
    const response = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: objectKey,
      })
    )

    if (!response.Body) return null
    const buffer = Buffer.from(await response.Body.transformToByteArray())
    const contentType = response.ContentType || "application/pdf"
    return { buffer, contentType }
  } catch (error: any) {
    if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
      return null
    }
    throw error
  }
}
