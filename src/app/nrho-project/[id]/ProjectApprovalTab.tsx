"use client"

import { useState } from "react"
import { formatMalaysiaDate } from "@/lib/dateTime"
import { submitNrhoProjectForApproval, reviewNrhoProjectApproval } from "@/app/actions/nrho-project"
import { 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  UserCheck, 
  ShieldCheck, 
  FileText, 
  TrendingUp, 
  RotateCcw,
  Sparkles,
  Building2,
  Crown
} from "lucide-react"

export function ProjectApprovalTab({
  project,
}: {
  project: any
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [remarks, setRemarks] = useState(project.approvalRemarks || "")
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const isDraft = project.status === "DRAFT"
  const isPendingApproval = project.status === "PENDING_APPROVAL"
  const isApproved = project.status === "APPROVED" || project.status === "IN_PROGRESS" || project.status === "COMPLETED"

  const handleSubmitForApproval = async () => {
    setIsSubmitting(true)
    setStatusMsg(null)
    const res = await submitNrhoProjectForApproval(project.id)
    setIsSubmitting(false)

    if (res.success) {
      setStatusMsg({ 
        type: "success", 
        text: "Project proposal successfully submitted for Management & Boss Approval!" 
      })
      setTimeout(() => window.location.reload(), 1200)
    } else {
      setStatusMsg({ type: "error", text: res.error || "Failed to submit project proposal." })
    }
  }

  const handleReviewDecision = async (decision: "APPROVE" | "REJECT") => {
    setIsSubmitting(true)
    setStatusMsg(null)
    const res = await reviewNrhoProjectApproval(project.id, decision, remarks)
    setIsSubmitting(false)

    if (res.success) {
      setStatusMsg({ 
        type: "success", 
        text: decision === "APPROVE" 
          ? "Project proposal officially approved! Site execution is now unlocked." 
          : "Project returned for revision and budget adjustments." 
      })
      setTimeout(() => window.location.reload(), 1200)
    } else {
      setStatusMsg({ type: "error", text: res.error || "Failed to record management decision." })
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Overview Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-200">
            <Crown className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Executive Governance &amp; Management Approval
            </h3>
            <p className="text-xs text-slate-500">
              Formal project proposal presentation stage. Project costs, BQ estimates, and timeline must be approved by the boss before site execution commences.
            </p>
          </div>
        </div>

        {/* Status Pipeline Step Indicator */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          {/* Step 1 */}
          <div className={`p-4 rounded-xl border transition-all ${
            isDraft 
              ? "bg-amber-50 border-amber-300 text-amber-900 shadow-sm" 
              : "bg-slate-50 border-slate-200 text-slate-500"
          }`}>
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider mb-1">
              <span>Stage 1: Proposal Draft</span>
              <FileText className="w-4 h-4" />
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500">
              Prepare BQ rates, floor plans, and initial milestones.
            </p>
          </div>

          {/* Step 2 */}
          <div className={`p-4 rounded-xl border transition-all ${
            isPendingApproval 
              ? "bg-blue-50 border-blue-300 text-blue-900 shadow-sm" 
              : "bg-slate-50 border-slate-200 text-slate-500"
          }`}>
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider mb-1">
              <span>Stage 2: Boss Review</span>
              <UserCheck className="w-4 h-4" />
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500">
              Proposal presented to executive leadership for budget clearance.
            </p>
          </div>

          {/* Step 3 */}
          <div className={`p-4 rounded-xl border transition-all ${
            isApproved 
              ? "bg-emerald-50 border-emerald-300 text-emerald-900 shadow-sm" 
              : "bg-slate-50 border-slate-200 text-slate-500"
          }`}>
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider mb-1">
              <span>Stage 3: Approved &amp; Active</span>
              <ShieldCheck className="w-4 h-4" />
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500">
              Budget approved; procurement and physical works commence.
            </p>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {statusMsg && (
        <div className={`p-4 rounded-xl flex items-center gap-3 text-xs font-medium border ${
          statusMsg.type === "success" 
            ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
            : "bg-rose-50 border-rose-200 text-rose-800"
        }`}>
          {statusMsg.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Stage Actions */}
      {isDraft && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Send className="w-4 h-4 text-blue-600" />
            <span>Present Proposal to Boss</span>
          </h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            Ensure all BQ items and preliminary timeline schedules are populated. Clicking the button below locks the draft and notifies executive management for budget approval.
          </p>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSubmitForApproval}
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm flex items-center gap-2 transition-all disabled:opacity-50 active:scale-95"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>Submit for Boss Approval</span>
            </button>
          </div>
        </div>
      )}

      {isPendingApproval && (
        <div className="bg-white border border-blue-200 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-600" />
              <span>Management Review Portal</span>
            </h4>
            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
              Pending Boss Decision
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Executive Remarks / Conditions
            </label>
            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Approved with condition that Phase 1 must complete by next month, ceiling cost capped at RM 50,000..."
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => handleReviewDecision("APPROVE")}
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm flex items-center gap-2 transition-all disabled:opacity-50 active:scale-95"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>Approve Project Proposal</span>
            </button>

            <button
              onClick={() => handleReviewDecision("REJECT")}
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold uppercase tracking-wider rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Return for Revision</span>
            </button>
          </div>
        </div>
      )}

      {isApproved && (
        <div className="bg-white border border-emerald-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-200">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Project Approved by Leadership
              </h4>
              <p className="text-xs text-slate-500">
                Approved on {project.approvedAt ? formatMalaysiaDate(project.approvedAt, "medium") : "N/A"}
                {project.approvedBy?.name && ` by ${project.approvedBy.name}`}.
              </p>
            </div>
          </div>

          {project.approvalRemarks && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                Management Remarks:
              </span>
              <p className="italic text-slate-900">&ldquo;{project.approvalRemarks}&rdquo;</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
