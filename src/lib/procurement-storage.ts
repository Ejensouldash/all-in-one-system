import "server-only"

import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { getR2Client, getR2Config } from "@/lib/sales-ordering/r2"

export function getProcurementObjectKey(folder: "invoices" | "receipts", filename: string): string {
  const clean = filename.replace(/[^a-zA-Z0-9._-]/g, "_")
  return `procurement/${folder}/${Date.now()}-${clean}`
}

export async function uploadProcurementFile(
  fileBuffer: Buffer,
  filename: string,
  contentType: string,
  folder: "invoices" | "receipts" = "invoices"
): Promise<{ key: string; url: string; filename: string }> {
  try {
    const { bucket } = getR2Config()
    const client = getR2Client()
    const objectKey = getProcurementObjectKey(folder, filename)

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        Body: fileBuffer,
        ContentType: contentType,
      })
    )

    const publicUrl = `/api/procurement/file/${objectKey}`
    return { key: objectKey, url: publicUrl, filename }
  } catch (err) {
    console.warn("R2 upload fallback or failed:", err)
    // Fallback: Return data URL if small, or rethrow
    const base64 = fileBuffer.toString("base64")
    const dataUrl = `data:${contentType};base64,${base64}`
    return { key: filename, url: dataUrl, filename }
  }
}

export async function getProcurementFileStream(objectKey: string) {
  const { bucket } = getR2Config()
  const client = getR2Client()

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: objectKey,
  })

  return await client.send(command)
}
