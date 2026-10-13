import Link from "next/link"
import { getNrhoProjects } from "@/app/actions/nrho-project"
import { 
  Building2, 
  Plus, 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight,
  HardHat,
  DollarSign,
  Layers,
  Calendar,
  MapPin,
  TrendingUp,
  FolderKanban,
  FileSpreadsheet,
  Receipt,
  ShoppingCart,
  Boxes
} from "lucide-react"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "NRHO Project Hub | BubblesO2",
  description: "Comprehensive management for NRHO projects, BQ, timelines, approvals, financials, and floor plans.",
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
    label: "ON HOLD",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
  },
  COMPLETED: {
    label: "COMPLETED",
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-200",
  },
  CANCELLED: {
    label: "CANCELLED",
    bg: "bg-rose-50",
    text: "text-rose-800",
    border: "border-rose-200",
  },
}

export default async function NrhoProjectsPage() {
  const res = await getNrhoProjects()
  const projects = res.success && res.data ? res.data : []

  // Stats calculation
  const totalProjects = projects.length
  const activeProjects = projects.filter((p) => p.status === "APPROVED" || p.status === "IN_PROGRESS").length
  const pendingApproval = projects.filter((p) => p.status === "PENDING_APPROVAL").length
  const completedProjects = projects.filter((p) => p.status === "COMPLETED").length
  const totalBq = projects.reduce((sum, p) => sum + (p.totalBqAmount || 0), 0)
  const totalPo = projects.reduce((sum, p) => sum + (p.totalPoAmount || 0), 0)

  return (
    <div className="bg-slate-50 min-h-screen pb-16">
      <div className="max-w-7xl mx-auto space-y-8 p-4 sm:p-6 lg:p-8 pt-8">
        {/* Header Hero Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-slate-800">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 opacity-10 pointer-events-none">
            <HardHat className="w-80 h-80 text-white" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold uppercase tracking-wider">
                <HardHat className="h-3.5 w-3.5" />
                <span>NRHO Projects &amp; Facilities Management</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                NRHO Project Command Center
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                Unified database and project lifecycle tracking: Bill of Quantities (BQ) estimation, executive presentation &amp; boss approval, weekly lookahead planning with reschedule justification audit, procurement (PO, DO &amp; Invoices), and technical blueprints.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/nrho-project/new"
                className="inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-blue-900/50 hover:shadow-blue-600/30 transition-all shrink-0 active:scale-95"
              >
                <Plus className="h-4 w-4" />
                <span>Register New Project</span>
              </Link>
            </div>
          </div>
        </div>

        {/* KPI Overview Metrics (Clean Light Theme) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
              <span>Total Projects</span>
              <FolderKanban className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-3xl font-black text-slate-900">{totalProjects}</div>
            <div className="text-xs text-slate-500 mt-1">{activeProjects} Active in execution</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between text-amber-600 text-xs font-bold uppercase tracking-wider mb-2">
              <span>Pending Boss Approval</span>
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
            <div className="text-3xl font-black text-amber-600">{pendingApproval}</div>
            <div className="text-xs text-slate-500 mt-1">Awaiting management review</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between text-emerald-600 text-xs font-bold uppercase tracking-wider mb-2">
              <span>Total BQ Ceiling</span>
              <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-emerald-600 font-mono">
              RM {totalBq.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-1">Official cost quotation ceiling</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between text-purple-600 text-xs font-bold uppercase tracking-wider mb-2">
              <span>PO Committed</span>
              <ShoppingCart className="w-5 h-5 text-purple-500" />
            </div>
            <div className="text-2xl font-black text-purple-600 font-mono">
              RM {totalPo.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-1">{completedProjects} Projects fully completed</div>
          </div>
        </div>

        {/* Projects List Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900">NRHO Projects Catalog</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Select any project to access its interactive hub, BQ, timeline, PO/DO, and blueprints.
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              Showing {projects.length} record{projects.length === 1 ? "" : "s"}
            </span>
          </div>

          {projects.length === 0 ? (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-16 text-center shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 border border-blue-100">
                <HardHat className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No NRHO Projects Registered Yet</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-6 leading-relaxed">
                Create your first project to begin estimating BQ line items, presenting proposals for boss approval, and tracking weekly milestones.
              </p>
              <Link
                href="/nrho-project/new"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase rounded-xl transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Create Project Now</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {projects.map((project) => {
                const statusCfg = STATUS_BADGES[project.status] || {
                  label: project.status,
                  bg: "bg-slate-100",
                  text: "text-slate-700",
                  border: "border-slate-200",
                }

                return (
                  <Link
                    key={project.id}
                    href={`/nrho-project/${project.id}`}
                    className="group bg-white hover:bg-slate-50/80 border border-slate-200/90 hover:border-blue-400 rounded-2xl p-5 transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                          {project.projectCode}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}>
                          {statusCfg.label}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                          {project.title}
                        </h3>
                        {project.siteLocation && (
                          <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1 font-medium">
                            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            <span className="truncate">{project.siteLocation}</span>
                          </p>
                        )}
                      </div>

                      {project.description && (
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {project.description}
                        </p>
                      )}

                      {/* Progress Bar */}
                      <div className="pt-2">
                        <div className="flex justify-between items-center text-xs mb-1">
                          <span className="text-slate-500 text-[11px] font-medium">Work Completion</span>
                          <span className="font-bold text-emerald-600 text-[11px] font-mono">{project.progressPercent}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/50">
                          <div
                            className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${project.progressPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Financial & Counts Footer */}
                    <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">BQ Estimate</span>
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          RM {project.totalBqAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="text-right flex items-center gap-1 text-blue-600 font-semibold group-hover:translate-x-1 transition-transform">
                        <span>Open Hub</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
