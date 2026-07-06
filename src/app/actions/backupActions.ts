"use server"

import { google } from "googleapis"

const credentialsJsonStr = process.env.GDRIVE_CREDENTIALS_JSON || ""
const folderId = process.env.GDRIVE_FOLDER_ID || ""

function getDriveClient() {
  if (!credentialsJsonStr || !folderId) {
    throw new Error("Missing Google Drive configuration in environment variables.")
  }

  let credentials;
  try {
    credentials = JSON.parse(credentialsJsonStr)
  } catch (error) {
    throw new Error("Invalid GDRIVE_CREDENTIALS_JSON format.")
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive.readonly'],
  })

  return google.drive({ version: 'v3', auth })
}

export async function getSystemBackups() {
  try {
    const drive = getDriveClient()

    const query = `'${folderId}' in parents and name contains '.sql.gz' and trashed = false`
    
    const response = await drive.files.list({
      q: query,
      fields: 'files(id, name, createdTime, size)',
      orderBy: 'createdTime desc',
    })

    const backups = response.data.files?.map(file => ({
      name: file.name,
      id: file.id,
      created_at: file.createdTime,
      size: file.size ? parseInt(file.size) : 0
    })) || []

    return { success: true, data: backups }
  } catch (error: any) {
    console.error("Backup listing error:", error)
    return { success: false, error: error.message }
  }
}

export async function getBackupDownloadUrl(fileId: string) {
  try {
    // We cannot generate a signed URL for Google Drive easily without making it public.
    // Instead, we return a URL to our own internal API route which will securely stream the file.
    return { success: true, url: `/api/backups/download?fileId=${fileId}` }
  } catch (error: any) {
    console.error("Backup download URL error:", error)
    return { success: false, error: error.message }
  }
}
