"use client"

import { useState } from "react"
import { verifyMaintenanceWork } from "@/app/actions/maintenance-ticket"
import { CheckCircle2, AlertCircle, Loader2, RotateCcw, ThumbsUp } from "lucide-react"

export function RequesterVerificationCard({
  ticketId,
  token,
}: {
  ticketId: string
  token: string
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showReworkInput, setShowReworkInput] = useState(false)
  const [reworkFeedback, setReworkFeedback] = useState("")
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const handleVerify = async (satisfied: boolean) => {
    if (!satisfied && !reworkFeedback.trim()) {
      setStatusMsg({ type: "error", text: "Please provide a reason or describe what still needs fixing." })
      return
    }

    setIsSubmitting(true)
    setStatusMsg(null)

    const res = await verifyMaintenanceWork(ticketId, token, satisfied, reworkFeedback)
    setIsSubmitting(false)

    if (res.success) {
      setStatusMsg({
        type: "success",
        text: satisfied
          ? "Thank you! Work has been confirmed satisfactory and forwarded to PIC for costing."
          : "Rework request submitted. The maintenance team has been notified to re-inspect.",
      })
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } else {
      setStatusMsg({ type: "error", text: res.error || "Failed to record response." })
    }
  }

  return (
    <div className="bg-emerald-50/70 border-2 border-emerald-300/80 rounded-2xl p-5 space-y-4 shadow-sm animate-in fade-in duration-300">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-emerald-950">Action Required: Verify Completed Work</h3>
          <p className="text-xs text-emerald-800 mt-0.5">
            The technician has submitted repair photos and marked this task completed. Please inspect the machine and confirm satisfaction.
          </p>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            statusMsg.type === "success"
              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
              : "bg-red-100 text-red-800 border border-red-300"
          }`}
        >
          {statusMsg.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {showReworkInput && (
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700">
            Explain what needs rework / remaining symptoms:
          </label>
          <textarea
            rows={2}
            value={reworkFeedback}
            onChange={(e) => setReworkFeedback(e.target.value)}
            placeholder="e.g. Pump is still vibrating at high speed, minor leak persists..."
            className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          />
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
        {!showReworkInput ? (
          <>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleVerify(true)}
              className="w-full sm:flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsUp className="h-4 w-4" />}
              <span>Confirm Work Satisfactory</span>
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setShowReworkInput(true)}
              className="w-full sm:w-auto py-2.5 px-4 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5 text-orange-600" />
              <span>Request Rework</span>
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleVerify(false)}
              className="w-full sm:flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              <span>Submit Rework Request</span>
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setShowReworkInput(false)}
              className="w-full sm:w-auto py-2.5 px-3 text-slate-500 hover:text-slate-800 text-xs font-semibold"
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  )
}
