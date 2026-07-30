"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Pencil, Ban, Trash2, Loader2, X, AlertTriangle } from "lucide-react"
import { voidRawMaterialReport, deleteRawMaterialReport } from "@/app/actions/warehouseRawMaterial"

/**
 * Edit / Void / Hard delete for a raw material report.
 *
 * The buttons only render when the server has already said the report is editable, so this is a
 * convenience layer — every action re-checks the same gate server-side before doing anything.
 */
export function RawMaterialActions({
  reportId,
  editable,
  isSuperAdmin,
  linkedDoNumber,
}: {
  reportId: string
  editable: boolean
  isSuperAdmin: boolean
  linkedDoNumber: string | null
}) {
  const router = useRouter()
  const [mode, setMode] = useState<null | "void" | "delete">(null)
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!editable) return null

  const close = () => {
    if (busy) return
    setMode(null)
    setReason("")
    setError(null)
  }

  const run = async () => {
    setBusy(true)
    setError(null)
    try {
      const res =
        mode === "void"
          ? await voidRawMaterialReport(reportId, reason)
          : await deleteRawMaterialReport(reportId)

      if (!res.success) throw new Error(res.error || "Gagal")

      if (mode === "delete") router.push("/forms/warehouse/reports/raw-material")
      else router.refresh()
      setMode(null)
    } catch (e: any) {
      setError(e.message || "Gagal")
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Link
          href={`/forms/warehouse/reports/raw-material/${reportId}/edit`}
          className="inline-flex items-center gap-1.5 px-3 py-2 border-2 border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white text-[11px] font-black uppercase tracking-wide rounded-lg transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" /> Betulkan
        </Link>

        <button
          type="button"
          onClick={() => setMode("void")}
          className="inline-flex items-center gap-1.5 px-3 py-2 border-2 border-amber-600 text-amber-700 hover:bg-amber-600 hover:text-white text-[11px] font-black uppercase tracking-wide rounded-lg transition-colors"
        >
          <Ban className="w-3.5 h-3.5" /> Batalkan (Void)
        </button>

        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => setMode("delete")}
            className="inline-flex items-center gap-1.5 px-3 py-2 border-2 border-red-600 text-red-700 hover:bg-red-600 hover:text-white text-[11px] font-black uppercase tracking-wide rounded-lg transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Padam Kekal
          </button>
        )}
      </div>

      {mode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm print:hidden">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h3 className="text-sm font-black uppercase tracking-tight text-gray-900 flex items-center gap-2">
                {mode === "void" ? (
                  <><Ban className="w-4 h-4 text-amber-600" /> Batalkan Borang</>
                ) : (
                  <><Trash2 className="w-4 h-4 text-red-600" /> Padam Kekal</>
                )}
              </h3>
              <button type="button" onClick={close} disabled={busy} className="text-gray-400 hover:text-gray-700 disabled:opacity-40">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-3">
              <div
                className={`flex items-start gap-2 p-3 rounded-lg border ${
                  mode === "void" ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200"
                }`}
              >
                <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${mode === "void" ? "text-amber-600" : "text-red-600"}`} />
                <p className={`text-[11px] font-bold leading-snug ${mode === "void" ? "text-amber-900" : "text-red-900"}`}>
                  {mode === "void" ? (
                    <>
                      Rekod kekal nampak dalam senarai bertanda VOID untuk jejak audit, dan tidak lagi
                      dikira dalam carry forward.
                      {linkedDoNumber && <> DO <b>{linkedDoNumber}</b> akan dibuang daripada Transfer In.</>}
                    </>
                  ) : (
                    <>
                      Rekod akan hilang sepenuhnya, tiada jejak audit tertinggal. Guna ini untuk data ujian
                      sahaja — untuk kesilapan sebenar, guna Batalkan (Void).
                      {linkedDoNumber && <> DO <b>{linkedDoNumber}</b> juga akan dipadam.</>}
                    </>
                  )}
                </p>
              </div>

              {mode === "void" && (
                <label className="block">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Sebab pembatalan *</span>
                  <textarea
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    rows={3}
                    placeholder="Contoh: tersalah key-in kuantiti stock out"
                    className="mt-1 w-full p-2 border border-gray-300 rounded-lg text-xs outline-none focus:border-amber-500"
                  />
                </label>
              )}

              {error && <p className="text-[11px] font-bold text-red-700 leading-snug">{error}</p>}
            </div>

            <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={close}
                disabled={busy}
                className="px-4 py-2 text-xs font-black uppercase tracking-wide text-gray-600 hover:text-gray-900 disabled:opacity-40"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={run}
                disabled={busy || (mode === "void" && !reason.trim())}
                className={`inline-flex items-center gap-2 px-4 py-2 text-white text-xs font-black uppercase tracking-wide rounded-lg disabled:opacity-40 ${
                  mode === "void" ? "bg-amber-600 hover:bg-amber-700" : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                {mode === "void" ? "Sahkan Batal" : "Sahkan Padam"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
