import Link from "next/link"
import { getAllNrhoApprovalsOverview } from "@/app/actions/nrho-project"
import { 
  Crown, 
  ArrowLeft, 
  Building2, 
  MapPin, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  RotateCcw, 
  ExternalLink, 
  DollarSign, 
  UserCheck 
} from "lucide-react"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Boss Approvals Queue | NRHO Project",
  description: "Executive presentation and management approval queue for NRHO project proposals.",
}

const STATUS_BADGES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  DRAFT: {
    label: "DRAFT / QUOTATION",
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
  },
  PENDING_APPROVAL: {
    label: "PENDING BOSS APPROVAL",
    bg: "bg-blue-50",
    text: "text-blue-800",
    border: "border-blue-200",
  },
  APPROVED: {
    label: "APPROVED / READY TO START",
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-200",
  },
  IN_PROGRESS: {
    label: "IN PROGRESS",
    bg: "bg-indigo-50",
    text: "text-indigo-800",
    border: "border-indigo-200",
  },
  ON_HOLD: {
    label: "ON HOLD / REVISION",
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-300",
  },
  COMPLETED: {
    label: "COMPLETED",
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-300",
  },
  CANCELLED: {
    label: "CANCELLED",
    bg: "bg-rose-50",
    text: "text-rose-800",
    border: "border-rose-200",
  },
}

export default async function NrhoApprovalsOverviewPage() {
  const res = await getAllNrhoApprovalsOverview()
  const projects = res.success && res.data ? res.data : []

  const pendingList = projects.filter((p) => p.status === "PENDING_APPROVAL")
  const approvedList = projects.filter((p) => p.status === "APPROVED" || p.status === "IN_PROGRESS")
  const draftList = projects.filter((p) => p.status === "DRAFT" || p.status === "CANCELLED")

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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold uppercase tracking-wider">
            <Crown className="h-3.5 w-3.5" />
            <span>Executive Governance &amp; Approvals</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Boss Presentation &amp; Approval Queue
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
            Review submitted project proposals, inspect cost estimates and Bill of Quantities breakdown, provide management remarks, and grant execution clearance.
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shrink-0 flex items-center gap-6 shadow-sm">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">Pending Review</span>
            <span className="text-3xl font-black font-mono text-amber-700">{pendingList.length}</span>
          </div>
          <div className="h-10 w-px bg-slate-200" />
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">Approved</span>
            <span className="text-3xl font-black font-mono text-emerald-700">{approvedList.length}</span>
          </div>
        </div>
      </div>

      {/* SECTION 1: PENDING BOSS APPROVAL QUEUE */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Awaiting Boss Approval ({pendingList.length})</span>
            </h2>
            <p className="text-xs text-slate-500">Proposals presented by project managers ready for executive review.</p>
          </div>
        </div>

        {pendingList.length === 0 ? (
          <div className="p-8 text-center bg-white border border-slate-200/80 rounded-2xl text-xs text-slate-500 shadow-sm">
            ✓ No project proposals are currently waiting for boss approval.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingList.map((project) => (
              <div
                key={project.id}
                className="bg-white border border-blue-200 rounded-2xl p-5 space-y-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-blue-700 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                    {project.projectCode}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
                    PENDING APPROVAL
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900">{project.title}</h3>
                  {project.siteLocation && (
                    <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-rose-500" />
                      <span>{project.siteLocation}</span>
                    </p>
                  )}
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block font-semibold">BQ Proposal Value</span>
                    <span className="font-mono font-black text-sm text-emerald-700">
                      RM {project.totalBqAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 uppercase block font-semibold">BQ Items</span>
                    <span className="font-mono font-bold text-slate-700">{project.bqItems.length} lines</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end">
                  <Link
                    href={`/nrho-project/${project.id}?tab=approval`}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm flex items-center gap-2 transition-all active:scale-95"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Review &amp; Approve</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: APPROVED PROJECTS */}
      <div className="space-y-4 pt-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Approved Projects ({approvedList.length})</span>
          </h2>
          <p className="text-xs text-slate-500">Proposals that have received boss approval and are active in execution.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {approvedList.map((project) => (
            <div
              key={project.id}
              className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-3 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-blue-700 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                  {project.projectCode}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  APPROVED
                </span>
              </div>

              <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{project.title}</h3>

              <div className="text-xs text-slate-600">
                <span>Budget Ceiling: </span>
                <span className="font-mono font-bold text-emerald-700">
                  RM {project.totalBqAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>

              {project.approvalRemarks && (
                <p className="text-[11px] text-slate-700 italic bg-slate-50 p-2.5 rounded-xl border border-slate-200 line-clamp-2">
                  &ldquo;{project.approvalRemarks}&rdquo;
                </p>
              )}

              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <Link
                  href={`/nrho-project/${project.id}`}
                  className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
                >
                  <span>Open Hub</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
