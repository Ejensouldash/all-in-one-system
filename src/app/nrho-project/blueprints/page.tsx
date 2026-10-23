import Link from "next/link"
import { formatMalaysiaDate } from "@/lib/dateTime"
import { getAllNrhoBlueprintsOverview } from "@/app/actions/nrho-project"
import { 
  Layers, 
  ArrowLeft, 
  Building2, 
  MapPin, 
  FileText, 
  Download, 
  ExternalLink, 
  Eye, 
  Plus 
} from "lucide-react"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Floor Plans & Blueprints | NRHO Project",
  description: "Repository of architectural blueprints, floor plans, and CAD drawings across NRHO projects.",
}

export default async function NrhoBlueprintsOverviewPage() {
  const res = await getAllNrhoBlueprintsOverview()
  const blueprints = res.success && res.data ? res.data : []

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/nrho-project"
          className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to NRHO Projects Dashboard
        </Link>
      </div>

      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold uppercase tracking-wider">
            <Layers className="h-3.5 w-3.5" />
            <span>Technical Drawings &amp; Schematics</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Floor Plans &amp; Blueprints Gallery
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
            Centralized visual drawing archive of architectural layouts, structural elevations, electrical single-line diagrams, and mechanical piping plans.
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shrink-0 flex flex-col justify-center shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Drawings Logged</span>
          <span className="text-3xl font-black font-mono text-teal-700">{blueprints.length}</span>
          <span className="text-xs text-slate-500 mt-0.5">Across all registered projects</span>
        </div>
      </div>

      {/* Blueprints Gallery Grid */}
      <div className="space-y-4">
        {blueprints.length === 0 ? (
          <div className="p-16 text-center bg-white border border-slate-200/80 rounded-2xl shadow-sm">
            <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No Technical Drawings Uploaded Yet</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Open any project to upload floor plans, CAD drawings, or site layout diagrams.
            </p>
            <Link
              href="/nrho-project"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase rounded-xl inline-flex items-center gap-2 shadow-sm"
            >
              <span>View Projects Catalog</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {blueprints.map((bp) => {
              const isPdf = bp.fileType === "PDF" || bp.fileUrl.startsWith("data:application/pdf") || bp.fileUrl.endsWith(".pdf")
              return (
                <div
                  key={bp.id}
                  className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden hover:border-slate-300 transition-all flex flex-col justify-between shadow-sm group"
                >
                  {/* Visual Preview Box */}
                  <div className="h-44 bg-slate-100 relative flex items-center justify-center overflow-hidden border-b border-slate-200">
                    {isPdf ? (
                      <div className="text-center p-4">
                        <FileText className="w-14 h-14 text-rose-500 mx-auto mb-1 opacity-80 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-mono font-bold text-rose-700 uppercase bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          PDF Drawing Document
                        </span>
                      </div>
                    ) : (
                      <img
                        src={bp.fileUrl}
                        alt={bp.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    )}

                    <div className="absolute top-2 left-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white/90 text-teal-800 border border-slate-200">
                        {bp.project?.projectCode || "NRHO"}
                      </span>
                    </div>
                  </div>

                  {/* Metadata & Project Link */}
                  <div className="p-4 space-y-3">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 line-clamp-1" title={bp.title}>
                        {bp.title}
                      </h4>
                      <Link
                        href={`/nrho-project/${bp.project?.id}?tab=blueprints`}
                        className="text-[11px] text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 mt-0.5"
                      >
                        <Building2 className="w-3 h-3 text-slate-400" />
                        <span className="truncate">{bp.project?.title}</span>
                      </Link>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-500">
                        {formatMalaysiaDate(bp.createdAt, "medium")}
                      </span>

                      <div className="flex items-center gap-2">
                        <a
                          href={bp.fileUrl}
                          download={bp.title}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors border border-slate-200"
                        >
                          <Download className="w-3 h-3" />
                          <span>Download</span>
                        </a>

                        <Link
                          href={`/nrho-project/${bp.project?.id}?tab=blueprints`}
                          className="p-1.5 text-slate-400 hover:text-teal-700 hover:bg-slate-100 rounded-lg transition-colors"
                          title="View in Project Hub"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
