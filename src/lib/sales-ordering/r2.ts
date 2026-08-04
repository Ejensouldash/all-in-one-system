import "server-only"

import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

function requireEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is not configured`)
  return value
}

export function getR2Config() {
  const accountId = requireEnv("R2_ACCOUNT_ID")
  return {
    bucket: requireEnv("R2_BUCKET_NAME"),
    endpoint: process.env.R2_ENDPOINT?.trim() || `https://${accountId}.r2.cloudflarestorage.com`,
    accountId,
  }
}

export function getR2Client() {
  const { endpoint } = getR2Config()
  return new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
    },
  })
}

export function safePdfName(fileName: string) {
  const base = fileName.replace(/\.pdf$/i, "")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
  return `${base || "customer-document"}.pdf`
}

export async function createPdfUploadUrl(objectKey: string, contentType: string) {
  const { bucket } = getR2Config()
  return getSignedUrl(
    getR2Client(),
    new PutObjectCommand({ Bucket: bucket, Key: objectKey, ContentType: contentType }),
    { expiresIn: 300 },
  )
}

export async function assertR2Object(objectKey: string) {
  const { bucket } = getR2Config()
  return getR2Client().send(new HeadObjectCommand({ Bucket: bucket, Key: objectKey }))
}

export async function readR2Object(objectKey: string) {
  const { bucket } = getR2Config()
  const response = await getR2Client().send(new GetObjectCommand({ Bucket: bucket, Key: objectKey }))
  if (!response.Body) throw new Error("R2 object has no body")
  return Buffer.from(await response.Body.transformToByteArray())
}

