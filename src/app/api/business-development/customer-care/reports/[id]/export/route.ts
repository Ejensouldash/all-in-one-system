import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { renderToBuffer } from "@react-pdf/renderer"
import { prisma } from "@/lib/prisma"
import { getAccessInfo, canViewCustomerCare } from "@/lib/access"
import { lookupProductionBatches } from "@/lib/customer-care/batch-lookup"
import React from "react"
import {
  BatchInvestigationPdfDocument,
  type BatchInvestigationPdfData,
} from "@/lib/pdf/BatchInvestigationPdfDocument"

export const runtime = "nodejs"
export const maxDuration = 60

let logoCache: string | null = null

async function loadLogo(): Promise<string> {
  if (logoCache) return logoCache
  try {
    const file = await fs.readFile(path.join(process.cwd(), "public", "assets", "BubblesO2_Logo.png"))
    logoCache = `data:image/png;base64,${file.toString("base64")}`
    return logoCache
  } catch (e) {
    console.error("Could not load logo for Batch Investigation PDF:", e)
    return ""
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await getAccessInfo()
  if (!canViewCustomerCare(access)) {
    return NextResponse.json({ error: "Unauthorized access." }, { status: 401 })
  }

  const { id } = await params

  try {
    const complaint = await prisma.customerComplaint.findUnique({
      where: { id },
      include: {
        items: true,
      },
    })

    if (!complaint) {
      return NextResponse.json({ error: "Complaint not found." }, { status: 404 })
    }

    const logoUrl = await loadLogo()

    // Enrich each item with production matches
    const enrichedItems = await Promise.all(
      complaint.items.map(async (item) => {
        let matches: any[] = []
        if (item.cleanBatchNo) {
          const lookup = await lookupProductionBatches(
            item.cleanBatchNo,
            item.productSize as "425ml" | "800ml"
          )
          matches = lookup.matches.map((m) => ({
            bottleBatchNo: m.bottleBatchNo,
            productionOutputBatchNo: m.productionOutputBatchNo,
            productionQuantityBoxes: m.productionQuantityBoxes,
            productionType: m.productionType,
            productPacking: m.productPacking,
            productionDateStr: new Date(m.productionDate).toLocaleDateString("en-GB"),
            shift: m.shift,
            line: m.line,
            reportStatus: m.reportStatus,
            dailyReportRef: m.dailyReportId ? `DPR-${m.dailyReportId.slice(0, 8)}` : "Daily Report",
            preparedBy: m.preparedBy,
            verifiedBy: m.verifiedBy,
          }))
        }
        return {
          productSize: item.productSize,
          reportedQtyBottles: item.reportedQtyBottles,
          reportedBatchNo: item.reportedBatchNo,
          cleanBatchNo: item.cleanBatchNo,
          matchStatus: item.matchStatus,
          matchRemarks: item.matchRemarks,
          matches,
        }
      })
    )

    const pdfData: BatchInvestigationPdfData = {
      caseNumber: complaint.caseNumber,
      createdAtStr: new Date(complaint.createdAt).toLocaleDateString("en-GB", {
        timeZone: "Asia/Kuala_Lumpur",
        hour: "2-digit",
        minute: "2-digit",
      }),
      status: complaint.status,
      picDepartment: complaint.picDepartment,
      companyName: complaint.companyName,
      outletName: complaint.outletName,
      contactName: complaint.contactName,
      contactPhone: complaint.contactPhone,
      state: complaint.state,
      goodsLocationAddress: complaint.goodsLocationAddress,
      categories: complaint.categories.map((c) => c.replace("_", " ")),
      otherIssueDescription: complaint.otherIssueDescription,
      items: enrichedItems,
      logoUrl,
    }

    const pdfBuffer = await renderToBuffer(
      BatchInvestigationPdfDocument({ data: pdfData }) as any
    )

    return new NextResponse(pdfBuffer as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="Batch-Investigation-${complaint.caseNumber}.pdf"`,
      },
    })
  } catch (error: any) {
    console.error("[Customer Care Export] Error generating PDF:", error)
    return NextResponse.json({ error: error.message || "Failed to generate report PDF" }, { status: 500 })
  }
}
