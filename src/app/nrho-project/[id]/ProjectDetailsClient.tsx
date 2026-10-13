"use client"

import { useState } from "react"
import Link from "next/link"
import { 
  Building2, 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  User, 
  Clock, 
  FileSpreadsheet, 
  Crown, 
  KanbanSquare, 
  DollarSign, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  History, 
  Sparkles,
  ShieldCheck,
  Building,
  TrendingUp,
  FileCheck2,
  ChevronRight,
  ExternalLink
} from "lucide-react"

import { ProjectBqTab } from "./ProjectBqTab"
import { ProjectApprovalTab } from "./ProjectApprovalTab"
import { ProjectTimelineTab } from "./ProjectTimelineTab"
import { ProjectFinancialTab } from "./ProjectFinancialTab"
import { ProjectBlueprintsTab } from "./ProjectBlueprintsTab"

interface ProjectDetailsClientProps {
  project: any
  initialTab?: string
}

type TabType = "timeline" | "bq" | "approval" | "financial" | "blueprints" | "audit"

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
  COMPLETED: {
    label: "COMPLETED",
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-300",
  },
  ON_HOLD: {
    label: "ON HOLD",
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-300",
  },
  CANCELLED: {
    label: "CANCELLED",
    bg: "bg-rose-50",
    text: "text-rose-800",
    border: "border-rose-200",
  },
}

export function ProjectDetailsClient({ project, initialTab }: ProjectDetailsClientProps) {
  const [activeTab, setActiveTab] = useState<TabType>(
    (initialTab && ["timeline", "bq", "approval", "financial", "blueprints", "audit"].includes(initialTab)
      ? (initialTab as TabType)
      : "timeline")
  )

  const totalTasks = project.tasks?.length || 0
  const completedTasks = project.tasks?.filter((t: any) => t.status === "COMPLETED").length || 0
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  const statusConfig = STATUS_BADGES[project.status] || {
    label: project.status,
    bg: "bg-slate-100",
    text: "text-slate-800",
    border: "border-slate-200",
  }

  const isApproved = ["APPROVED", "IN_PROGRESS", "COMPLETED"].includes(project.status)

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link 
            href="/nrho-project" 
            className="hover:text-blue-600 flex items-center gap-1.5 transition-colors font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to NRHO Projects Catalog</span>
          </Link>
          <span>/</span>
          <span className="font-mono text-slate-700 font-semibold">{project.projectCode}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-bold border tracking-wide flex items-center gap-1.5 shadow-sm ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
            <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
            {statusConfig.label}
          </span>
        </div>
      </div>

      {/* Project Header Banner Card */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-bold bg-slate-100 border border-slate-200 text-blue-700 px-2.5 py-1 rounded-md">
                {project.projectCode}
              </span>
              {project.clientOrDepartment && (
                <span className="text-xs text-slate-600 font-medium flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  {project.clientOrDepartment}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {project.title}
            </h1>

            {project.description && (
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl">
                {project.description}
              </p>
            )}

            {/* Metadata Pills */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-700 pt-1">
              {project.siteLocation && (
                <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
                  <MapPin className="w-3.5 h-3.5 text-rose-500" />
                  <span className="font-medium">{project.siteLocation}</span>
                </div>
              )}

              {project.projectManager && (
                <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  <span className="font-medium">Manager: {project.projectManager}</span>
                </div>
              )}

              <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                <span className="font-medium">
                  {project.startDate ? new Date(project.startDate).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" }) : "Start: TBD"}
                  {" → "}
                  {project.targetCompletionDate ? new Date(project.targetCompletionDate).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" }) : "Target: TBD"}
                </span>
              </div>
            </div>
          </div>

          {/* Right Highlights: Progress & Quick Financial */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 min-w-[260px]">
            {/* Task Progress Bar */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-slate-600 font-medium">Physical Progress</span>
                <span className="font-bold text-emerald-700 font-mono text-sm">{progressPercent}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-500 mt-2">
                <span>{completedTasks} of {totalTasks} tasks completed</span>
                <span>{project.tasks?.filter((t: any) => t.status === "DELAYED").length || 0} rescheduled</span>
              </div>
            </div>

            {/* BQ Amount */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">
                  BQ Estimate (Ceiling)
                </span>
                <span className="text-sm font-black text-slate-900 font-mono">
                  RM {(project.totalBqAmount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">
                  PO Committed
                </span>
                <span className="text-xs font-bold text-purple-700 font-mono">
                  RM {(project.totalPoAmount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation Bar */}
      <div className="border-b border-slate-200 flex items-center gap-2 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab("timeline")}
          className={`flex items-center gap-2 px-4 py-3 text-xs border-b-2 whitespace-nowrap transition-all ${
            activeTab === "timeline"
              ? "border-blue-600 text-blue-700 bg-blue-50/80 rounded-t-xl font-bold"
              : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300 font-medium"
          }`}
        >
          <KanbanSquare className="w-4 h-4" />
          <span>1. Work Planning &amp; Timeline</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 border border-slate-200 font-mono">
            {project.tasks?.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("bq")}
          className={`flex items-center gap-2 px-4 py-3 text-xs border-b-2 whitespace-nowrap transition-all ${
            activeTab === "bq"
              ? "border-emerald-600 text-emerald-700 bg-emerald-50/80 rounded-t-xl font-bold"
              : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300 font-medium"
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>2. Quotations &amp; BQ</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 border border-slate-200 font-mono">
            {project.bqItems?.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("approval")}
          className={`flex items-center gap-2 px-4 py-3 text-xs border-b-2 whitespace-nowrap transition-all ${
            activeTab === "approval"
              ? "border-amber-600 text-amber-700 bg-amber-50/80 rounded-t-xl font-bold"
              : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300 font-medium"
          }`}
        >
          <Crown className="w-4 h-4" />
          <span>3. Boss Presentation &amp; Approval</span>
          {project.status === "PENDING_APPROVAL" && (
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
          )}
        </button>

        <button
          onClick={() => setActiveTab("financial")}
          className={`flex items-center gap-2 px-4 py-3 text-xs border-b-2 whitespace-nowrap transition-all ${
            activeTab === "financial"
              ? "border-purple-600 text-purple-700 bg-purple-50/80 rounded-t-xl font-bold"
              : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300 font-medium"
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>4. Procurement &amp; Financial (PO / DO / Invoices)</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 border border-slate-200 font-mono">
            {(project.purchaseOrders?.length || 0) + (project.deliveryOrders?.length || 0) + (project.invoices?.length || 0)}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("blueprints")}
          className={`flex items-center gap-2 px-4 py-3 text-xs border-b-2 whitespace-nowrap transition-all ${
            activeTab === "blueprints"
              ? "border-teal-600 text-teal-700 bg-teal-50/80 rounded-t-xl font-bold"
              : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300 font-medium"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>5. Floor Plans &amp; Blueprints</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 border border-slate-200 font-mono">
            {project.blueprints?.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("audit")}
          className={`flex items-center gap-2 px-4 py-3 text-xs border-b-2 whitespace-nowrap transition-all ${
            activeTab === "audit"
              ? "border-slate-600 text-slate-900 bg-slate-100 rounded-t-xl font-bold"
              : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300 font-medium"
          }`}
        >
          <History className="w-4 h-4" />
          <span>Audit Trail &amp; History Logs</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 border border-slate-200 font-mono">
            {project.auditLogs?.length || 0}
          </span>
        </button>
      </div>

      {/* Tab Content Display Area */}
      <div className="transition-all duration-300">
        {activeTab === "timeline" && (
          <ProjectTimelineTab 
            projectId={project.id} 
            tasks={project.tasks || []} 
          />
        )}

        {activeTab === "bq" && (
          <ProjectBqTab 
            projectId={project.id} 
            initialItems={project.bqItems || []} 
            isApproved={isApproved} 
          />
        )}

        {activeTab === "approval" && (
          <ProjectApprovalTab 
            project={project} 
          />
        )}

        {activeTab === "financial" && (
          <ProjectFinancialTab 
            projectId={project.id} 
            project={project} 
          />
        )}

        {activeTab === "blueprints" && (
          <ProjectBlueprintsTab 
            projectId={project.id} 
            blueprints={project.blueprints || []} 
          />
        )}

        {activeTab === "audit" && (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-4 h-4 text-blue-600" />
                  Audit Trail &amp; Transaction Logs
                </h3>
                <p className="text-xs text-slate-500">
                  Immutable record of approvals, BQ modifications, task rescheduling reasons, and financial entries.
                </p>
              </div>
              <span className="text-xs text-slate-500 font-mono font-medium">
                {project.auditLogs?.length || 0} Actions Logged
              </span>
            </div>

            {(!project.auditLogs || project.auditLogs.length === 0) ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No activity has been logged for this project yet.
              </div>
            ) : (
              <div className="relative pl-6 border-l border-slate-200 space-y-5 my-4">
                {project.auditLogs.map((log: any) => (
                  <div key={log.id} className="relative group">
                    <div className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-white border-2 border-blue-600 group-hover:bg-blue-600 transition-colors" />
                    <div className="text-xs">
                      <div className="flex items-center gap-2 text-slate-800 font-semibold mb-1">
                        <span className="font-mono text-blue-700 uppercase tracking-wider text-[11px] font-bold">
                          {log.action}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-700">{log.actorName}</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-500 text-[11px] font-normal">
                          {new Date(log.createdAt).toLocaleString("en-US", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>
                      </div>
                      <p className="text-slate-700 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed">
                        {log.details || "-"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
