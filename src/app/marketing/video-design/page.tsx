import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getAccessInfo, canAccessMarketing } from "@/lib/access"
import { MarketingVideoDesignClient } from "./MarketingVideoDesignClient"
import { MarketingNavTabs } from "@/components/marketing/MarketingNavTabs"
import { VideoDesignRequisitionRecord } from "@/app/actions/marketing-video-design"
import Link from "next/link"
import { QrCode } from "lucide-react"

export const metadata = {
  title: "Video & Design Requisitions | Bubbles O2 Marketing",
  description: "Review, assign, and manage video production and graphic design requisitions submitted to the Marketing Department.",
}

export default async function MarketingVideoDesignPage() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/marketing/video-design")

  const access = await getAccessInfo()
  if (!access || !canAccessMarketing(access)) {
    redirect("/dashboard")
  }

  let requisitions: VideoDesignRequisitionRecord[] = []
  try {
    const records = await prisma.marketingVideoDesignRequisition.findMany({
      orderBy: { createdAt: "desc" },
    })

    requisitions = records.map((r) => ({
      id: r.id,
      requestNumber: r.requestNumber,
      type: r.type,
      name: r.name,
      staffId: r.staffId,
      department: r.department,
      needBy: r.needBy,
      phoneNumber: r.phoneNumber,
      videoType: r.videoType,
      format: r.format,
      videoDetails: r.videoDetails,
      videoContentFocus: r.videoContentFocus,
      requiredShots: r.requiredShots,
      designType: r.designType,
      designDetails: r.designDetails,
      designSize: r.designSize,
      designContent: r.designContent,
      needPrinting: r.needPrinting,
      referenceLinks: r.referenceLinks,
      attachments: r.attachments,
      status: r.status,
      remarks: r.remarks,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }))
  } catch (error) {
    console.warn("Could not query marketingVideoDesignRequisition table:", error)
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      <MarketingNavTabs userModules={access.modules} isSuperAdmin={access.isSuperAdmin} />
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">
            Video &amp; Design Studio Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track and process internal department requests for promotional videos, social content, and graphic designs.
          </p>
        </div>

          <div className="flex items-center gap-3">
            <Link
              href="/marketing/assets/qr"
              className="py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-black uppercase tracking-wider transition flex items-center gap-2 shadow-xs cursor-pointer"
              title="Print Marketing Requisition QR Poster for Department Offices"
            >
              <QrCode className="w-4 h-4 text-blue-600" />
              Print QR Poster
            </Link>
        <a
          href="/public/marketing/request?type=video-design"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer self-start sm:self-auto"
        >
          <span>Open Public Form</span>
        </a>
      </div>
      </div>

      <MarketingVideoDesignClient initialRequisitions={requisitions} />
    </div>
  )
}
