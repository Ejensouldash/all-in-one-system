"use client"

import { useState } from "react"
import { ShieldCheck, CheckCircle2, ChevronLeft } from "lucide-react"
import Link from "next/link"
import { SignaturePadClient } from "@/components/ui/SignaturePadClient"
import { createPreventiveMaintenanceInspection } from "./actions"

const MACHINE_KEYS = [
  { key: "autoScrambler", label: "Auto Scrambler" },
  { key: "threeInOne", label: "3 In 1 Machine" },
  { key: "blower", label: "Blower Machine" },
  { key: "label", label: "Label Machine" },
  { key: "printer", label: "Printer Machine" },
  { key: "steamGenerator", label: "Steam Generator" },
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
  { key: "well", label: "Well" },
]

export function PMIRForm({ userName }: { userName: string }) {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [time, setTime] = useState("")
  const [checks, setChecks] = useState<Record<string, boolean>>({})
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [signature, setSignature] = useState<string | null>(null)

  function handleCheckChange(key: string, checked: boolean) {
    setChecks(prev => ({ ...prev, [key]: checked }))
  }

  async function handleSubmit() {
    if (!time) {
      setError("Time is required.")
      return
    }
    if (!signature) {
      setError("Digital signature is required.")
      return
    }

    setIsSubmitting(true)
    setError("")

    const data: any = {
      date: new Date(date),
      time,
      checkedBy: userName,
      performedSignature: signature,
    }

    MACHINE_KEYS.forEach(m => {
      data[m.key] = !!checks[m.key]
    })

    const res = await createPreventiveMaintenanceInspection(data as any)

    if (res.success) {
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
        <p className="text-gray-500 mb-8 font-medium">The Preventive Maintenance Inspection Record has been securely saved.</p>
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
        <div className="bg-slate-900 p-6 sm:p-10 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="relative z-10">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-200 text-xs font-bold uppercase tracking-widest mb-4 backdrop-blur-sm border border-indigo-400/20">
              <ShieldCheck className="w-3.5 h-3.5 mr-2" /> SGMP-03 PMIR
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight mb-2 uppercase">Preventive Maintenance</h1>
            <p className="text-slate-400 font-medium">Inspection Records Checklist</p>
          </div>
        </div>

        <div className="p-6 sm:p-10 space-y-8">
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
              <label className="text-xs font-black uppercase tracking-wider text-gray-500">Time</label>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-gray-50 text-gray-900 font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-gray-500">Checked By</label>
              <input
                type="text"
                value={userName}
                disabled
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-100 text-gray-500 font-bold uppercase cursor-not-allowed"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-black uppercase tracking-widest text-gray-800 pb-2 border-b-2 border-gray-100">Equipment Checklist</h2>
            <p className="text-sm text-gray-500 font-medium pb-4">Check the boxes for machines that have been inspected.</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {MACHINE_KEYS.map((machine, index) => (
                <label key={index} className="flex items-center p-4 rounded-xl border border-gray-200 hover:bg-indigo-50/50 cursor-pointer transition-colors group">
                  <input
                    type="checkbox"
                    checked={!!checks[machine.key]}
                    onChange={(e) => handleCheckChange(machine.key, e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mr-3 cursor-pointer"
                  />
                  <span className="text-sm font-bold text-gray-700 group-hover:text-indigo-900 transition-colors uppercase">{machine.label}</span>
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

          <div className="pt-6 border-t border-gray-100 flex items-center justify-end">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-8 py-4 bg-indigo-700 hover:bg-indigo-800 text-white font-black uppercase tracking-wider rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-70"
            >
              {isSubmitting ? "Submitting..." : "Submit Record"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
