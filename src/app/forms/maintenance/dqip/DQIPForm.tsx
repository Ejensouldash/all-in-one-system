"use client"

import { useState } from "react"
import { FlaskConical, CheckCircle2, ChevronLeft, Save } from "lucide-react"
import Link from "next/link"
import { SignaturePadClient } from "@/components/ui/SignaturePadClient"
import { useMaintenanceDraft } from "../_components/useMaintenanceDraft"
import { DraftBanner, SaveDraftButton } from "../_components/DraftControls"
import { createDQIP, type DQIPEntries, type DQIPMaterialRow, type DQIPSensoryRow } from "./actions"
import { MaterialRowsEditor, emptyMaterialRows } from "./MaterialRowsEditor"
import { SensoryRowsEditor, emptySensoryRows } from "./SensoryRowsEditor"

const MATERIAL_SECTIONS: { key: keyof Pick<DQIPEntries, "cap1881" | "emptyBottle425" | "emptyBottle800" | "filledBottle425" | "filledBottle800">, label: string }[] = [
  { key: "cap1881", label: "Cap 1881" },
  { key: "emptyBottle425", label: "Empty Bottle 425ML (18.5G)" },
  { key: "emptyBottle800", label: "Empty Bottle 800ML (31.0G)" },
  { key: "filledBottle425", label: "Filled Bottle 425ML" },
  { key: "filledBottle800", label: "Filled Bottle 800ML" },
]

const SENSORY_SECTIONS: { key: keyof Pick<DQIPEntries, "taste" | "smell" | "particle">, label: string }[] = [
  { key: "taste", label: "Taste" },
  { key: "smell", label: "Smell" },
  { key: "particle", label: "Particle" },
]

function isMaterialRowFilled(row: DQIPMaterialRow) {
  return row.time.trim() !== "" || row.quantity.trim() !== "" || row.samples.some(s => s.weight.trim() !== "")
}

function isSensoryRowFilled(row: DQIPSensoryRow) {
  return row.quantity.trim() !== "" || row.samples.some(s => s.time.trim() !== "")
}

export function DQIPForm({ userName }: { userName: string }) {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [checkedBy, setCheckedBy] = useState(userName)
  const [remarks, setRemarks] = useState("")

  const [entries, setEntries] = useState<DQIPEntries>({
    cap1881: emptyMaterialRows(),
    emptyBottle425: emptyMaterialRows(),
    emptyBottle800: emptyMaterialRows(),
    filledBottle425: emptyMaterialRows(),
    filledBottle800: emptyMaterialRows(),
    taste: emptySensoryRows(),
    smell: emptySensoryRows(),
    particle: emptySensoryRows(),
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [signature, setSignature] = useState<string | null>(null)

  function updateMaterial(key: typeof MATERIAL_SECTIONS[number]["key"], rows: DQIPMaterialRow[]) {
    setEntries(prev => ({ ...prev, [key]: rows }))
  }

  function updateSensory(key: typeof SENSORY_SECTIONS[number]["key"], rows: DQIPSensoryRow[]) {
    setEntries(prev => ({ ...prev, [key]: rows }))
  }

  const draft = useMaintenanceDraft("dqip", {
    values: () => ({ date, checkedBy, remarks, entries }),
    apply: (v) => {
      setDate(v.date)
      setCheckedBy(v.checkedBy)
      setRemarks(v.remarks || "")
      setEntries(v.entries)
    },
  })

  async function handleSubmit() {
    if (!signature) {
      setError("Digital signature is required.")
      return
    }

    const filteredEntries: DQIPEntries = {
      cap1881: entries.cap1881.filter(isMaterialRowFilled),
      emptyBottle425: entries.emptyBottle425.filter(isMaterialRowFilled),
      emptyBottle800: entries.emptyBottle800.filter(isMaterialRowFilled),
      filledBottle425: entries.filledBottle425.filter(isMaterialRowFilled),
      filledBottle800: entries.filledBottle800.filter(isMaterialRowFilled),
      taste: entries.taste.filter(isSensoryRowFilled),
      smell: entries.smell.filter(isSensoryRowFilled),
      particle: entries.particle.filter(isSensoryRowFilled),
      remarks: remarks.trim() || undefined,
    }

    const hasAnyData = MATERIAL_SECTIONS.some(s => filteredEntries[s.key].length > 0) ||
      SENSORY_SECTIONS.some(s => filteredEntries[s.key].length > 0)
    if (!hasAnyData) {
      setError("Please fill in at least one sample entry.")
      return
    }

    setIsSubmitting(true)
    setError("")

    const res = await createDQIP({
      date: new Date(date),
      entries: filteredEntries,
      checkedBy,
      performedSignature: signature,
    })

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
        <p className="text-gray-500 mb-8 font-medium">The Daily Quality In-Process Record has been securely saved to the database.</p>
        <Link href="/forms/maintenance" className="inline-flex items-center justify-center bg-gray-900 text-white px-8 py-3.5 rounded-xl font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors shadow-md">
          <ChevronLeft className="w-5 h-5 mr-2" /> Return to Dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
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
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-purple-500/20 text-purple-200 text-xs font-bold uppercase tracking-widest backdrop-blur-sm border border-purple-400/20">
                  <FlaskConical className="w-3.5 h-3.5 mr-2" /> SGMP/18/DQIP
                </div>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight mb-2 uppercase">Daily Quality In-Process</h1>
              <p className="text-slate-400 font-medium">Record in-process weight, condition, batch number, and sensory sample checks.</p>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-10 space-y-10">
          <DraftBanner draft={draft} />
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
              <label className="text-xs font-black uppercase tracking-wider text-gray-500">Checked By</label>
              <input
                type="text"
                value={checkedBy}
                onChange={(e) => setCheckedBy(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-gray-50 text-gray-900 font-bold uppercase focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-8">
            <h2 className="text-lg font-black uppercase tracking-widest text-gray-800 pb-2 border-b-2 border-gray-100">Weight &amp; Condition Samples</h2>
            {MATERIAL_SECTIONS.map((section) => (
              <MaterialRowsEditor
                key={section.key}
                label={section.label}
                rows={entries[section.key]}
                onChange={(rows) => updateMaterial(section.key, rows)}
              />
            ))}
          </div>

          <div className="space-y-8">
            <h2 className="text-lg font-black uppercase tracking-widest text-gray-800 pb-2 border-b-2 border-gray-100">Sensory Samples</h2>
            {SENSORY_SECTIONS.map((section) => (
              <SensoryRowsEditor
                key={section.key}
                label={section.label}
                rows={entries[section.key]}
                onChange={(rows) => updateSensory(section.key, rows)}
              />
            ))}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-gray-500">Remarks</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              placeholder="Any observations or corrective actions..."
              className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-gray-50 text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-y"
            />
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
              className="flex items-center px-8 py-4 bg-blue-700 hover:bg-blue-800 text-white font-black uppercase tracking-wider rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-70"
            >
              <Save className="w-5 h-5 mr-2" />
              {isSubmitting ? "Submitting..." : "Submit Record"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
