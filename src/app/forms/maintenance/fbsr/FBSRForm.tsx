"use client"

import { useState } from "react"
import { Droplets, CheckCircle2, ChevronLeft } from "lucide-react"
import Link from "next/link"
import { SignaturePadClient } from "@/components/ui/SignaturePadClient"
import { createFiltrationBackwashRecord } from "./actions"

export function FBSRForm({ userName }: { userName: string }) {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [times, setTimes] = useState({
    quartzStart: "",
    quartzStop: "",
    carbonStart: "",
    carbonStop: "",
    membraneStart: "",
    membraneStop: "",
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [signature, setSignature] = useState<string | null>(null)
  const [doneBy, setDoneBy] = useState(userName)

  function handleTimeChange(key: keyof typeof times, value: string) {
    setTimes(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit() {
    if (!signature) {
      setError("Digital signature is required.")
      return
    }

    setIsSubmitting(true)
    setError("")

    const data = {
      date: new Date(date),
      ...times,
      doneBy: doneBy,
      performedSignature: signature,
    }

    const res = await createFiltrationBackwashRecord(data)

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
        <p className="text-gray-500 mb-8 font-medium">The Filtration Backwash System Record has been securely saved.</p>
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
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-200 text-xs font-bold uppercase tracking-widest backdrop-blur-sm border border-cyan-400/20">
                  <Droplets className="w-3.5 h-3.5 mr-2" /> SGMP-19 FBSR
                </div>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight mb-2 uppercase">Filtration Backwash</h1>
              <p className="text-slate-400 font-medium">System Records Checklist</p>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-10 space-y-8">
          {error && (
            <div className="bg-red-50 text-red-800 p-4 rounded-xl border border-red-200 font-bold text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
              <label className="text-xs font-black uppercase tracking-wider text-gray-500">Done By</label>
              <input
                type="text"
                value={doneBy}
                onChange={(e) => setDoneBy(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-gray-50 text-gray-900 font-bold uppercase focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-black uppercase tracking-widest text-gray-800 pb-2 border-b-2 border-gray-100">Backwash Timing</h2>
            
            <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-sm">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 font-black uppercase tracking-wider text-xs text-slate-600 border-r border-gray-200 w-1/3">Type of Machine</th>
                    <th className="px-6 py-4 font-black uppercase tracking-wider text-xs text-slate-600 border-r border-gray-200 text-center">Start Time</th>
                    <th className="px-6 py-4 font-black uppercase tracking-wider text-xs text-slate-600 text-center">Stop Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr className="hover:bg-cyan-50/30 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-700 uppercase border-r border-gray-200">
                      Quartz Sand Filter
                    </td>
                    <td className="p-2 border-r border-gray-200">
                      <input 
                        type="time" 
                        value={times.quartzStart}
                        onChange={(e) => handleTimeChange("quartzStart", e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-cyan-500 outline-none"
                      />
                    </td>
                    <td className="p-2">
                      <input 
                        type="time" 
                        value={times.quartzStop}
                        onChange={(e) => handleTimeChange("quartzStop", e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-cyan-500 outline-none"
                      />
                    </td>
                  </tr>
                  <tr className="hover:bg-cyan-50/30 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-700 uppercase border-r border-gray-200">
                      Activated Carbon Filter
                    </td>
                    <td className="p-2 border-r border-gray-200">
                      <input 
                        type="time" 
                        value={times.carbonStart}
                        onChange={(e) => handleTimeChange("carbonStart", e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-cyan-500 outline-none"
                      />
                    </td>
                    <td className="p-2">
                      <input 
                        type="time" 
                        value={times.carbonStop}
                        onChange={(e) => handleTimeChange("carbonStop", e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-cyan-500 outline-none"
                      />
                    </td>
                  </tr>
                  <tr className="hover:bg-cyan-50/30 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-700 uppercase border-r border-gray-200">
                      Hollow Membrane Filter
                    </td>
                    <td className="p-2 border-r border-gray-200">
                      <input 
                        type="time" 
                        value={times.membraneStart}
                        onChange={(e) => handleTimeChange("membraneStart", e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-cyan-500 outline-none"
                      />
                    </td>
                    <td className="p-2">
                      <input 
                        type="time" 
                        value={times.membraneStop}
                        onChange={(e) => handleTimeChange("membraneStop", e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-cyan-500 outline-none"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
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
              className="px-8 py-4 bg-cyan-700 hover:bg-cyan-800 text-white font-black uppercase tracking-wider rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-70"
            >
              {isSubmitting ? "Submitting..." : "Submit Record"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
