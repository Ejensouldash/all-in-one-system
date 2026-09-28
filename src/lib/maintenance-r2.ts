import "server-only"

import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3"
import { getR2Client, getR2Config } from "@/lib/sales-ordering/r2"

export function getMaintenancePhotoKey(filename: string): string {
  return `maintenance-tickets/images/${filename}`
}

/**
 * Uploads a maintenance damage photo buffer to Cloudflare R2.
 */
export async function uploadMaintenancePhotoToR2(
  fileBuffer: Buffer,
  originalFilename: string,
  contentType: string = "image/jpeg"
): Promise<{ key: string; url: string }> {
  const { bucket } = getR2Config()
  const client = getR2Client()

  // Clean filename and create unique timestamped key
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
 * Retrieves the maintenance damage photo buffer from Cloudflare R2.
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
