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
    const refresh = request.nextUrl.searchParams.get("refresh") === "true"
    let file = refresh ? null : await getMaintenanceFileByExactKeyFromR2(key)

    if (!file) {
      // Dynamic on-demand regeneration: find ticket and recompile with latest format & photos
      const { prisma } = await import("@/lib/prisma")
      const { generateAndSaveMaintenanceJobSheet } = await import("@/lib/maintenance-pdf")
      
      const ticket = await prisma.maintenanceTicket.findFirst({
        where: {
          OR: [
            { jobSheetNumber },
            { id: jobSheetNumber },
          ],
        },
        select: { id: true, jobSheetNumber: true },
      })

      if (ticket) {
        await generateAndSaveMaintenanceJobSheet(ticket.id)
        file = await getMaintenanceFileByExactKeyFromR2(key)
      }
    }

    if (!file) {
      return new NextResponse("Job sheet PDF not found", { status: 404 })
    }

    const headers = new Headers()
    headers.set("Content-Type", "application/pdf")
    headers.set("Content-Disposition", `inline; filename="${jobSheetNumber}.pdf"`)
    headers.set("Cache-Control", refresh ? "no-cache" : "public, max-age=3600")

    return new NextResponse(file.buffer as any, {
      status: 200,
      headers,
    })
  } catch (error) {
    console.error("Error serving maintenance job sheet PDF:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
