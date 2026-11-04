import {
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { getR2Client, getR2Config } from "@/lib/sales-ordering/r2"

export type MarketingCategory = "items" | "assets" | "events" | "images" | "creative"

export function getMarketingObjectKey(
  filename: string,
  category: MarketingCategory = "items"
): string {
  return `marketing/${category}/${filename}`
}

/**
 * Checks whether an object exists in Cloudflare R2 under marketing/<category>/.
 */
export async function checkMarketingObjectExists(
  category: MarketingCategory,
  filename: string
): Promise<boolean> {
  const { bucket } = getR2Config()
  const client = getR2Client()
  const objectKey = getMarketingObjectKey(filename, category)

  try {
    await client.send(
      new HeadObjectCommand({
        Bucket: bucket,
        Key: objectKey,
      })
    )
    return true
  } catch (error: any) {
    if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
      return false
    }
    throw error
  }
}

/**
 * Generates a presigned GET redirect URL for Cloudflare R2.
 * Defaults to 7 days (604800s) to comfortably outlive any HTTP CDN Cache-Control headers.
 */
export async function getMarketingPresignedUrl(
  category: MarketingCategory,
  filename: string,
  expiresInSeconds: number = 7 * 24 * 3600
): Promise<string | null> {
  const { bucket } = getR2Config()
  const client = getR2Client()
  const objectKey = getMarketingObjectKey(filename, category)

  const publicDomain = process.env.R2_PUBLIC_DOMAIN?.trim() || process.env.NEXT_PUBLIC_R2_PUBLIC_URL?.trim()
  if (publicDomain) {
    const base = publicDomain.replace(/\/+$/, "")
    return `${base}/${objectKey}`
  }

  try {
    return await getSignedUrl(
      client,
      new GetObjectCommand({
        Bucket: bucket,
        Key: objectKey,
      }),
      { expiresIn: expiresInSeconds }
    )
  } catch (err) {
    console.error(`Failed to generate presigned URL for marketing (${category}/${filename}):`, err)
    return null
  }
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
 * Uploads an item or asset photo with automatic fallback to base64 data URI ONLY if R2 is unreachable,
 * capped to small files (<200KB) to prevent database egress ballooning.
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
    console.warn(`R2 upload unavailable for marketing (${category}):`, error)
    if (fileBuffer.length > 200 * 1024) {
      throw new Error("Cloudflare R2 is temporarily unavailable and image is too large for database fallback. Please try again.")
    }
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
