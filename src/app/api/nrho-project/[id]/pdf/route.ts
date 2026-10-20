import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { renderToBuffer } from "@react-pdf/renderer"
import { getBubblesO2LogoBase64 } from "@/lib/pdf/nrho/nrho-pdf-utils"
import { NrhoTimelineDocument } from "@/lib/pdf/nrho/NrhoTimelineDocument"
import { NrhoQuotationDocument } from "@/lib/pdf/nrho/NrhoQuotationDocument"
import { NrhoBqDocument } from "@/lib/pdf/nrho/NrhoBqDocument"
import { NrhoUatDocument } from "@/lib/pdf/nrho/NrhoUatDocument"
import { NrhoFullReportDocument } from "@/lib/pdf/nrho/NrhoFullReportDocument"

export const runtime = "nodejs"

function safeFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_+|_+$/g, "") || "DOCUMENT"
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const searchParams = request.nextUrl.searchParams
    const type = (searchParams.get("type") || "timeline").toLowerCase()
    const hidePricing = searchParams.get("hidePricing") === "true"

    const project = await prisma.nrhoProject.findUnique({
      where: { id },
      include: {
        bqItems: {
          orderBy: { orderIndex: "asc" },
        },
        tasks: {
          orderBy: [{ currentWeek: "asc" }, { createdAt: "asc" }],
          include: {
            rescheduleLogs: {
              orderBy: { createdAt: "desc" },
            },
          },
        },
        uatSessions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            items: {
              orderBy: { orderIndex: "asc" },
            },
          },
        },
      },
    })

    if (!project) {
      return new NextResponse("Project not found", { status: 404 })
    }

    const logoSource = await getBubblesO2LogoBase64()
    const code = safeFilename(project.projectCode)
    let buffer: Buffer
    let filename: string

    switch (type) {
      case "quotation": {
        filename = `Quotation_${code}.pdf`
        buffer = await renderToBuffer(
          NrhoQuotationDocument({
            logoSource,
            project: {
              projectCode: project.projectCode,
              title: project.title,
              clientOrDepartment: project.clientOrDepartment,
              siteLocation: project.siteLocation,
              projectManager: project.projectManager,
              startDate: project.startDate,
              targetCompletionDate: project.targetCompletionDate,
              bqItems: project.bqItems,
            },
          })
        )
        break
      }

      case "bq": {
        filename = `BQ_${code}${hidePricing ? "_Tender" : ""}.pdf`
        buffer = await renderToBuffer(
          NrhoBqDocument({
            logoSource,
            hidePricing,
            project: {
              projectCode: project.projectCode,
              title: project.title,
              clientOrDepartment: project.clientOrDepartment,
              siteLocation: project.siteLocation,
              projectManager: project.projectManager,
              bqItems: project.bqItems,
            },
          })
        )
        break
      }

      case "uat": {
        filename = `UAT_${code}.pdf`
        const uat = project.uatSessions[0] || {
          testerName: project.projectManager,
          testerPhone: "",
          testerLocation: project.siteLocation,
          testerAddress: project.siteLocation,
          startDate: project.startDate,
          endDate: project.targetCompletionDate,
          overallResult: "PENDING",
          notes: "",
          items: project.bqItems.map((b) => ({
            itemDescription: b.description,
            installationStatus: "COMPLETED",
            testResult: "PASS",
            issues: "",
          })),
        }

        buffer = await renderToBuffer(
          NrhoUatDocument({
            logoSource,
            project: {
              projectCode: project.projectCode,
              title: project.title,
              siteLocation: project.siteLocation,
              clientOrDepartment: project.clientOrDepartment,
            },
            uat,
          })
        )
        break
      }

      case "full-report":
      case "full":
      case "report": {
        filename = `Full_Report_${code}.pdf`
        buffer = await renderToBuffer(
          NrhoFullReportDocument({
            logoSource,
            project: {
              projectCode: project.projectCode,
              title: project.title,
              description: project.description,
              siteLocation: project.siteLocation,
              projectManager: project.projectManager,
              clientOrDepartment: project.clientOrDepartment,
              startDate: project.startDate,
              targetCompletionDate: project.targetCompletionDate,
              status: project.status,
              totalBqAmount: project.totalBqAmount,
              aiSummary: project.aiSummary,
              tasks: project.tasks,
              bqItems: project.bqItems,
              uatSessions: project.uatSessions,
            },
          })
        )
        break
      }

      case "timeline":
      default: {
        filename = `Timeline_${code}.pdf`
        buffer = await renderToBuffer(
          NrhoTimelineDocument({
            logoSource,
            project: {
              projectCode: project.projectCode,
              title: project.title,
              description: project.description,
              siteLocation: project.siteLocation,
              projectManager: project.projectManager,
              clientOrDepartment: project.clientOrDepartment,
              startDate: project.startDate,
              targetCompletionDate: project.targetCompletionDate,
              status: project.status,
              tasks: project.tasks,
            },
          })
        )
        break
      }
    }

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    })
  } catch (error) {
    console.error("NRHO PDF generation error:", error)
    return new NextResponse("Failed to generate PDF document", { status: 500 })
  }
}
