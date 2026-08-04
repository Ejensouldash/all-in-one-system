"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Check, Loader2 } from "lucide-react"
import Link from "next/link"
import { createVCHIF } from "./actions"
import { SignaturePadClient } from "@/components/ui/SignaturePadClient"
import { useMaintenanceDraft } from "../_components/useMaintenanceDraft"
import { DraftBanner, SaveDraftButton } from "../_components/DraftControls"

const CHECKLIST_ITEMS = [
  { key: "extClean", label: "1. Exterior of vehicle clean" },
  { key: "intClean", label: "2. Interior of vehicle area clean & hygienic" },
  { key: "noTrash", label: "3. No trash, waste or foreign materials inside vehicle" },
  { key: "seatsClean", label: "4. Seats clean and hygienic" },
  { key: "floorClean", label: "5. Floor / cargo compartment clean and dry" },
  { key: "noOdor", label: "6. No unpleasant odor detected" },
  { key: "windowsClean", label: "7. Windows and mirrors clean" },
  { key: "noSpills", label: "8. No food or liquid spills" },
  { key: "wasteBinEmpty", label: "9. Waste bin empty" },
  { key: "noPests", label: "10. No evidence of pests, insects, rodents or droppings" },
  { key: "noChemicals", label: "11. No chemical residue or contamination observed" },
  { key: "suitableCondition", label: "12. Vehicle condition suitable for transporting materials" },
  { key: "noHazardous", label: "13. No harmful chemical or hazardous substances found" },
  { key: "noIllegal", label: "14. No illegal or prohibited items (drugs, alcohol, etc.) present" },
] as const

export function VCHIFForm({ userName }: { userName: string }) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [date, setDate] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [vehicleNo, setVehicleNo] = useState("")
  const [vehicleType, setVehicleType] = useState("")
  const [driverName, setDriverName] = useState("")

  // Checklist state
  const [checklist, setChecklist] = useState<Record<string, boolean>>(
    CHECKLIST_ITEMS.reduce((acc, item) => ({ ...acc, [item.key]: true }), {}) // default all to YES (true)
  )

  const [issues, setIssues] = useState("")
  const [correctiveAction, setCorrectiveAction] = useState("")
  const [driverSignature, setDriverSignature] = useState("")
  const [inspectorSignature, setInspectorSignature] = useState("")

  const toggleChecklist = (key: string, value: boolean) => {
    setChecklist((prev) => ({ ...prev, [key]: value }))
  }

  const draft = useMaintenanceDraft("vchif", {
    values: () => ({ date, companyName, vehicleNo, vehicleType, driverName, checklist, issues, correctiveAction }),
    apply: (v) => {
      setDate(v.date)
      setCompanyName(v.companyName)
      setVehicleNo(v.vehicleNo)
      setVehicleType(v.vehicleType)
      setDriverName(v.driverName)
      setChecklist(v.checklist)
      setIssues(v.issues)
      setCorrectiveAction(v.correctiveAction)
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (!date || !companyName || !vehicleNo || !vehicleType || !driverName) {
      setError("Please fill in all required fields in the vehicle details section.")
      return
    }

    setIsSubmitting(true)

    try {
      const result = await createVCHIF({
        date: new Date(date),
        companyName,
        vehicleNo,
        vehicleType,
        driverName,
        inspectorName: userName,
        extClean: checklist.extClean,
        intClean: checklist.intClean,
        noTrash: checklist.noTrash,
        seatsClean: checklist.seatsClean,
        floorClean: checklist.floorClean,
        noOdor: checklist.noOdor,
        windowsClean: checklist.windowsClean,
        noSpills: checklist.noSpills,
        wasteBinEmpty: checklist.wasteBinEmpty,
        noPests: checklist.noPests,
        noChemicals: checklist.noChemicals,
        suitableCondition: checklist.suitableCondition,
        noHazardous: checklist.noHazardous,
        noIllegal: checklist.noIllegal,
        issues,
        correctiveAction,
        driverSignature,
        inspectorSignature,
      })

      if (result.success) {
        await draft.clearDraft()
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
          <h1 className="text-2xl font-bold text-slate-900">SGMP-14: VCHIF</h1>
          <p className="text-slate-500">Vehicle Cleaning & Hygiene Inspection Form</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 bg-slate-50">
          <h2 className="text-lg font-semibold text-slate-800">Vehicle Details</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          <DraftBanner draft={draft} />
          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm border border-red-200">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Inspection Date <span className="text-red-500">*</span></label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
            
            <div className="space-y-2">
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

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Vehicle Type / Model <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                placeholder="e.g. Lorry 3 Ton"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-700">Driver Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                placeholder="Enter driver's name"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200">
            <h3 className="text-md font-semibold text-slate-800 mb-4">Inspection Checklist</h3>
            
            <div className="space-y-3 bg-slate-50 rounded-lg border border-slate-200 overflow-hidden divide-y divide-slate-200">
              {CHECKLIST_ITEMS.map((item) => (
                <div key={item.key} className="p-3 flex items-center justify-between hover:bg-slate-100/50 transition-colors">
                  <span className="text-sm font-medium text-slate-700 max-w-[70%]">{item.label}</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => toggleChecklist(item.key, true)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all border ${
                        checklist[item.key]
                          ? "bg-green-100 text-green-700 border-green-300"
                          : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      YES
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleChecklist(item.key, false)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all border ${
                        !checklist[item.key]
                          ? "bg-red-100 text-red-700 border-red-300"
                          : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      NO
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Issues / Non-Conformance</label>
              <textarea
                value={issues}
                onChange={(e) => setIssues(e.target.value)}
                rows={3}
                placeholder="State any issues found during inspection..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Corrective Action Taken</label>
              <textarea
                value={correctiveAction}
                onChange={(e) => setCorrectiveAction(e.target.value)}
                rows={3}
                placeholder="State any actions taken to resolve issues..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200">
            <h3 className="text-md font-semibold text-slate-800 mb-4">Signatures</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">Inspector Name</label>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 font-medium">
                    {userName}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">Inspector Signature</label>
                  <SignaturePadClient onSave={(val) => setInspectorSignature(val || "")} />
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">Driver Name</label>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 font-medium">
                    {driverName || "Waiting for driver name..."}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">Driver Signature</label>
                  <SignaturePadClient onSave={(val) => setDriverSignature(val || "")} />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-start gap-3 sm:justify-end">
            <SaveDraftButton draft={draft} disabled={isSubmitting} />
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
