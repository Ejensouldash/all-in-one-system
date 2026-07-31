"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Ban, Loader2, X, AlertTriangle, Lock } from "lucide-react"
import { voidWithdrawal, checkWithdrawalVoidable } from "@/app/actions/rawMaterialWithdrawal"

/** Void control for one withdrawal. The gate is re-checked server-side before anything happens. */
export function VoidWithdrawalButton({ id, withdrawalNo, linkedDoNumber }: {
  id: string
  withdrawalNo: string
  linkedDoNumber: string | null
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [checking, setChecking] = useState(false)
  const [blocked, setBlocked] = useState<string | null>(null)
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // The reason a withdrawal cannot be voided is only worth fetching when someone asks.
  const openModal = async () => {
    setChecking(true)
    setError(null)
    setBlocked(null)
    try {
      const state = await checkWithdrawalVoidable(id)
      if (!state.voidable) setBlocked(state.detail)
      setOpen(true)
    } finally {
      setChecking(false)
    }
  }

  const run = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await voidWithdrawal(id, reason)
      if (!res.success) throw new Error(res.error || "Gagal")
      setOpen(false)
      router.refresh()
    } catch (e: any) {
      setError(e.message || "Gagal")
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        disabled={checking}
        className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-amber-700 hover:text-amber-900 disabled:opacity-40"
      >
        {checking ? <Loader2 className="w-3 h-3 animate-spin" /> : <Ban className="w-3 h-3" />} Batal
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h3 className="text-sm font-black uppercase tracking-tight text-gray-900 flex items-center gap-2">
                <Ban className="w-4 h-4 text-amber-600" /> Batalkan {withdrawalNo}
              </h3>
              <button type="button" onClick={() => setOpen(false)} disabled={busy} className="text-gray-400 hover:text-gray-700 disabled:opacity-40">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-3">
              {blocked ? (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-300">
                  <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] font-bold text-amber-900 leading-snug">{blocked}</p>
                </div>
              ) : (
                <>
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[11px] font-bold text-amber-900 leading-snug">
                      Rekod kekal nampak bertanda VOID untuk jejak audit, dan stok dikembalikan ke baki warehouse.
                      {linkedDoNumber && <> DO <b>{linkedDoNumber}</b> akan dibuang daripada Transfer In.</>}
                    </p>
                  </div>
                  <label className="block">
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Sebab pembatalan *</span>
                    <textarea
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      rows={3}
                      placeholder="Contoh: tersalah key-in kuantiti"
                      className="mt-1 w-full p-2 border border-gray-300 rounded-lg text-xs outline-none focus:border-amber-500"
                    />
                  </label>
                </>
              )}
              {error && <p className="text-[11px] font-bold text-red-700 leading-snug">{error}</p>}
            </div>

            <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={busy}
                className="px-4 py-2 text-xs font-black uppercase tracking-wide text-gray-600 hover:text-gray-900 disabled:opacity-40"
              >
                Tutup
              </button>
              {!blocked && (
                <button
                  type="button"
                  onClick={run}
                  disabled={busy || !reason.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white text-xs font-black uppercase tracking-wide rounded-lg"
                >
                  {busy && <Loader2 className="w-4 h-4 animate-spin" />} Sahkan Batal
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
