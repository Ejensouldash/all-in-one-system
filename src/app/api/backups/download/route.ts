import { NextResponse } from "next/server"
import { google } from "googleapis"
import { auth } from "@/auth"

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get("fileId")

    if (!fileId) {
      return new NextResponse("Missing fileId", { status: 400 })
    }

    const credentialsJsonStr = process.env.GDRIVE_CREDENTIALS_JSON || ""
    const folderId = process.env.GDRIVE_FOLDER_ID || ""

    if (!credentialsJsonStr || !folderId) {
      return new NextResponse("Missing Drive Configuration", { status: 500 })
    }

    let credentials;
    try {
      credentials = JSON.parse(credentialsJsonStr)
    } catch (e) {
      return new NextResponse("Invalid Drive Credentials", { status: 500 })
    }

    const googleAuth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    })

    const drive = google.drive({ version: 'v3', auth: googleAuth })

    // First get the filename
    const fileMeta = await drive.files.get({
      fileId: fileId,
      fields: 'name'
    })

    const fileName = fileMeta.data.name || 'backup.sql.gz'

    // Then get the file stream
    const fileStream = await drive.files.get(
      { fileId: fileId, alt: 'media' },
      { responseType: 'stream' }
    )

    // @ts-ignore
    return new NextResponse(fileStream.data, {
      headers: {
        'Content-Type': 'application/gzip',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      }
    })

  } catch (error: any) {
    console.error("Error downloading file:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
