import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3"
import { getR2Client, getR2Config } from "@/lib/sales-ordering/r2"

export type MarketingCategory = "items" | "assets" | "events" | "images"

export function getMarketingObjectKey(
  filename: string,
  category: MarketingCategory = "items"
): string {
  return `marketing/${category}/${filename}`
}

/**
 * Uploads a marketing photo or document buffer to Cloudflare R2 under marketing/<category>/.
 */
export async function uploadMarketingPhotoToR2(
  fileBuffer: Buffer,
  originalFilename: string,
  contentType: string = "image/jpeg",
  category: MarketingCategory = "items"
): Promise<{ key: string; url: string }> {
  const { bucket } = getR2Config()
  const client = getR2Client()

  const ext = originalFilename.split(".").pop()?.toLowerCase() || "jpg"
  const cleanBase = originalFilename
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .substring(0, 30)
  const uniqueKeyName = `${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}-${cleanBase}.${ext}`
  const objectKey = getMarketingObjectKey(uniqueKeyName, category)

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      Body: fileBuffer,
      ContentType: contentType,
    })
  )

  const publicUrl = `/api/public/marketing/image/${category}/${uniqueKeyName}`
  return { key: objectKey, url: publicUrl }
}

/**
 * Uploads an item or asset photo with automatic fallback to base64 data URI if R2 is unreachable.
 */
export async function uploadMarketingItemPhoto(
  fileBuffer: Buffer,
  originalFilename: string,
  contentType: string = "image/jpeg",
  category: MarketingCategory = "items"
): Promise<{ url: string }> {
  try {
    const res = await uploadMarketingPhotoToR2(fileBuffer, originalFilename, contentType, category)
    return { url: res.url }
  } catch (error) {
    console.warn(`R2 upload unavailable, falling back to base64 data URL for marketing (${category}):`, error)
    const base64 = fileBuffer.toString("base64")
    const dataUri = `data:${contentType};base64,${base64}`
    return { url: dataUri }
  }
}

/**
 * Retrieves a marketing photo/file buffer from Cloudflare R2.
 */
export async function getMarketingPhotoFromR2(
  category: MarketingCategory,
  filename: string
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const { bucket } = getR2Config()
  const client = getR2Client()
  const objectKey = getMarketingObjectKey(filename, category)

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
