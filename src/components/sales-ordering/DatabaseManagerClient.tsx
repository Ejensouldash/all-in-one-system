"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AlertOctagon, CheckCircle2, Database, Loader2, RefreshCw, Trash2 } from "lucide-react"

export function DatabaseManagerClient({
  pendingSoaCount,
  totalCreditCases,
  totalIntakes,
}: {
  pendingSoaCount: number
  totalCreditCases: number
  totalIntakes: number
}) {
  const router = useRouter()
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null)

  async function executePurge(action: string, confirmPrompt: string) {
    if (!window.confirm(confirmPrompt)) return

    setBusyAction(action)
    setMessage(null)

    try {
      const response = await fetch("/api/sales-ordering/database/purge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to purge data.")
      }

      setMessage({ text: data.message || "Purge operation successful.", type: "success" })
      router.refresh()
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "An unexpected error occurred.",
        type: "error",
      })
    } finally {
      setBusyAction(null)
    }
  }

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`flex items-center gap-3 rounded-2xl p-4 text-sm font-black shadow-sm ${
            message.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border border-rose-200 bg-rose-50 text-rose-900"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          ) : (
            <AlertOctagon className="h-5 w-5 shrink-0 text-rose-600" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Action 1: Clear Pending SOA */}
        <div className="rounded-3xl border border-amber-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-amber-100 p-3 text-amber-700">
                <Trash2 className="h-6 w-6" />
              </span>
              <div>
                <h3 className="font-black text-slate-950 text-lg">Purge Pending SOA Records</h3>
                <p className="text-xs text-slate-500 font-semibold">
                  Only deletes PO-SOA Check records in the "PENDING_SOA" phase (SOA not yet uploaded).
                </p>
              </div>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              Use this function to clear incomplete test lists without affecting approved or rejected documents.
            </p>
          </div>
          <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
            <span className="text-xs font-black text-amber-700">{pendingSoaCount} Records Found</span>
            <button
              onClick={() =>
                executePurge(
                  "clear-pending-soa",
                  `Are you sure you want to delete ${pendingSoaCount} Pending SOA records?`
                )
              }
              disabled={busyAction !== null || pendingSoaCount === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-black text-white hover:bg-amber-700 transition disabled:opacity-50"
            >
              {busyAction === "clear-pending-soa" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Purge Pending SOA
            </button>
          </div>
        </div>

        {/* Action 2: Reset All Test Data (Zero State) */}
        <div className="rounded-3xl border border-rose-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-rose-100 p-3 text-rose-700">
                <RefreshCw className="h-6 w-6" />
              </span>
              <div>
                <h3 className="font-black text-slate-950 text-lg">Reset All (Zero State)</h3>
                <p className="text-xs text-slate-500 font-semibold">
                  Delete all PO-SOA Check and Intake Document records to test fresh from scratch.
                </p>
              </div>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              This action will clear all intake files and financial evaluation records. Suitable for testing the end-to-end flow from scratch (zero state).
            </p>
          </div>
          <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
            <span className="text-xs font-black text-rose-700">
              {totalCreditCases + totalIntakes} Total Records
            </span>
            <button
              onClick={() =>
                executePurge(
                  "reset-all",
                  "WARNING: Are you sure you want to delete ALL Intake and PO-SOA Check records to start fresh (Zero State)?"
                )
              }
              disabled={busyAction !== null || (totalCreditCases === 0 && totalIntakes === 0)}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-black text-white hover:bg-rose-700 transition disabled:opacity-50"
            >
              {busyAction === "reset-all" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Reset to Zero State
            </button>
          </div>
        </div>

        {/* Action 3: Clear All Credit Check Cases */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-slate-100 p-3 text-slate-700">
                <Database className="h-6 w-6" />
              </span>
              <div>
                <h3 className="font-black text-slate-950 text-base">Purge All PO-SOA Check Records</h3>
                <p className="text-xs text-slate-500">
                  Deletes all financial review and approval records only.
                </p>
              </div>
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
            <span className="text-xs font-bold text-slate-500">{totalCreditCases} Records</span>
            <button
              onClick={() =>
                executePurge(
                  "clear-credit-checks",
                  "Delete all PO-SOA Check records only?"
                )
              }
              disabled={busyAction !== null || totalCreditCases === 0}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
            >
              {busyAction === "clear-credit-checks" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Purge PO-SOA Records
            </button>
          </div>
        </div>

        {/* Action 4: Clear All Intake Documents */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-slate-100 p-3 text-slate-700">
                <Database className="h-6 w-6" />
              </span>
              <div>
                <h3 className="font-black text-slate-950 text-base">Purge All Intake Files</h3>
                <p className="text-xs text-slate-500">
                  Deletes BD Intake uploaded document file records only.
                </p>
              </div>
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
            <span className="text-xs font-bold text-slate-500">{totalIntakes} Records</span>
            <button
              onClick={() =>
                executePurge("clear-intakes", "Delete all Intake document files only?")
              }
              disabled={busyAction !== null || totalIntakes === 0}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
            >
              {busyAction === "clear-intakes" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Purge Intake Records
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
