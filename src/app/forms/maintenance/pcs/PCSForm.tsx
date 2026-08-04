"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Bug, CheckCircle2, ChevronLeft } from "lucide-react"
import Link from "next/link"
import { SignaturePadClient } from "@/components/ui/SignaturePadClient"
import { useMaintenanceDraft } from "../_components/useMaintenanceDraft"
import { DraftBanner, SaveDraftButton } from "../_components/DraftControls"
import { createPestControlSchedule } from "./actions"

export function PCSForm({ userName }: { userName: string }) {
  const router = useRouter()
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [companyName, setCompanyName] = useState("")
  const [servicedBy, setServicedBy] = useState(userName)
  const [verifiedBy, setVerifiedBy] = useState("")
  const [remark, setRemark] = useState("")
  const [signature, setSignature] = useState<string | null>(null)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  const draft = useMaintenanceDraft("pcs", {
    values: () => ({ date, companyName, servicedBy, verifiedBy, remark }),
    apply: (v) => {
      setDate(v.date)
      setCompanyName(v.companyName)
      setServicedBy(v.servicedBy)
      setVerifiedBy(v.verifiedBy)
      setRemark(v.remark)
    },
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!date || !companyName || !servicedBy) {
      setError("Please fill in all required fields.")
      return
    }
    if (!signature) {
      setError("Digital signature is required.")
      return
    }

    setIsSubmitting(true)

    const res = await createPestControlSchedule({
      date: new Date(date),
      companyName,
      servicedBy,
      verifiedBy: verifiedBy || undefined,
      remark: remark || undefined,
      performedSignature: signature,
    })

    if (res.success) {
      await draft.clearDraft()
      setSuccess(true)
      setTimeout(() => {
        router.push("/forms/maintenance")
        router.refresh()
      }, 2000)
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
        <p className="text-gray-500 mb-8 font-medium">The pest control service visit has been securely saved.</p>
        <Link href="/forms/maintenance" className="inline-flex items-center justify-center bg-gray-900 text-white px-8 py-3.5 rounded-xl font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors shadow-md">
          <ChevronLeft className="w-5 h-5 mr-2" /> Return to Dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto pb-12">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/forms/maintenance" className="p-2 rounded-full hover:bg-slate-200 transition-colors">
          <ChevronLeft className="h-6 w-6 text-slate-600" />
        </Link>
        <div>
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-lime-100 text-lime-800 text-xs font-bold uppercase tracking-widest mb-1">
            <Bug className="w-3.5 h-3.5 mr-2" /> SGMP/06/PCS
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Pest Control Schedule</h1>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <DraftBanner draft={draft} />
          {error && (
            <div className="p-4 bg-red-50 text-red-800 rounded-xl border border-red-200 font-bold text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-gray-500">Date of Service</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-gray-50 text-gray-900 font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-gray-500">Name of Third Party Company</label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. ABC Pest Control Sdn Bhd"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-gray-50 text-gray-900 font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-gray-500">Serviced By</label>
              <input
                type="text"
                required
                value={servicedBy}
                onChange={(e) => setServicedBy(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-gray-50 text-gray-900 font-bold uppercase focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-gray-500">Verified By (Optional)</label>
              <input
                type="text"
                value={verifiedBy}
                onChange={(e) => setVerifiedBy(e.target.value)}
                placeholder="Verifier name"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-gray-50 text-gray-900 font-bold uppercase focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-xs font-black uppercase tracking-wider text-gray-500">Remark</label>
              <textarea
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                rows={3}
                placeholder="Any findings or notes from this service visit"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-gray-50 text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <SignaturePadClient onSave={setSignature} label="Staff Signature *" />
          </div>

          <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-start gap-3 sm:justify-end">
            <SaveDraftButton draft={draft} disabled={isSubmitting} />
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center px-8 py-4 bg-blue-700 hover:bg-blue-800 text-white font-black uppercase tracking-wider rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-70"
            >
              {isSubmitting ? "Submitting..." : "Submit Record"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
