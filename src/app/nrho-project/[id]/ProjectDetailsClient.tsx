"use client"

import { useState } from "react"
import Link from "next/link"
import { formatMalaysiaDate } from "@/lib/dateTime"
import { 
  Building2, 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  User, 
  FileSpreadsheet, 
  KanbanSquare, 
  Layers, 
  Sparkles,
  ClipboardCheck,
  FileText
} from "lucide-react"

import { ProjectBqTab } from "./ProjectBqTab"
import { ProjectTimelineTab } from "./ProjectTimelineTab"
import { ProjectBlueprintsTab } from "./ProjectBlueprintsTab"
import { ProjectUatTab } from "./ProjectUatTab"
import { ProjectFullReportTab } from "./ProjectFullReportTab"

interface ProjectDetailsClientProps {
  project: any
  initialTab?: string
}

type TabType = "timeline" | "bq" | "uat" | "blueprints" | "full-report"

const STATUS_BADGES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  DRAFT: {
    label: "DRAFT / QUOTATION",
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
  },
  PENDING_APPROVAL: {
    label: "PENDING APPROVAL",
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
    (initialTab && ["timeline", "bq", "uat", "blueprints", "full-report"].includes(initialTab)
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
  const latestUat = project.uatSessions?.[0]

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
                  {project.startDate ? formatMalaysiaDate(project.startDate, "medium") : "Start: TBD"}
                  {" → "}
                  {project.targetCompletionDate ? formatMalaysiaDate(project.targetCompletionDate, "medium") : "Target: TBD"}
                </span>
              </div>
            </div>
          </div>

          {/* Right Highlights: Progress & BQ Estimate */}
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
                <span className="text-base font-black text-slate-900 font-mono">
                  RM {(project.totalBqAmount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">
                  UAT Status
                </span>
                <span className={`text-xs font-bold font-mono ${
                  latestUat?.overallResult === "PASSED" ? "text-emerald-700" : "text-amber-600"
                }`}>
                  {latestUat?.overallResult || "PENDING"}
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
          onClick={() => setActiveTab("uat")}
          className={`flex items-center gap-2 px-4 py-3 text-xs border-b-2 whitespace-nowrap transition-all ${
            activeTab === "uat"
              ? "border-purple-600 text-purple-700 bg-purple-50/80 rounded-t-xl font-bold"
              : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300 font-medium"
          }`}
        >
          <ClipboardCheck className="w-4 h-4" />
          <span>3. User Acceptance Test (UAT)</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 border border-slate-200 font-mono">
            {latestUat?.items?.length || project.bqItems?.length || 0}
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
          <span>4. Floor Plans &amp; Blueprints</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 border border-slate-200 font-mono">
            {project.blueprints?.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("full-report")}
          className={`flex items-center gap-2 px-4 py-3 text-xs border-b-2 whitespace-nowrap transition-all ${
            activeTab === "full-report"
              ? "border-indigo-600 text-indigo-700 bg-indigo-50/80 rounded-t-xl font-bold"
              : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300 font-medium"
          }`}
        >
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span>5. Full Project Report (AI)</span>
          {project.aiSummary && (
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
          )}
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

        {activeTab === "uat" && (
          <ProjectUatTab 
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

        {activeTab === "full-report" && (
          <ProjectFullReportTab 
            projectId={project.id} 
            project={project} 
          />
        )}
      </div>
    </div>
  )
}
