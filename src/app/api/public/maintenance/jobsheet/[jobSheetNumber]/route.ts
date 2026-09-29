import { NextRequest, NextResponse } from "next/server"
import { getMaintenanceFileByExactKeyFromR2, getMaintenanceJobSheetKey } from "@/lib/maintenance-r2"

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ jobSheetNumber: string }> }
) {
  try {
    const { jobSheetNumber } = await props.params
    if (!jobSheetNumber) {
      return new NextResponse("Job sheet reference is required", { status: 400 })
    }

    const key = getMaintenanceJobSheetKey(jobSheetNumber)
    const file = await getMaintenanceFileByExactKeyFromR2(key)
    if (!file) {
      return new NextResponse("Job sheet PDF not found", { status: 404 })
    }

    const headers = new Headers()
    headers.set("Content-Type", "application/pdf")
    headers.set("Content-Disposition", `inline; filename="${jobSheetNumber}.pdf"`)
    headers.set("Cache-Control", "public, max-age=3600")

    return new NextResponse(file.buffer as any, {
      status: 200,
      headers,
    })
  } catch (error) {
    console.error("Error serving maintenance job sheet PDF:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
