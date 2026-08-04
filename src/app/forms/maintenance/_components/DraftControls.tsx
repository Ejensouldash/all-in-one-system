"use client"

import { format } from "date-fns"
import { CheckCircle2, FileClock, Loader2, Save, Trash2 } from "lucide-react"
import type { MaintenanceDraftController } from "./useMaintenanceDraft"

/**
 * Banner offering to resume a saved draft. Renders nothing until a draft is found,
 * so forms without one look exactly as they did before.
 */
export function DraftBanner<T>({
  draft,
  className = "",
}: {
  draft: MaintenanceDraftController<T>
  /** Extra layout classes — some forms render the banner outside a padded container. */
  className?: string
}) {
  if (!draft.pendingDraft) return null

  return (
    <div
      className={`bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 ${className}`}
    >
      <div className="flex items-start gap-3 flex-1">
        <div className="w-10 h-10 shrink-0 bg-amber-100 rounded-xl flex items-center justify-center">
          <FileClock className="w-5 h-5 text-amber-700" />
        </div>
        <div>
          <p className="font-black uppercase tracking-wider text-sm text-amber-900">
            Unfinished draft found
          </p>
          <p className="text-sm text-amber-800 font-medium mt-0.5">
            Saved {format(draft.pendingDraft.updatedAt, "d MMM yyyy, h:mm a")}. Continue where you left off —
            your signature will need to be drawn again before submitting.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={draft.restoreDraft}
          className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-sm"
        >
          Continue
        </button>
        <button
          type="button"
          onClick={draft.discardDraft}
          className="flex items-center px-4 py-2.5 bg-white hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl text-xs font-black uppercase tracking-wider transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Discard
        </button>
      </div>
    </div>
  )
}

/**
 * "Save as Draft" button, meant to sit beside the form's Submit button.
 * Shows a confirmation line once a draft has been written this session.
 */
export function SaveDraftButton<T>({
  draft,
  disabled,
}: {
  draft: MaintenanceDraftController<T>
  disabled?: boolean
}) {
  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={draft.saveDraft}
        disabled={disabled || draft.isSaving}
        className="flex items-center px-6 py-4 bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-300 font-black uppercase tracking-wider rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {draft.isSaving ? (
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
        ) : (
          <Save className="w-5 h-5 mr-2" />
        )}
        {draft.isSaving ? "Saving..." : "Save as Draft"}
      </button>
      {draft.savedAt && !draft.isSaving && (
        <span className="flex items-center text-xs font-bold text-emerald-700">
          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
          Draft saved {format(draft.savedAt, "h:mm a")}
        </span>
      )}
      {draft.error && (
        <span className="text-xs font-bold text-red-600">{draft.error}</span>
      )}
    </div>
  )
}
