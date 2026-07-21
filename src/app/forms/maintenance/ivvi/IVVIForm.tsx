"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Check, Loader2 } from "lucide-react"
import Link from "next/link"
import { createIVVI } from "./actions"
import { SignaturePadClient } from "@/components/ui/SignaturePadClient"

export function IVVIForm({ userName }: { userName: string }) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [date, setDate] = useState("")
  const [vehicleNo, setVehicleNo] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [purpose, setPurpose] = useState("Receive")
  const [product, setProduct] = useState("Bottle")
  const [visualInspection, setVisualInspection] = useState(true)
  const [reason, setReason] = useState("")
  const [furtherAction, setFurtherAction] = useState("")
  const [verifiedBy, setVerifiedBy] = useState("")
  const [performedSignature, setPerformedSignature] = useState("")
  const [verifiedSignature, setVerifiedSignature] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (!date || !vehicleNo || !companyName) {
      setError("Please fill in all required fields.")
      return
    }

    if (!visualInspection && !reason) {
      setError("Reason is required when Visual Inspection is NOT OK.")
      return
    }

    setIsSubmitting(true)

    try {
      const result = await createIVVI({
        date: new Date(date),
        vehicleNo,
        companyName,
        purpose,
        product,
        visualInspection,
        reason: visualInspection ? "" : reason,
        furtherAction,
        checkedBy: userName,
        verifiedBy,
        performedSignature,
        verifiedSignature,
      })

      if (result.success) {
        setSuccess(true)
        setTimeout(() => {
          router.push("/forms/maintenance")
        }, 2000)
      } else {
        setError(result.error || "Failed to submit form")
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <Check className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Form Submitted Successfully</h2>
        <p className="text-slate-500 mb-6">Redirecting to dashboard...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="mb-6 flex items-center gap-4">
        <Link 
          href="/forms/maintenance" 
          className="p-2 rounded-full hover:bg-slate-200 transition-colors"
        >
          <ArrowLeft className="h-6 w-6 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">SGMP-14: IVVI</h1>
          <p className="text-slate-500">Incoming Vehicle Visual Inspection Records</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 bg-slate-50">
          <h2 className="text-lg font-semibold text-slate-800">Inspection Details</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm border border-red-200">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Date <span className="text-red-500">*</span></label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Vehicle Registration No. <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={vehicleNo}
                onChange={(e) => setVehicleNo(e.target.value.toUpperCase())}
                placeholder="e.g. ABC 1234"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all uppercase"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-700">Company Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Enter company name"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Purpose</label>
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              >
                <option value="Receive">Receive</option>
                <option value="Deliver">Deliver</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Product</label>
              <select
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              >
                <option value="Bottle">Bottle</option>
                <option value="Box">Box</option>
                <option value="Label">Label</option>
                <option value="Finished Good">Finished Good</option>
                <option value="Other">Other</option>
              </select>
            </div>
            
            {product === "Other" && (
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Specify Product</label>
                <input
                  type="text"
                  required
                  onChange={(e) => setProduct(e.target.value)}
                  placeholder="Specify product type"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-slate-200">
            <div className="space-y-4">
              <h3 className="text-md font-semibold text-slate-800">Visual Inspection</h3>
              
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setVisualInspection(true)}
                  className={`flex-1 py-3 px-4 rounded-lg border text-sm font-medium transition-all ${
                    visualInspection 
                      ? "border-green-500 bg-green-50 text-green-700" 
                      : "border-slate-200 hover:border-slate-300 text-slate-600"
                  }`}
                >
                  OK
                </button>
                <button
                  type="button"
                  onClick={() => setVisualInspection(false)}
                  className={`flex-1 py-3 px-4 rounded-lg border text-sm font-medium transition-all ${
                    !visualInspection 
                      ? "border-red-500 bg-red-50 text-red-700" 
                      : "border-slate-200 hover:border-slate-300 text-slate-600"
                  }`}
                >
                  NOT OK
                </button>
              </div>

              {!visualInspection && (
                <div className="space-y-2 mt-4 animate-in fade-in slide-in-from-top-2">
                  <label className="text-sm font-medium text-slate-700">Reason (If NOT OK) <span className="text-red-500">*</span></label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                    rows={3}
                    className="w-full p-3 bg-red-50/50 border border-red-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                    placeholder="Please state the reason..."
                  />
                </div>
              )}
              
              <div className="space-y-2 mt-4">
                <label className="text-sm font-medium text-slate-700">Further Action</label>
                <input
                  type="text"
                  value={furtherAction}
                  onChange={(e) => setFurtherAction(e.target.value)}
                  placeholder="State any further actions taken (if any)"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200">
            <h3 className="text-md font-semibold text-slate-800 mb-4">Signatures</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">Checked By</label>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 font-medium">
                    {userName}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">Digital Signature</label>
                  <SignaturePadClient onSave={(val) => setPerformedSignature(val || "")} />
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">Verified By (Optional)</label>
                  <input
                    type="text"
                    value={verifiedBy}
                    onChange={(e) => setVerifiedBy(e.target.value)}
                    placeholder="Verifier Name"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">Digital Signature (Optional)</label>
                  <SignaturePadClient onSave={(val) => setVerifiedSignature(val || "")} />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Inspection"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
