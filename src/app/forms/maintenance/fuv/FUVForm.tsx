"use client"

import { useState, useEffect } from "react"
import {
  Droplets,
  CheckCircle2,
  ChevronLeft,
  AlertTriangle,
  Lock,
  RefreshCw,
  Save,
  Sun,
  Moon,
  Info,
} from "lucide-react"
import Link from "next/link"
import { SignaturePadClient } from "@/components/ui/SignaturePadClient"
import { useMaintenanceDraft } from "../_components/useMaintenanceDraft"
import { DraftBanner, SaveDraftButton } from "../_components/DraftControls"
import {
  getHazardProcessRecordByDateAndShift,
  createOrUpdateHazardProcessRecord,
} from "./actions"
import {
  type FUVRow,
  type FUVFormData,
  DAY_SHIFT_TIMES,
  NIGHT_SHIFT_TIMES,
  getDefaultShiftRows,
  createEmptyFUVRow,
  parseFUVNumeric,
  isPG02Breach,
  isPG05Breach,
  isUVIntensityBreach,
} from "./types"

export type CellStatus = "normal" | "warning" | "ccp-breach"

export function checkCellStatus(field: keyof FUVRow, row: FUVRow): CellStatus {
  if (row.isOff) return "normal"

  if (field === "sp01Status" || field === "sp02Status" || field === "sp03Status") {
    return row[field] && row[field] !== "Clear / No Colour" ? "warning" : "normal"
  }

  const valStr = row[field]
  if (!valStr || typeof valStr !== "string" || valStr.trim() === "" || valStr === "-") return "normal"

  switch (field) {
    case "pg02": // CCP1: Max 3 Bar
      if (isPG02Breach(valStr, row.isOff)) return "ccp-breach"
      break
    case "pg05": // CCP1: Max 2 Bar
      if (isPG05Breach(valStr, row.isOff)) return "ccp-breach"
      break
    case "uvIntensity": // CCP2: 80 - 99%
      if (isUVIntensityBreach(valStr, row.isOff)) return "ccp-breach"
      break
    case "vfd01":
    case "vfd02": {
      const num = parseFUVNumeric(valStr)
      if (num !== null && num > 25) return "warning"
      break
    }
    case "sp01Ph":
    case "sp02Ph":
    case "sp03Ph": {
      const num = parseFUVNumeric(valStr)
      if (num !== null && (num < 6.5 || num > 7.5)) return "warning"
      break
    }
    case "cs02": {
      const num = parseFUVNumeric(valStr)
      if (num !== null && (num < 50 || num > 270)) return "warning"
      break
    }
    case "pg01":
    case "pt01": {
      const num = parseFUVNumeric(valStr)
      if (num !== null && num > 1.1) return "warning"
      break
    }
    case "pg03":
    case "pt02": {
      const num = parseFUVNumeric(valStr)
      if (num !== null && num < 0.9) return "warning"
      break
    }
    case "pt03":
    case "pg04": {
      const num = parseFUVNumeric(valStr)
      if (num !== null && num > 9.0) return "warning"
      break
    }
    case "cs01": {
      const num = parseFUVNumeric(valStr)
      const cs02Num = parseFUVNumeric(row.cs02)
      if (num !== null) {
        if (cs02Num !== null && num > cs02Num) return "warning"
        if (num < 50 || num > 270) return "warning"
      }
      break
    }
    case "fm02": {
      const num = parseFUVNumeric(valStr)
      if (num !== null && (num < 1.2 || num > 1.8)) return "warning"
      break
    }
    case "operatingHour": {
      const num = parseFUVNumeric(valStr)
      if (num !== null && num > 9000) return "warning"
      break
    }
  }
  return "normal"
}

export function hasCCPBreach(rows: FUVRow[]): boolean {
  return rows.some(
    (row) =>
      !row.isOff &&
      (isPG02Breach(row.pg02) ||
        isPG05Breach(row.pg05) ||
        isUVIntensityBreach(row.uvIntensity))
  )
}

function getInputClasses(status: CellStatus, isOff = false) {
  if (isOff) {
    return "w-full text-center px-1.5 py-1 text-xs bg-gray-100 text-gray-400 border border-gray-200 rounded cursor-not-allowed"
  }
  if (status === "ccp-breach") {
    return "w-full text-center px-1.5 py-1 text-xs bg-red-100 border-2 border-red-600 text-red-900 font-black rounded animate-pulse shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500"
  }
  if (status === "warning") {
    return "w-full text-center px-1.5 py-1 text-xs bg-amber-50 border border-amber-400 text-amber-900 font-semibold rounded focus:outline-none focus:ring-1 focus:ring-amber-500"
  }
  return "w-full text-center px-1.5 py-1 text-xs bg-white border border-gray-300 text-gray-900 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 hover:border-gray-400"
}

function getSelectClasses(status: string, isOff = false) {
  if (isOff) {
    return "w-full text-[10px] py-0.5 px-1 border border-gray-200 rounded bg-gray-100 text-gray-400 cursor-not-allowed"
  }
  if (status && status !== "Clear / No Colour") {
    return "w-full text-[10px] py-0.5 px-1 border-2 border-amber-500 rounded bg-amber-50 text-amber-900 font-bold focus:outline-none focus:ring-1 focus:ring-amber-500"
  }
  return "w-full text-[10px] py-0.5 px-1 border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
}

export function FUVForm({ userName }: { userName: string }) {
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0])
  const [shift, setShift] = useState<"DAY" | "NIGHT">("DAY")
  const [checkedBy, setCheckedBy] = useState(userName)
  const [remarks, setRemarks] = useState("")
  const [rows, setRows] = useState<FUVRow[]>(() => getDefaultShiftRows("DAY", userName))

  const [isLoadingRecord, setIsLoadingRecord] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const [existingId, setExistingId] = useState<string | null>(null)
  const [signature, setSignature] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [reloadTick, setReloadTick] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setIsLoadingRecord(true)
      setError("")
      try {
        const res = await getHazardProcessRecordByDateAndShift(date, shift)
        if (cancelled) return

        if (res.success && res.data) {
          setExistingId(res.data.id)
          setIsLocked(Boolean(res.data.isLocked))
          setCheckedBy(res.data.checkedBy || userName)
          setRemarks(res.data.remarks || "")
          setSignature(res.data.performedSignature || null)

          const defaultRows = getDefaultShiftRows(shift, res.data.checkedBy || userName)
          const savedRows = res.data.rows || []
          const mergedRows = defaultRows.map((defRow) => {
            const matched = savedRows.find((r: FUVRow) => r.time === defRow.time)
            return matched ? { ...defRow, ...matched } : defRow
          })
          setRows(mergedRows)
        } else {
          setExistingId(null)
          setIsLocked(false)
          setRemarks("")
          setSignature(null)
          setCheckedBy(userName)
          setRows(getDefaultShiftRows(shift, userName))
        }
      } catch (err: unknown) {
        if (!cancelled) {
          console.error("Failed to load record:", err)
          setError("Gagal memuat rekod bagi tarikh/syif yang dipilih.")
        }
      } finally {
        if (!cancelled) {
          setIsLoadingRecord(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [date, shift, userName, reloadTick])

  // Draft integration
  const draft = useMaintenanceDraft("fuv", {
    values: () => ({ date, shift, checkedBy, remarks, rows }),
    apply: (v) => {
      setDate(v.date)
      setShift(v.shift)
      setCheckedBy(v.checkedBy)
      setRemarks(v.remarks || "")
      setRows(v.rows)
    },
  })

  function handleRowChange(index: number, field: keyof FUVRow, value: string | boolean) {
    if (isLocked) return
    setRows((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  function handleToggleOff(index: number, isOff: boolean) {
    if (isLocked) return
    setRows((prev) => {
      const next = [...prev]
      const current = next[index]
      if (isOff) {
        next[index] = {
          ...current,
          isOff: true,
          vfd01: "OFF",
          vfd02: "OFF",
          sp01Ph: "-",
          sp01Status: "Clear / No Colour",
          cs02: "-",
          pg01: "-",
          pt01: "-",
          sp02Ph: "-",
          sp02Status: "Clear / No Colour",
          sp03Ph: "-",
          sp03Status: "Clear / No Colour",
          pg02: "-",
          pg03: "-",
          pt02: "-",
          pt03: "-",
          pg04: "-",
          pg05: "-",
          cs01: "-",
          fm01: "-",
          pg06: "-",
          fm02: "-",
          uvIntensity: "-",
          operatingHour: "-",
          totalRunningDays: "-",
        }
      } else {
        next[index] = {
          ...createEmptyFUVRow(current.time, checkedBy),
          isOff: false,
        }
      }
      return next
    })
  }

  const ccpViolated = hasCCPBreach(rows)

  async function handleSubmit() {
    if (isLocked) {
      setError("Rekod ini telah disahkan dan dikunci oleh Penyelia / QC.")
      return
    }

    if (!signature) {
      setError("Tandatangan digital diperlukan sebelum menghantar borang.")
      return
    }

    if (ccpViolated && !remarks.trim()) {
      setError(
        "AMARAN CCP: Terdapat parameter CCP yang melebihi/di luar had piawai. Anda WAJIB mengisi ruangan Catatan / Tindakan Pembetulan (Corrective Action) sebelum menghantar!"
      )
      return
    }

    // Check if at least one row has data
    const hasData = rows.some(
      (r) =>
        r.isOff ||
        [
          r.vfd01,
          r.vfd02,
          r.sp01Ph,
          r.cs02,
          r.pg01,
          r.pt01,
          r.sp02Ph,
          r.sp03Ph,
          r.pg02,
          r.pg03,
          r.pt02,
          r.pt03,
          r.pg04,
          r.pg05,
          r.cs01,
          r.fm01,
          r.pg06,
          r.fm02,
          r.uvIntensity,
          r.operatingHour,
          r.totalRunningDays,
        ].some((val) => Boolean(val && typeof val === "string" && val.trim() !== ""))
    )

    if (!hasData) {
      setError("Sila isi sekurang-kurangnya satu slot masa atau tandakan 'OFF / Downtime'.")
      return
    }

    setIsSubmitting(true)
    setError("")

    const payload: FUVFormData = {
      id: existingId || undefined,
      date,
      shift,
      rows,
      remarks: remarks.trim() || undefined,
      checkedBy,
      performedSignature: signature,
    }

    const res = await createOrUpdateHazardProcessRecord(payload)

    if (res.success) {
      await draft.clearDraft()
      setSuccess(true)
      window.scrollTo({ top: 0, behavior: "smooth" })
    } else {
      setError(res.error || "Gagal menyimpan rekod.")
    }

    setIsSubmitting(false)
  }

  if (success) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center max-w-lg mx-auto">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-2">
          Rekod Berjaya Disimpan!
        </h2>
        <p className="text-gray-600 text-sm mb-6">
          Rekod Hazard and Process Control (SGMP-19/FUV) bagi tarikh <strong>{date}</strong> (Syif{" "}
          <strong>{shift === "DAY" ? "Pagi" : "Malam"}</strong>) telah berjaya direkodkan ke dalam
          pangkalan data.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => {
              setSuccess(false)
              setReloadTick((t) => t + 1)
            }}
            className="w-full sm:w-auto px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-sm font-black uppercase tracking-wider transition-colors shadow-md"
          >
            Kemas Kini / Semak Rekod
          </button>
          <Link
            href="/forms/maintenance/reports/fuv"
            className="w-full sm:w-auto px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-black uppercase tracking-wider transition-colors"
          >
            Lihat Laporan Bulanan
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/forms/maintenance"
            className="p-2.5 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </Link>
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 bg-cyan-100 rounded-xl flex items-center justify-center">
              <Droplets className="w-6 h-6 text-cyan-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black uppercase tracking-tight text-xl text-gray-900">
                  Hazard and Process Control Records
                </h1>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md text-[10px] font-black uppercase">
                  Rev 4
                </span>
                {isLocked && (
                  <span className="flex items-center px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md text-[10px] font-black uppercase">
                    <Lock className="w-3 h-3 mr-1" /> Terkunci (Audit-Proof)
                  </span>
                )}
              </div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                SGMP/19/FUV • Bahagian GMP - Production
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <SaveDraftButton draft={draft} />
          <Link
            href="/forms/maintenance/reports/fuv"
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold uppercase rounded-xl transition-colors"
          >
            Laporan & Cetakan
          </Link>
        </div>
      </div>

      <DraftBanner draft={draft} />

      {/* Lock Notice */}
      {isLocked && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex items-start gap-3 text-amber-900">
          <Lock className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold">Rekod ini telah disahkan dan dikunci oleh Penyelia / QC.</p>
            <p className="text-xs text-amber-800 mt-0.5">
              Sebarang pengubahsuaian tidak dibenarkan bagi mematuhi syarat kawalan audit GMP & KKM.
            </p>
          </div>
        </div>
      )}

      {/* CCP Alert Banner */}
      {ccpViolated && (
        <div className="bg-red-50 border-2 border-red-500 rounded-2xl p-4 flex items-start gap-3 text-red-900 shadow-md">
          <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5 animate-bounce" />
          <div className="text-sm">
            <h4 className="font-black uppercase tracking-tight text-red-800">
              AMARAN KRITIKAL: Pelanggaran Had CCP Dikesan!
            </h4>
            <p className="text-xs text-red-700 mt-1">
              Salah satu parameter CCP (PG02 &gt; 3 Bar, PG05 &gt; 2 Bar, atau UV Intensity &lt; 80%) telah
              dikesan di luar julat selamat. Anda <strong>WAJIB</strong> memasukkan penerangan tindakan
              pembetulan di ruangan <em>Catatan / Tindakan Pembetulan</em> sebelum borang ini dibenarkan
              dihantar.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-800 p-4 rounded-xl border border-red-200 font-medium text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")} className="text-red-500 hover:text-red-700 font-bold ml-4">
            ✕
          </button>
        </div>
      )}

      {/* Shift & Date Controls */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-end">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-gray-600 mb-2">
              Tarikh Pemeriksaan (Date)
            </label>
            <input
              type="date"
              value={date}
              disabled={isLocked}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-gray-600 mb-2">
              Pilihan Syif (Shift Selection)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isLocked}
                onClick={() => setShift("DAY")}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                  shift === "DAY"
                    ? "bg-amber-500 text-white shadow-md ring-2 ring-amber-300"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                } disabled:opacity-60`}
              >
                <Sun className="w-4 h-4" /> Syif Pagi (Day)
              </button>
              <button
                type="button"
                disabled={isLocked}
                onClick={() => setShift("NIGHT")}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                  shift === "NIGHT"
                    ? "bg-indigo-900 text-white shadow-md ring-2 ring-indigo-400"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                } disabled:opacity-60`}
              >
                <Moon className="w-4 h-4" /> Syif Malam (Night)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-gray-600 mb-2">
              Pemeriksa Bertugas (Checked By)
            </label>
            <input
              type="text"
              value={checkedBy}
              disabled={isLocked}
              onChange={(e) => setCheckedBy(e.target.value)}
              placeholder="Nama Pemeriksa"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
            />
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-medium">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600" />
            <span>
              Masa Pemeriksaan bagi <strong>Syif {shift === "DAY" ? "Pagi" : "Malam"}</strong>:{" "}
              {(shift === "DAY" ? DAY_SHIFT_TIMES : NIGHT_SHIFT_TIMES).join(" • ")}
            </span>
          </div>
          {isLoadingRecord && (
            <span className="flex items-center text-blue-600 font-bold">
              <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" /> Memuat rekod...
            </span>
          )}
        </div>
      </div>

      {/* 25-Column Entry Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-black uppercase tracking-wider text-gray-800">
              Jadual Matriks Kawalan Bahaya & Proses (25 Kolum)
            </h3>
            <span className="text-xs bg-gray-200 px-2 py-0.5 rounded text-gray-700 font-bold">
              6 Slot Masa
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1 text-emerald-700">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Normal
            </span>
            <span className="flex items-center gap-1 text-amber-700">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span> Amaran Had
            </span>
            <span className="flex items-center gap-1 text-red-700">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block animate-ping"></span>{" "}
              Pelanggaran CCP
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-center text-xs border-collapse border border-gray-200 min-w-[2100px]">
            <thead>
              {/* TIER 1: Bahagian / Peralatan */}
              <tr className="bg-slate-800 text-white font-bold border-b border-slate-700 text-[11px]">
                <th rowSpan={4} className="p-2 border border-slate-700 w-24 sticky left-0 z-20 bg-slate-800">
                  Time of Inspection
                </th>
                <th rowSpan={4} className="p-2 border border-slate-700 w-20 sticky left-24 z-20 bg-slate-800">
                  OFF / Downtime
                </th>
                <th className="p-2 border border-slate-700">Source Water Pump</th>
                <th className="p-2 border border-slate-700">Booster Pump</th>
                <th colSpan={4} className="p-2 border border-slate-700">Source Water Line</th>
                <th className="p-2 border border-slate-700">Sand Filter</th>
                <th className="p-2 border border-slate-700">Activated Carbon Filter</th>
                <th className="p-2 border border-slate-700 bg-amber-950/70 text-amber-200">
                  Sand + Carbon (CCP1)
                </th>
                <th className="p-2 border border-slate-700">10µm Precision Filter</th>
                <th className="p-2 border border-slate-700">5µm Precision Filter</th>
                <th colSpan={2} className="p-2 border border-slate-700">Inlet UF Membrane</th>
                <th colSpan={3} className="p-2 border border-slate-700 bg-amber-950/70 text-amber-200">
                  Outlet UF Membrane (CCP1)
                </th>
                <th colSpan={2} className="p-2 border border-slate-700">UF Reject Line</th>
                <th colSpan={3} className="p-2 border border-slate-700 bg-red-950/80 text-rose-200">
                  UV SYSTEM (CCP2)
                </th>
                <th rowSpan={4} className="p-2 border border-slate-700 w-28">Checked By</th>
                <th rowSpan={4} className="p-2 border border-slate-700 w-28">Verified By</th>
              </tr>

              {/* TIER 2: Had Julat & Kawalan */}
              <tr className="bg-slate-700 text-slate-200 text-[10px] font-medium border-b border-slate-600">
                <th className="p-1 border border-slate-600">Max 25Hz</th>
                <th className="p-1 border border-slate-600">Max 25Hz</th>
                <th className="p-1 border border-slate-600">PH 6.5-7.5</th>
                <th className="p-1 border border-slate-600">(50-270)</th>
                <th className="p-1 border border-slate-600">Max 1.1 Bar</th>
                <th className="p-1 border border-slate-600">Max 1.1 Bar</th>
                <th className="p-1 border border-slate-600">PH 6.5-7.5</th>
                <th className="p-1 border border-slate-600">PH 6.5-7.5</th>
                <th className="p-1 border border-slate-600 font-bold text-amber-300">Max 3 Bar (CCP1)</th>
                <th className="p-1 border border-slate-600">Min 0.9 Bar</th>
                <th className="p-1 border border-slate-600">Min 0.9 Bar</th>
                <th className="p-1 border border-slate-600">Max 9 Bar</th>
                <th className="p-1 border border-slate-600">Max 9 Bar</th>
                <th className="p-1 border border-slate-600 font-bold text-amber-300">Max 2 Bar (CCP1)</th>
                <th className="p-1 border border-slate-600">&le; CS02 (50-270)</th>
                <th className="p-1 border border-slate-600">Flow Range</th>
                <th className="p-1 border border-slate-600">Nil</th>
                <th className="p-1 border border-slate-600">1.2-1.8 m3/Hr</th>
                <th className="p-1 border border-slate-600 font-bold text-rose-300">80 - 99% (CCP2)</th>
                <th className="p-1 border border-slate-600">9000 Hr</th>
                <th className="p-1 border border-slate-600">Running Days</th>
              </tr>

              {/* TIER 3: Unit */}
              <tr className="bg-slate-600 text-slate-300 text-[10px] border-b border-slate-500">
                <th className="p-1 border border-slate-500">Hz</th>
                <th className="p-1 border border-slate-500">Hz</th>
                <th className="p-1 border border-slate-500">PH / TURB / COL</th>
                <th className="p-1 border border-slate-500">µS/cm</th>
                <th className="p-1 border border-slate-500">Bar</th>
                <th className="p-1 border border-slate-500">Bar</th>
                <th className="p-1 border border-slate-500">PH / TURB / COL</th>
                <th className="p-1 border border-slate-500">PH / TURB / COL</th>
                <th className="p-1 border border-slate-500 font-bold text-amber-200">Bar</th>
                <th className="p-1 border border-slate-500">Bar</th>
                <th className="p-1 border border-slate-500">Bar</th>
                <th className="p-1 border border-slate-500">Bar</th>
                <th className="p-1 border border-slate-500">Bar</th>
                <th className="p-1 border border-slate-500 font-bold text-amber-200">Bar</th>
                <th className="p-1 border border-slate-500">µS/cm</th>
                <th className="p-1 border border-slate-500">m3/Hr</th>
                <th className="p-1 border border-slate-500">Bar</th>
                <th className="p-1 border border-slate-500">m3/Hr</th>
                <th className="p-1 border border-slate-500 font-bold text-rose-200">%</th>
                <th className="p-1 border border-slate-500">Hr</th>
                <th className="p-1 border border-slate-500">Days</th>
              </tr>

              {/* TIER 4: Tag */}
              <tr className="bg-slate-100 text-slate-800 text-[11px] font-black border-b-2 border-slate-300">
                <th className="p-1.5 border border-slate-300">VFD01</th>
                <th className="p-1.5 border border-slate-300">VFD02</th>
                <th className="p-1.5 border border-slate-300">SP01</th>
                <th className="p-1.5 border border-slate-300">CS02</th>
                <th className="p-1.5 border border-slate-300">PG01</th>
                <th className="p-1.5 border border-slate-300">PT01</th>
                <th className="p-1.5 border border-slate-300">SP02</th>
                <th className="p-1.5 border border-slate-300">SP03</th>
                <th className="p-1.5 border border-slate-300 bg-amber-100 text-amber-900">PG02 (CCP1)</th>
                <th className="p-1.5 border border-slate-300">PG03</th>
                <th className="p-1.5 border border-slate-300">PT02</th>
                <th className="p-1.5 border border-slate-300">PT03</th>
                <th className="p-1.5 border border-slate-300">PG04</th>
                <th className="p-1.5 border border-slate-300 bg-amber-100 text-amber-900">PG05 (CCP1)</th>
                <th className="p-1.5 border border-slate-300">CS01</th>
                <th className="p-1.5 border border-slate-300">FM01</th>
                <th className="p-1.5 border border-slate-300">PG06</th>
                <th className="p-1.5 border border-slate-300">FM02</th>
                <th className="p-1.5 border border-slate-300 bg-red-100 text-red-900">UV INTENSITY</th>
                <th className="p-1.5 border border-slate-300">OPERATING HR</th>
                <th className="p-1.5 border border-slate-300">RUNNING DAYS</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const isOff = Boolean(row.isOff)
                return (
                  <tr
                    key={row.time}
                    className={`border-b border-gray-200 transition-colors ${
                      isOff ? "bg-gray-100/70" : idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                    }`}
                  >
                    {/* Time (Col C) */}
                    <td className="p-2 border border-gray-200 font-bold text-gray-800 sticky left-0 z-10 bg-inherit whitespace-nowrap">
                      {row.time}
                    </td>

                    {/* OFF Toggle */}
                    <td className="p-2 border border-gray-200 sticky left-24 z-10 bg-inherit text-center">
                      <label className="inline-flex items-center cursor-pointer gap-1.5">
                        <input
                          type="checkbox"
                          checked={isOff}
                          disabled={isLocked}
                          onChange={(e) => handleToggleOff(idx, e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-[10px] font-bold text-gray-600 uppercase">OFF</span>
                      </label>
                    </td>

                    {/* VFD01 (Col D) */}
                    <td className="p-1.5 border border-gray-200">
                      <input
                        type="text"
                        disabled={isLocked || isOff}
                        value={row.vfd01 || ""}
                        onChange={(e) => handleRowChange(idx, "vfd01", e.target.value)}
                        placeholder="Hz"
                        className={getInputClasses(checkCellStatus("vfd01", row), isOff)}
                      />
                    </td>

                    {/* VFD02 (Col E) */}
                    <td className="p-1.5 border border-gray-200">
                      <input
                        type="text"
                        disabled={isLocked || isOff}
                        value={row.vfd02 || ""}
                        onChange={(e) => handleRowChange(idx, "vfd02", e.target.value)}
                        placeholder="Hz"
                        className={getInputClasses(checkCellStatus("vfd02", row), isOff)}
                      />
                    </td>

                    {/* SP01 (Col F) */}
                    <td className="p-1.5 border border-gray-200">
                      <div className="space-y-1">
                        <input
                          type="text"
                          disabled={isLocked || isOff}
                          value={row.sp01Ph || ""}
                          onChange={(e) => handleRowChange(idx, "sp01Ph", e.target.value)}
                          placeholder="pH"
                          className={getInputClasses(checkCellStatus("sp01Ph", row), isOff)}
                        />
                        <select
                          disabled={isLocked || isOff}
                          value={row.sp01Status || "Clear / No Colour"}
                          onChange={(e) => handleRowChange(idx, "sp01Status", e.target.value)}
                          className={getSelectClasses(row.sp01Status || "Clear / No Colour", isOff)}
                        >
                          <option value="Clear / No Colour">Clear / No Colour</option>
                          <option value="Turbid / Coloured">Turbid / Coloured</option>
                        </select>
                      </div>
                    </td>

                    {/* CS02 (Col G) */}
                    <td className="p-1.5 border border-gray-200">
                      <input
                        type="text"
                        disabled={isLocked || isOff}
                        value={row.cs02 || ""}
                        onChange={(e) => handleRowChange(idx, "cs02", e.target.value)}
                        placeholder="µS/cm"
                        className={getInputClasses(checkCellStatus("cs02", row), isOff)}
                      />
                    </td>

                    {/* PG01 (Col H) */}
                    <td className="p-1.5 border border-gray-200">
                      <input
                        type="text"
                        disabled={isLocked || isOff}
                        value={row.pg01 || ""}
                        onChange={(e) => handleRowChange(idx, "pg01", e.target.value)}
                        placeholder="Bar"
                        className={getInputClasses(checkCellStatus("pg01", row), isOff)}
                      />
                    </td>

                    {/* PT01 (Col I) */}
                    <td className="p-1.5 border border-gray-200">
                      <input
                        type="text"
                        disabled={isLocked || isOff}
                        value={row.pt01 || ""}
                        onChange={(e) => handleRowChange(idx, "pt01", e.target.value)}
                        placeholder="Bar"
                        className={getInputClasses(checkCellStatus("pt01", row), isOff)}
                      />
                    </td>

                    {/* SP02 (Col J) */}
                    <td className="p-1.5 border border-gray-200">
                      <div className="space-y-1">
                        <input
                          type="text"
                          disabled={isLocked || isOff}
                          value={row.sp02Ph || ""}
                          onChange={(e) => handleRowChange(idx, "sp02Ph", e.target.value)}
                          placeholder="pH"
                          className={getInputClasses(checkCellStatus("sp02Ph", row), isOff)}
                        />
                        <select
                          disabled={isLocked || isOff}
                          value={row.sp02Status || "Clear / No Colour"}
                          onChange={(e) => handleRowChange(idx, "sp02Status", e.target.value)}
                          className={getSelectClasses(row.sp02Status || "Clear / No Colour", isOff)}
                        >
                          <option value="Clear / No Colour">Clear / No Colour</option>
                          <option value="Turbid / Coloured">Turbid / Coloured</option>
                        </select>
                      </div>
                    </td>

                    {/* SP03 (Col K) */}
                    <td className="p-1.5 border border-gray-200">
                      <div className="space-y-1">
                        <input
                          type="text"
                          disabled={isLocked || isOff}
                          value={row.sp03Ph || ""}
                          onChange={(e) => handleRowChange(idx, "sp03Ph", e.target.value)}
                          placeholder="pH"
                          className={getInputClasses(checkCellStatus("sp03Ph", row), isOff)}
                        />
                        <select
                          disabled={isLocked || isOff}
                          value={row.sp03Status || "Clear / No Colour"}
                          onChange={(e) => handleRowChange(idx, "sp03Status", e.target.value)}
                          className={getSelectClasses(row.sp03Status || "Clear / No Colour", isOff)}
                        >
                          <option value="Clear / No Colour">Clear / No Colour</option>
                          <option value="Turbid / Coloured">Turbid / Coloured</option>
                        </select>
                      </div>
                    </td>

                    {/* PG02 (Col L) - CCP1 */}
                    <td className="p-1.5 border border-gray-200 bg-amber-50/40">
                      <input
                        type="text"
                        disabled={isLocked || isOff}
                        value={row.pg02 || ""}
                        onChange={(e) => handleRowChange(idx, "pg02", e.target.value)}
                        placeholder="Max 3 Bar"
                        className={getInputClasses(checkCellStatus("pg02", row), isOff)}
                      />
                    </td>

                    {/* PG03 (Col M) */}
                    <td className="p-1.5 border border-gray-200">
                      <input
                        type="text"
                        disabled={isLocked || isOff}
                        value={row.pg03 || ""}
                        onChange={(e) => handleRowChange(idx, "pg03", e.target.value)}
                        placeholder="Min 0.9"
                        className={getInputClasses(checkCellStatus("pg03", row), isOff)}
                      />
                    </td>

                    {/* PT02 (Col N) */}
                    <td className="p-1.5 border border-gray-200">
                      <input
                        type="text"
                        disabled={isLocked || isOff}
                        value={row.pt02 || ""}
                        onChange={(e) => handleRowChange(idx, "pt02", e.target.value)}
                        placeholder="Min 0.9"
                        className={getInputClasses(checkCellStatus("pt02", row), isOff)}
                      />
                    </td>

                    {/* PT03 (Col O) */}
                    <td className="p-1.5 border border-gray-200">
                      <input
                        type="text"
                        disabled={isLocked || isOff}
                        value={row.pt03 || ""}
                        onChange={(e) => handleRowChange(idx, "pt03", e.target.value)}
                        placeholder="Max 9"
                        className={getInputClasses(checkCellStatus("pt03", row), isOff)}
                      />
                    </td>

                    {/* PG04 (Col P) */}
                    <td className="p-1.5 border border-gray-200">
                      <input
                        type="text"
                        disabled={isLocked || isOff}
                        value={row.pg04 || ""}
                        onChange={(e) => handleRowChange(idx, "pg04", e.target.value)}
                        placeholder="Max 9"
                        className={getInputClasses(checkCellStatus("pg04", row), isOff)}
                      />
                    </td>

                    {/* PG05 (Col Q) - CCP1 */}
                    <td className="p-1.5 border border-gray-200 bg-amber-50/40">
                      <input
                        type="text"
                        disabled={isLocked || isOff}
                        value={row.pg05 || ""}
                        onChange={(e) => handleRowChange(idx, "pg05", e.target.value)}
                        placeholder="Max 2 Bar"
                        className={getInputClasses(checkCellStatus("pg05", row), isOff)}
                      />
                    </td>

                    {/* CS01 (Col R) */}
                    <td className="p-1.5 border border-gray-200">
                      <input
                        type="text"
                        disabled={isLocked || isOff}
                        value={row.cs01 || ""}
                        onChange={(e) => handleRowChange(idx, "cs01", e.target.value)}
                        placeholder="µS/cm"
                        className={getInputClasses(checkCellStatus("cs01", row), isOff)}
                      />
                    </td>

                    {/* FM01 (Col S) */}
                    <td className="p-1.5 border border-gray-200">
                      <input
                        type="text"
                        disabled={isLocked || isOff}
                        value={row.fm01 || ""}
                        onChange={(e) => handleRowChange(idx, "fm01", e.target.value)}
                        placeholder="m3/Hr"
                        className={getInputClasses(checkCellStatus("fm01", row), isOff)}
                      />
                    </td>

                    {/* PG06 (Col T) */}
                    <td className="p-1.5 border border-gray-200">
                      <input
                        type="text"
                        disabled={isLocked || isOff}
                        value={row.pg06 || ""}
                        onChange={(e) => handleRowChange(idx, "pg06", e.target.value)}
                        placeholder="Bar"
                        className={getInputClasses(checkCellStatus("pg06", row), isOff)}
                      />
                    </td>

                    {/* FM02 (Col U) */}
                    <td className="p-1.5 border border-gray-200">
                      <input
                        type="text"
                        disabled={isLocked || isOff}
                        value={row.fm02 || ""}
                        onChange={(e) => handleRowChange(idx, "fm02", e.target.value)}
                        placeholder="1.2-1.8"
                        className={getInputClasses(checkCellStatus("fm02", row), isOff)}
                      />
                    </td>

                    {/* UV INTENSITY (Col V) - CCP2 */}
                    <td className="p-1.5 border border-gray-200 bg-red-50/40">
                      <input
                        type="text"
                        disabled={isLocked || isOff}
                        value={row.uvIntensity || ""}
                        onChange={(e) => handleRowChange(idx, "uvIntensity", e.target.value)}
                        placeholder="80-99%"
                        className={getInputClasses(checkCellStatus("uvIntensity", row), isOff)}
                      />
                    </td>

                    {/* OPERATING HOUR (Col W) */}
                    <td className="p-1.5 border border-gray-200">
                      <input
                        type="text"
                        disabled={isLocked || isOff}
                        value={row.operatingHour || ""}
                        onChange={(e) => handleRowChange(idx, "operatingHour", e.target.value)}
                        placeholder="Hr"
                        className={getInputClasses(checkCellStatus("operatingHour", row), isOff)}
                      />
                    </td>

                    {/* TOTAL RUNNING DAYS (Col X) */}
                    <td className="p-1.5 border border-gray-200">
                      <input
                        type="text"
                        disabled={isLocked || isOff}
                        value={row.totalRunningDays || ""}
                        onChange={(e) => handleRowChange(idx, "totalRunningDays", e.target.value)}
                        placeholder="Days"
                        className={getInputClasses(checkCellStatus("totalRunningDays", row), isOff)}
                      />
                    </td>

                    {/* Checked By (Col Y) */}
                    <td className="p-1.5 border border-gray-200">
                      <input
                        type="text"
                        disabled={isLocked || isOff}
                        value={row.checkedBy || checkedBy}
                        onChange={(e) => handleRowChange(idx, "checkedBy", e.target.value)}
                        placeholder="Initial"
                        className="w-full text-center px-1.5 py-1 text-xs border border-gray-300 rounded bg-white text-gray-900"
                      />
                    </td>

                    {/* Verified By (Col Z) */}
                    <td className="p-1.5 border border-gray-200">
                      <input
                        type="text"
                        disabled={isLocked || isOff}
                        value={row.verifiedBy || ""}
                        onChange={(e) => handleRowChange(idx, "verifiedBy", e.target.value)}
                        placeholder="Supervisor"
                        className="w-full text-center px-1.5 py-1 text-xs border border-gray-300 rounded bg-white text-gray-900"
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Remarks & Corrective Actions */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <label className="block text-xs font-black uppercase tracking-wider text-gray-700 mb-2">
          Catatan / Tindakan Pembetulan (Remarks / Corrective Action)
          {ccpViolated && (
            <span className="text-red-600 font-bold ml-2">
              * WAJIB DIISI KERANA TERDAPAT PELANGGARAN HAD CCP!
            </span>
          )}
        </label>
        <textarea
          rows={3}
          value={remarks}
          disabled={isLocked}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder={
            ccpViolated
              ? "Sila terangkan punca sisihan CCP dan tindakan pembetulan yang diambil serta-merta..."
              : "Catatan tambahan atau pemerhatian operasi (jika ada)..."
          }
          className={`w-full p-3 rounded-xl border text-sm focus:outline-none focus:ring-2 ${
            ccpViolated && !remarks.trim()
              ? "border-red-500 bg-red-50/50 focus:ring-red-500"
              : "border-gray-300 bg-gray-50 focus:ring-blue-500"
          } disabled:opacity-60`}
        />
      </div>

      {/* Digital Signature */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-xs font-black uppercase tracking-wider text-gray-700 mb-4">
          Tandatangan Operator Bertugas (Operator Signature)
        </h3>

        {signature && (
          <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-xl inline-block">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
              Tandatangan Tersimpan:
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={signature} alt="Operator Signature" className="h-16 object-contain bg-white rounded border border-gray-200 px-2" />
          </div>
        )}

        {!isLocked && (
          <div>
            <p className="text-xs text-gray-500 mb-2 font-medium">
              Sila tandatangan di dalam kotak di bawah untuk mengesahkan data syif ini:
            </p>
            <div className="max-w-md">
              <SignaturePadClient onSave={setSignature} />
            </div>
          </div>
        )}
      </div>

      {/* Submit Controls */}
      <div className="flex items-center justify-end gap-4 pt-4">
        <Link
          href="/forms/maintenance"
          className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-bold uppercase tracking-wider transition-colors"
        >
          Batal
        </Link>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || isLocked}
          className="px-6 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-sm font-black uppercase tracking-wider transition-colors shadow-md disabled:opacity-50 flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" /> Menyimpan...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" /> Simpan Rekod Syif
            </>
          )}
        </button>
      </div>
    </div>
  )
}
