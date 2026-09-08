"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Clock,
  Droplets,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Sun,
  Moon,
  Zap,
  Send,
  Loader2,
  FileText,
  Settings,
} from "lucide-react"
import {
  getTodayFUVStatusAction,
  simulateFUVInspectionAlertAction,
} from "@/app/forms/maintenance/fuv/actions"

interface SlotItem {
  time: string
  shift: "DAY" | "NIGHT"
  completed: boolean
}

export function FUVReminderWorkspace() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<{
    date: string
    currentShift: "DAY" | "NIGHT"
    mytTimeFormatted: string
    nextSlot: { time: string; shift: "DAY" | "NIGHT"; minutesRemaining: number }
    daySlots: SlotItem[]
    nightSlots: SlotItem[]
    completedCount: number
    totalSlots: number
    compliancePercent: number
    isSuperAdmin: boolean
  } | null>(null)

  const [selectedSlot, setSelectedSlot] = useState<string>("AUTO")
  const [isSimulating, setIsSimulating] = useState(false)
  const [simulationResult, setSimulationResult] = useState<{
    success: boolean
    message: string
  } | null>(null)

  const loadStatus = async () => {
    setLoading(true)
    try {
      const res = await getTodayFUVStatusAction()
      if (res.success && res.daySlots) {
        setData(res as any)
      }
    } catch (e) {
      console.error("Failed to load today FUV status:", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStatus()
    const interval = setInterval(loadStatus, 60000)
    return () => clearInterval(interval)
  }, [])

  const handleSimulate = async () => {
    if (!data) return
    setIsSimulating(true)
    setSimulationResult(null)

    const targetSlot =
      selectedSlot === "AUTO" ? data.nextSlot.time : selectedSlot

    const targetShift =
      selectedSlot === "AUTO"
        ? data.nextSlot.shift
        : ["7.30 am", "9.30 am", "11.30 am", "1.30 pm", "3.30 pm", "5.30 pm"].includes(targetSlot)
        ? "DAY"
        : "NIGHT"

    try {
      const res = await simulateFUVInspectionAlertAction({
        slotTime: targetSlot,
        shift: targetShift,
      })

      if (res.success) {
        let msg = `🎉 Simulasi Amaran 2-Jam Berjaya Disiarkan!\n`
        msg += `🕒 Slot Diuji: ${targetSlot.toUpperCase()} (${targetShift === "DAY" ? "Syif Siang" : "Syif Malam"})\n`
        msg += `✉️ Emel & jemputan Google Calendar (.ics) dihantar ke: ${(res.recipients || []).join(", ")}.`
        if (res.telegramSent) {
          msg += `\n🤖 Notifikasi Telegram Bot juga berjaya disiarkan ke kumpulan operasi loji!`
        } else if (res.telegramError) {
          msg += `\n⚠️ Telegram: ${res.telegramError}`
        }
        setSimulationResult({ success: true, message: msg })
      } else {
        setSimulationResult({
          success: false,
          message: `❌ Simulasi Gagal: ${res.error || "Ralat tidak diketahui"}`,
        })
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setSimulationResult({ success: false, message: `❌ Ralat: ${msg}` })
    } finally {
      setIsSimulating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-cyan-950 to-blue-950 text-white rounded-3xl p-6 sm:p-8 shadow-md border border-cyan-500/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-cyan-500/20 rounded-2xl border border-cyan-400/30 text-cyan-300 mt-1">
              <Droplets className="w-8 h-8 text-cyan-400" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="px-3 py-1 bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 rounded-full text-xs font-black tracking-widest uppercase">
                  SGMP/19/FUV
                </span>
                <span className="px-2.5 py-1 bg-white/10 text-white/90 rounded-full text-xs font-bold uppercase">
                  Routine 2-Hours
                </span>
                <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full text-xs font-bold">
                  Water Treatment Plant
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                Pemeriksaan Berkala 2-Jam GMP
              </h1>
              <p className="text-xs sm:text-sm text-cyan-100/80 font-medium mt-1">
                Jadual semakan parameter CCP1, CCP2 & kualiti air loji setiap 2 jam (Syif Siang & Syif Malam).
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 self-start md:self-center">
            <button
              onClick={loadStatus}
              disabled={loading}
              className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold uppercase flex items-center gap-2 transition active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <Link
              href="/forms/maintenance/fuv"
              className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl text-xs font-black uppercase flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition active:scale-95"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Buka Borang FUV
            </Link>
          </div>
        </div>

        {/* Live Slot & Compliance Metrics */}
        {data && (
          <div className="mt-6 pt-6 border-t border-cyan-500/20 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <div className="text-[11px] font-bold text-cyan-300/80 uppercase tracking-wider">
                Slot Peringatan Seterusnya
              </div>
              <div className="text-xl font-black text-white mt-1 flex items-center gap-2">
                <Clock className="w-5 h-5 text-cyan-400 animate-pulse" />
                <span>{data.nextSlot.time.toUpperCase()}</span>
                <span className="text-xs font-semibold text-cyan-200/80 bg-cyan-900/50 px-2 py-0.5 rounded-md">
                  {data.nextSlot.shift === "DAY" ? "Syif Siang" : "Syif Malam"}
                </span>
              </div>
              <div className="text-xs text-cyan-100/70 mt-1">
                Baki masa: <strong>{data.nextSlot.minutesRemaining} minit</strong>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <div className="text-[11px] font-bold text-cyan-300/80 uppercase tracking-wider">
                Kepatuhan Hari Ini ({data.date})
              </div>
              <div className="text-xl font-black text-white mt-1 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span>{data.compliancePercent}%</span>
                <span className="text-xs font-normal text-white/70">
                  ({data.completedCount} / {data.totalSlots} Slot Selesai)
                </span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2 mt-2 overflow-hidden">
                <div
                  className="bg-emerald-400 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${data.compliancePercent}%` }}
                />
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <div className="text-[11px] font-bold text-cyan-300/80 uppercase tracking-wider">
                Status Waktu Malaysia
              </div>
              <div className="text-xl font-black text-white mt-1 font-mono">
                {data.mytTimeFormatted}
              </div>
              <div className="text-xs text-cyan-100/70 mt-1">
                Syif Aktif: <strong>{data.currentShift === "DAY" ? "☀️ Syif Siang (07:30 - 17:30)" : "🌙 Syif Malam (19:30 - 05:30)"}</strong>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. SuperAdmin Simulation Console */}
      {data?.isSuperAdmin && (
        <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-500/30 rounded-3xl p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-amber-800 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-600" /> Kawalan Khas SuperAdmin • Uji Simulasi Notifikasi 2-Jam
            </span>
            <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-md text-[10px] font-bold">
              Live Dispatch Test
            </span>
          </div>
          <p className="text-xs text-gray-600 mb-4 leading-relaxed">
            Pilih mana-mana slot 2-jam untuk menghantar notifikasi sebenar kepada kumpulan operasi Telegram loji serta jemputan Google Calendar (.ics) ke peti masuk Gmail staf.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="sm:w-72">
              <select
                value={selectedSlot}
                onChange={(e) => setSelectedSlot(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-amber-300 rounded-xl text-xs font-bold text-gray-800 shadow-sm focus:ring-2 focus:ring-amber-500 outline-none"
              >
                <option value="AUTO">🎯 Ikut Slot Semasa ({data.nextSlot.time.toUpperCase()})</option>
                <optgroup label="☀️ Syif Siang (Day Shift)">
                  <option value="7.30 am">7.30 AM (Syif Siang)</option>
                  <option value="9.30 am">9.30 AM (Syif Siang)</option>
                  <option value="11.30 am">11.30 AM (Syif Siang)</option>
                  <option value="1.30 pm">1.30 PM (Syif Siang)</option>
                  <option value="3.30 pm">3.30 PM (Syif Siang)</option>
                  <option value="5.30 pm">5.30 PM (Syif Siang)</option>
                </optgroup>
                <optgroup label="🌙 Syif Malam (Night Shift)">
                  <option value="7.30 pm">7.30 PM (Syif Malam)</option>
                  <option value="9.30 pm">9.30 PM (Syif Malam)</option>
                  <option value="11.30 pm">11.30 PM (Syif Malam)</option>
                  <option value="1.30 am">1.30 AM (Syif Malam)</option>
                  <option value="3.30 am">3.30 AM (Syif Malam)</option>
                  <option value="5.30 am">5.30 AM (Syif Malam)</option>
                </optgroup>
              </select>
            </div>

            <button
              type="button"
              disabled={isSimulating}
              onClick={handleSimulate}
              className="flex-1 py-2.5 px-4 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-md hover:shadow transition active:scale-95 disabled:opacity-50"
            >
              {isSimulating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  Menghantar Simulasi (Emel, Kalendar &amp; Telegram)…
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  🧪 Uji Simulasi Peringatan 2-Jam (Emel + Kalendar + Telegram)
                </>
              )}
            </button>
          </div>

          {simulationResult && (
            <div
              className={`mt-4 p-4 rounded-2xl text-xs font-semibold whitespace-pre-line border ${
                simulationResult.success
                  ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                  : "bg-red-50 text-red-900 border-red-200"
              }`}
            >
              {simulationResult.message}
            </div>
          )}
        </div>
      )}

      {/* 3. Slot Schedule Visual Grid (Day & Night Shifts) */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Day Shift Card */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-amber-100 text-amber-700 rounded-xl">
                  <Sun className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-black text-gray-900 text-sm uppercase">Syif Siang (Day Shift)</h3>
                  <p className="text-xs text-gray-500">07:30 AM – 05:30 PM</p>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold">
                {data.daySlots.filter((s) => s.completed).length} / 6 Selesai
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
              {data.daySlots.map((slot) => {
                const isNext =
                  slot.time.toLowerCase() === data.nextSlot.time.toLowerCase() &&
                  data.nextSlot.shift === "DAY"

                return (
                  <div
                    key={slot.time}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      slot.completed
                        ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                        : isNext
                        ? "bg-amber-50 border-amber-300 ring-2 ring-amber-400/50"
                        : "bg-gray-50 border-gray-200 text-gray-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs">{slot.time.toUpperCase()}</span>
                      {slot.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : isNext ? (
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-gray-300" />
                      )}
                    </div>
                    <div className="text-[10px] font-semibold mt-1">
                      {slot.completed ? "✓ Direkod" : isNext ? "⏳ Masa Semakan" : "Belum Sedia"}
                    </div>
                    <div className="mt-3 pt-2 border-t border-gray-200/60">
                      <Link
                        href="/forms/maintenance/fuv"
                        className="text-[10px] font-bold text-cyan-700 hover:text-cyan-900 flex items-center gap-1"
                      >
                        Buka Borang <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Night Shift Card */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                  <Moon className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-black text-gray-900 text-sm uppercase">Syif Malam (Night Shift)</h3>
                  <p className="text-xs text-gray-500">07:30 PM – 05:30 AM</p>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold">
                {data.nightSlots.filter((s) => s.completed).length} / 6 Selesai
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
              {data.nightSlots.map((slot) => {
                const isNext =
                  slot.time.toLowerCase() === data.nextSlot.time.toLowerCase() &&
                  data.nextSlot.shift === "NIGHT"

                return (
                  <div
                    key={slot.time}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      slot.completed
                        ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                        : isNext
                        ? "bg-amber-50 border-amber-300 ring-2 ring-amber-400/50"
                        : "bg-gray-50 border-gray-200 text-gray-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs">{slot.time.toUpperCase()}</span>
                      {slot.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : isNext ? (
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-gray-300" />
                      )}
                    </div>
                    <div className="text-[10px] font-semibold mt-1">
                      {slot.completed ? "✓ Direkod" : isNext ? "⏳ Masa Semakan" : "Belum Sedia"}
                    </div>
                    <div className="mt-3 pt-2 border-t border-gray-200/60">
                      <Link
                        href="/forms/maintenance/fuv"
                        className="text-[10px] font-bold text-cyan-700 hover:text-cyan-900 flex items-center gap-1"
                      >
                        Buka Borang <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* 4. Footer Utilities */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white rounded-2xl border border-gray-200 text-xs text-gray-600">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-cyan-600" />
          <span>Audit &amp; Laporan:</span>
          <Link
            href="/forms/maintenance/reports/fuv"
            className="text-cyan-700 font-bold hover:underline"
          >
            Lihat Laporan Bulanan SGMP/19/FUV
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-gray-500" />
          <Link href="/settings" className="text-gray-700 font-bold hover:underline">
            Tetapan Emel Notifikasi &amp; Telegram Bot
          </Link>
        </div>
      </div>
    </div>
  )
}
