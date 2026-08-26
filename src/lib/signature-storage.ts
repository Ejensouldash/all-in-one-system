import "server-only"

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3"
import { getR2Client, getR2Config } from "@/lib/sales-ordering/r2"

export function getSignatureObjectKey(userId: string): string {
  return `signatures/${userId}.png`
}

/**
 * Uploads a base64 encoded PNG signature directly to Cloudflare R2.
 */
export async function uploadSignatureToR2(userId: string, base64DataUrl: string): Promise<string> {
  const { bucket } = getR2Config()
  const client = getR2Client()
  const objectKey = getSignatureObjectKey(userId)

  // Strip metadata prefix if present (e.g. data:image/png;base64,...)
  const base64Data = base64DataUrl.replace(/^data:image\/\w+;base64,/, "")
  const buffer = Buffer.from(base64Data, "base64")

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      Body: buffer,
      ContentType: "image/png",
    })
  )

  // Return standard API proxy URL for the signature
  return `/api/users/${userId}/signature?t=${Date.now()}`
}

/**
 * Retrieves the signature image buffer from Cloudflare R2.
 */
export async function getSignatureBufferFromR2(userId: string): Promise<Buffer | null> {
  const { bucket } = getR2Config()
  const client = getR2Client()
  const objectKey = getSignatureObjectKey(userId)

  try {
    const response = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: objectKey,
      })
    )

    if (!response.Body) return null
    return Buffer.from(await response.Body.transformToByteArray())
  } catch (error: any) {
    if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
      return null
    }
    throw error
  }
}

/**
 * Checks if a user's signature exists in Cloudflare R2.
 */
export async function hasSignatureInR2(userId: string): Promise<boolean> {
  const { bucket } = getR2Config()
  const client = getR2Client()
  const objectKey = getSignatureObjectKey(userId)

  try {
    await client.send(
      new HeadObjectCommand({
        Bucket: bucket,
        Key: objectKey,
      })
    )
    return true
  } catch (error: any) {
    return false
  }
}

/**
 * Deletes a user's signature from Cloudflare R2.
 */
export async function deleteSignatureFromR2(userId: string): Promise<void> {
  const { bucket } = getR2Config()
  const client = getR2Client()
  const objectKey = getSignatureObjectKey(userId)

  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: objectKey,
      })
    )
  } catch (error: any) {
    console.error("Error deleting signature from R2:", error)
  }
}
