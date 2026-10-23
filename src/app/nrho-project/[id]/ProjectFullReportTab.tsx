"use client"

import { useState } from "react"
import { formatMalaysiaDate } from "@/lib/dateTime"
import {
  generateNrhoProjectAiSummary,
  updateNrhoProjectAiSummary,
} from "@/app/actions/nrho-ai"
import { AriaMarkdown } from "@/components/chat/AriaMarkdown"
import {
  Sparkles,
  FileDown,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  DollarSign,
  ClipboardCheck,
  Edit3,
  Eye,
  Printer,
} from "lucide-react"

interface ProjectFullReportTabProps {
  projectId: string
  project: any
}

export function ProjectFullReportTab({ projectId, project }: ProjectFullReportTabProps) {
  const [aiSummary, setAiSummary] = useState<string>(project.aiSummary || "")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  )

  const totalTasks = project.tasks?.length || 0
  const completedTasks = project.tasks?.filter((t: any) => t.status === "COMPLETED").length || 0
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
  const totalBq = project.totalBqAmount || project.bqItems?.reduce((acc: number, it: any) => acc + (it.amount || 0), 0) || 0
  const latestUat = project.uatSessions?.[0]

  const handleGenerateAi = async () => {
    setIsGenerating(true)
    setStatusMsg(null)

    const res = await generateNrhoProjectAiSummary(projectId)
    setIsGenerating(false)

    if (res.success && res.aiSummary) {
      setAiSummary(res.aiSummary)
      setStatusMsg({
        type: "success",
        text: "AI Executive Project Summary generated successfully!",
      })
    } else {
      setStatusMsg({
        type: "error",
        text: res.error || "Failed to generate AI executive summary.",
      })
    }
  }

  const handleSaveNotes = async () => {
    setIsSaving(true)
    setStatusMsg(null)

    const res = await updateNrhoProjectAiSummary(projectId, aiSummary)
    setIsSaving(false)

    if (res.success) {
      setIsEditing(false)
      setStatusMsg({
        type: "success",
        text: "Executive report notes saved successfully!",
      })
    } else {
      setStatusMsg({
        type: "error",
        text: res.error || "Failed to save executive report notes.",
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Full Project Dossier &amp; Executive Report
              </h3>
              <p className="text-xs text-slate-500">
                Consolidated audit report with Google Gemini AI executive synthesis, timeline milestone status, BQ financials, and UAT sign-off.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleGenerateAi}
            disabled={isGenerating}
            className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 text-amber-300" />
            )}
            <span>{aiSummary ? "Refresh AI Summary" : "Generate AI Summary"}</span>
          </button>

          <a
            href={`/api/nrho-project/${projectId}/pdf?type=full-report`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm flex items-center gap-2 transition-all active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Download Full Report (Print Ready)</span>
          </a>
        </div>
      </div>

      {/* Status Notice */}
      {statusMsg && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-xs font-medium border ${
            statusMsg.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {statusMsg.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Highlights Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Physical Progress</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {progressPercent}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {completedTasks} of {totalTasks} tasks completed
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>BQ Budget Ceiling</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-700 font-mono">
            RM {totalBq.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {project.bqItems?.length || 0} line items registered
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>UAT Sign-off Status</span>
            <ClipboardCheck className="w-4 h-4 text-purple-500" />
          </div>
          <div className={`text-xl font-black font-mono ${
            latestUat?.overallResult === "PASSED" ? "text-emerald-700" : "text-amber-600"
          }`}>
            {latestUat?.overallResult || "PENDING"}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {latestUat?.items?.length || 0} deliverables verified
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>AI Executive Model</span>
            <Sparkles className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-sm font-bold text-indigo-700 font-mono">
            Gemini 3.1 Flash-Lite
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {project.aiGeneratedAt ? `Updated ${formatMalaysiaDate(project.aiGeneratedAt, "medium")}` : "Not yet generated"}
          </div>
        </div>
      </div>

      {/* Executive Summary Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Executive Project Performance Appraisal (AI Synthesized)
            </h4>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg border border-slate-300 flex items-center gap-1.5 transition-colors"
            >
              {isEditing ? <Eye className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
              <span>{isEditing ? "Preview Formatted" : "Edit Notes"}</span>
            </button>

            {isEditing && (
              <button
                type="button"
                onClick={handleSaveNotes}
                disabled={isSaving}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Save Notes</span>
              </button>
            )}
          </div>
        </div>

        {isEditing ? (
          <textarea
            rows={16}
            value={aiSummary}
            onChange={(e) => setAiSummary(e.target.value)}
            placeholder="Executive appraisal content in markdown..."
            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-4 text-xs font-mono text-slate-900 leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        ) : (
          <div className="max-w-none text-xs sm:text-[13px] leading-relaxed text-slate-700 bg-slate-50/70 p-5 rounded-xl border border-slate-200">
            {aiSummary ? (
              <AriaMarkdown>{aiSummary}</AriaMarkdown>
            ) : (
              <div className="text-center py-10 space-y-3">
                <Sparkles className="w-8 h-8 text-indigo-400 mx-auto" />
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  No executive summary has been generated for this project yet. Click &quot;Generate AI Summary&quot; above to have Google Gemini evaluate and synthesize the complete project dossier.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dossier Contents Notice */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-xs text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <span className="font-bold text-slate-800 block">
            Print-Ready PDF Dossier Inclusions:
          </span>
          <p className="text-slate-500 text-[11px]">
            The full print report automatically binds: (1) Executive AI Synthesis, (2) Weekly Timeline Schedule, (3) Bill of Quantities Financials, (4) User Acceptance Testing (UAT) Verification, and (5) Management Sign-off Endorsements.
          </p>
        </div>

        <a
          href={`/api/nrho-project/${projectId}/pdf?type=full-report`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl whitespace-nowrap flex items-center justify-center gap-1.5 transition-colors self-start sm:self-auto shrink-0"
        >
          <FileDown className="w-3.5 h-3.5" />
          <span>Open Full PDF</span>
        </a>
      </div>
    </div>
  )
}
