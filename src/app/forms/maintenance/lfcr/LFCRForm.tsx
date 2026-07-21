"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { createLightingFixtureRecord } from "./actions"
import { ChevronLeft, Save, Droplets, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { SignaturePadClient } from "@/components/ui/SignaturePadClient"

export default function LFCRForm({ userName }: { userName: string }) {
  const router = useRouter()
  
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [cleaningLocation, setCleaningLocation] = useState("")
  const [activityPerformed, setActivityPerformed] = useState("")
  const [condition, setCondition] = useState("GOOD")
  const [nextCourseOfAction, setNextCourseOfAction] = useState("")
  const [supervisedBy, setSupervisedBy] = useState("")
  const [checkedBy, setCheckedBy] = useState(userName)
  
  const [signature, setSignature] = useState<string | null>(null)
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setError("")

    try {
      const res = await createLightingFixtureRecord({
        date: new Date(date),
        cleaningLocation,
        activityPerformed,
        condition,
        nextCourseOfAction,
        supervisedBy,
        checkedBy,
        performedSignature: signature || undefined,
      })

      if (res.success) {
        setSuccess(true)
        setTimeout(() => {
          router.push("/forms/production")
          router.refresh()
        }, 2000)
      } else {
        setError(res.error || "Failed to submit form")
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="max-w-2xl mx-auto mt-20 p-8 bg-white rounded-3xl shadow-xl text-center border border-green-100">
        <div className="w-24 h-24 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-12 h-12" />
        </div>
        <h2 className="text-3xl font-black text-gray-800 mb-4">Submission Successful!</h2>
        <p className="text-gray-500 font-medium">Redirecting to dashboard...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 p-6 sm:p-10 text-white relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Link href="/forms/maintenance" className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-sm border border-white/10 transition-colors">
                  <ChevronLeft className="w-4 h-4 text-white" />
                </Link>
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-200 text-xs font-bold uppercase tracking-widest backdrop-blur-sm border border-cyan-400/20">
                  <Droplets className="w-3.5 h-3.5 mr-2" /> SGMP-08 LFCR
                </div>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight mb-2 uppercase">Lighting Fixtures</h1>
              <p className="text-slate-400 font-medium">Cleaning Record</p>
            </div>
          </div>
          <img src="/assets/BubblesO2_Logo.png" alt="BubblesO2 Logo" className="h-16 mt-4 md:mt-0 relative z-10 brightness-0 invert" />
        </div>

        {error && (
          <div className="m-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 sm:p-10 space-y-10">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-gray-500">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-gray-50 text-gray-900 font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all mt-2"
              />
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-gray-500 mb-2 block">Cleaning Location</label>
              <input
                type="text"
                required
                value={cleaningLocation}
                onChange={(e) => setCleaningLocation(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-gray-50 text-gray-900 font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="Enter Location"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-wider text-gray-500 mb-2 block">Activity Performed</label>
              <input
                type="text"
                required
                value={activityPerformed}
                onChange={(e) => setActivityPerformed(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-gray-50 text-gray-900 font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="Describe Activity"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-wider text-gray-500 mb-2 block">Condition</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-gray-50 text-gray-900 font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              >
                <option value="GOOD">Good / Functioning</option>
                <option value="NOT_GOOD">Not Good / Not Functioning</option>
              </select>
            </div>

            {condition === "NOT_GOOD" && (
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-gray-500 mb-2 block">Next Course of Action</label>
                <input
                  type="text"
                  required
                  value={nextCourseOfAction}
                  onChange={(e) => setNextCourseOfAction(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-gray-50 text-gray-900 font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="Describe Action"
                />
              </div>
            )}
          </div>

          <hr className="border-gray-100" />

          {/* Signatures & Approvals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                <label className="text-xs font-black uppercase tracking-wider text-gray-500 mb-4 block">Digital Signature (Checked By)</label>
                <SignaturePadClient onSave={setSignature} />
              </div>
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-gray-500 block mb-2">Checked By</label>
                <input
                  type="text"
                  required
                  value={checkedBy}
                  onChange={(e) => setCheckedBy(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-gray-50 text-gray-900 font-bold uppercase focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-gray-500 block mb-2">Supervised By</label>
                <input
                  type="text"
                  required
                  value={supervisedBy}
                  onChange={(e) => setSupervisedBy(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-gray-50 text-gray-900 font-bold uppercase focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <div className="pt-6">
            <button
              type="submit"
              disabled={isSubmitting || !signature}
              className="w-full py-4 rounded-2xl bg-blue-600 text-white font-black text-lg uppercase tracking-widest hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-xl shadow-blue-600/20"
            >
              <Save className="w-6 h-6" />
              {isSubmitting ? "Submitting..." : "Submit Record"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
