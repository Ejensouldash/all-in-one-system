"use client"

import { useState } from "react"
import { ShieldAlert, CheckCircle2, ChevronLeft } from "lucide-react"
import Link from "next/link"
import { SignaturePadClient } from "@/components/ui/SignaturePadClient"
import { useMaintenanceDraft } from "../_components/useMaintenanceDraft"
import { DraftBanner, SaveDraftButton } from "../_components/DraftControls"
import { createPreventiveMaintenanceRecord } from "./actions"

const MACHINE_KEYS = [
  { key: "autoScrambler", label: "Auto Scrambler" },
  { key: "threeInOne", label: "3 In 1 Machine" },
  { key: "blower", label: "Blower Machine" },
  { key: "label", label: "Label Machine" },
  { key: "laserPrinting", label: "Laser Printing" },
  { key: "weighing", label: "Weighing Machine" },
  { key: "sealer", label: "Sealer Machine" },
  { key: "roboticArm", label: "Robotic Arm Machine" },
  { key: "wrapping", label: "Wrapping Machine" },
  { key: "sandFilter", label: "Sand Filter" },
  { key: "carbonFilter", label: "Activated Carbon Filter" },
  { key: "hollowMembrane", label: "Hollow Membrane Filter" },
  { key: "uvMachine", label: "UV Machine" },
  { key: "airCompressor", label: "Air Compressor" },
  { key: "rawWaterPump", label: "Raw Water Tank Pump" },
  { key: "rawTank", label: "Raw Tank" },
  { key: "filteredTank", label: "Filtered Tank" },
]

export function PMRForm({ userName }: { userName: string }) {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [line, setLine] = useState("800ML")
  const [checks, setChecks] = useState<Record<string, boolean>>({})
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [signature, setSignature] = useState<string | null>(null)
  const [checkedBy, setCheckedBy] = useState(userName)

  function handleCheckChange(key: string, checked: boolean) {
    setChecks(prev => ({ ...prev, [key]: checked }))
  }

  const draft = useMaintenanceDraft("pmr", {
    values: () => ({ date, line, checks, checkedBy }),
    apply: (v) => {
      setDate(v.date)
      setLine(v.line)
      setChecks(v.checks)
      setCheckedBy(v.checkedBy)
    },
  })

  async function handleSubmit() {
    if (!signature) {
      setError("Digital signature is required.")
      return
    }

    setIsSubmitting(true)
    setError("")

    const data: any = {
      date: new Date(date),
      line,
      checkedBy: checkedBy,
      performedSignature: signature,
    }

    MACHINE_KEYS.forEach(m => {
      data[m.key] = !!checks[m.key]
    })

    const res = await createPreventiveMaintenanceRecord(data as any)

    if (res.success) {
      await draft.clearDraft()
      setSuccess(true)
    } else {
      setError(res.error || "Failed to submit form.")
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-gray-100 text-center max-w-2xl mx-auto mt-12">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-emerald-600" />
        </div>
        <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-4 uppercase">Submission Successful</h2>
        <p className="text-gray-500 mb-8 font-medium">The Preventive Maintenance Record has been securely saved.</p>
        <Link href="/forms/maintenance" className="inline-flex items-center justify-center bg-gray-900 text-white px-8 py-3.5 rounded-xl font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors shadow-md">
          <ChevronLeft className="w-5 h-5 mr-2" /> Return to Dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 p-6 sm:p-10 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Link href="/forms/maintenance" className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-sm border border-white/10 transition-colors">
                  <ChevronLeft className="w-4 h-4 text-white" />
                </Link>
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-violet-500/20 text-violet-200 text-xs font-bold uppercase tracking-widest backdrop-blur-sm border border-violet-400/20">
                  <ShieldAlert className="w-3.5 h-3.5 mr-2" /> SGMP-03 PMR
                </div>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight mb-2 uppercase">Preventive Maintenance</h1>
              <p className="text-slate-400 font-medium">Maintenance Records Checklist</p>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-10 space-y-8">
          <DraftBanner draft={draft} />
          {error && (
            <div className="bg-red-50 text-red-800 p-4 rounded-xl border border-red-200 font-bold text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-gray-500">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-gray-50 text-gray-900 font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-gray-500">Line</label>
              <select
                value={line}
                onChange={(e) => setLine(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-gray-50 text-gray-900 font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all cursor-pointer"
              >
                <option value="800ML">800ML</option>
                <option value="425ML">425ML</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-gray-500">Checked By</label>
              <input
                type="text"
                value={checkedBy}
                onChange={(e) => setCheckedBy(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-gray-50 text-gray-900 font-bold uppercase focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-black uppercase tracking-widest text-gray-800 pb-2 border-b-2 border-gray-100">Equipment Checklist</h2>
            <p className="text-sm text-gray-500 font-medium pb-4">Check the boxes for machines that have been maintained.</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {MACHINE_KEYS.map((machine, index) => (
                <label key={index} className="flex items-center p-4 rounded-xl border border-gray-200 hover:bg-violet-50/50 cursor-pointer transition-colors group">
                  <input
                    type="checkbox"
                    checked={!!checks[machine.key]}
                    onChange={(e) => handleCheckChange(machine.key, e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-violet-600 focus:ring-violet-500 mr-3 cursor-pointer"
                  />
                  <span className="text-sm font-bold text-gray-700 group-hover:text-violet-900 transition-colors uppercase">{machine.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2 border-t border-gray-100 pt-6">
            <SignaturePadClient
              onSave={setSignature}
              label="Staff Signature *"
            />
          </div>

          <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-start gap-3 sm:justify-end">
            <SaveDraftButton draft={draft} disabled={isSubmitting} />
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-8 py-4 bg-violet-700 hover:bg-violet-800 text-white font-black uppercase tracking-wider rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-70"
            >
              {isSubmitting ? "Submitting..." : "Submit Record"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
