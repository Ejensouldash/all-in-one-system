"use client"

import { useState, useEffect } from "react"
import { submitCleaningInspectionForm } from "./actions"
import { Loader2, CheckCircle2, ClipboardCheck, Brush, RefreshCw } from "lucide-react"
import { SignaturePadClient } from "@/components/ui/SignaturePadClient"

// Section task definitions
interface TaskDef {
  key: string // floor, platform, trash, mirror, ceiling, machine, shutter
  label: string
  taskName: string
  equipment: string
  frequency: string
}

export const SECTION_TASKS: Record<string, TaskDef[]> = {
  "meeting-changing": [
    { key: "floor", label: "LANTAI", taskName: "Sapu dan Mop", equipment: "Penyapu dan Mop Lantai", frequency: "Setiap Hari" },
    { key: "platform", label: "PLATFORM", taskName: "Lap Habuk dan Permukaan", equipment: "Kain", frequency: "Setiap Hari" },
    { key: "trash", label: "TONG SAMPAH", taskName: "Kosongkan", equipment: "Plastik Sampah", frequency: "Setiap Hari" },
    { key: "mirror", label: "CERMIN DAN PINTU", taskName: "Lap Permukaan", equipment: "Kain", frequency: "3 Kali Seminggu" },
    { key: "ceiling", label: "SILING DAN DINDING", taskName: "Lap Habuk dan Sawang", equipment: "Mop Dinding dan Penyapu Sawang", frequency: "3 Kali Seminggu" }
  ],
  "filtration-uv": [
    { key: "floor", label: "LANTAI", taskName: "Sapu dan Mop", equipment: "Penyapu dan Mop Lantai", frequency: "Setiap Hari" },
    { key: "machine", label: "MESIN DAN TANGKI AIR", taskName: "Lap Habuk dan Permukaan", equipment: "Kain", frequency: "Setiap Hari" },
    { key: "mirror", label: "CERMIN", taskName: "Lap Permukaan", equipment: "Kain", frequency: "3 Kali Seminggu" },
    { key: "ceiling", label: "SILING DAN DINDING", taskName: "Lap Habuk dan Sawang", equipment: "Mop Dinding dan Penyapu Sawang", frequency: "3 Kali Seminggu" }
  ],
  "labelling": [
    { key: "floor", label: "LANTAI", taskName: "Sapu dan Mop", equipment: "Penyapu dan Mop Lantai", frequency: "Setiap Hari" },
    { key: "machine", label: "MESIN DAN KONVEYOR", taskName: "Lap Habuk dan Permukaan", equipment: "Kain", frequency: "Setiap Hari" },
    { key: "trash", label: "TONG SAMPAH", taskName: "Kosongkan", equipment: "Plastik Sampah", frequency: "Setiap Hari" },
    { key: "ceiling", label: "SILING DAN DINDING", taskName: "Lap Habuk dan Sawang", equipment: "Mop Dinding dan Penyapu Sawang", frequency: "3 Kali Seminggu" }
  ],
  "raw-material": [
    { key: "floor", label: "LANTAI", taskName: "Sapu dan Mop", equipment: "Penyapu dan Mop Lantai", frequency: "Setiap Hari" },
    { key: "ceiling", label: "SILING DAN DINDING", taskName: "Lap Habuk dan Sawang", equipment: "Mop Dinding dan Penyapu Sawang", frequency: "3 Kali Seminggu" },
    { key: "shutter", label: "SHUTTERDOOR", taskName: "Buang Habuk dan Sawang", equipment: "Mop Dinding dan Penyapu Sawang", frequency: "3 Kali Seminggu" }
  ],
  "packing": [
    { key: "floor", label: "LANTAI", taskName: "Sapu dan Mop", equipment: "Penyapu dan Mop Lantai", frequency: "Setiap Hari" },
    { key: "machine", label: "MESIN DAN KONVEYOR", taskName: "Lap Habuk dan Permukaan", equipment: "Kain", frequency: "Setiap Hari" },
    { key: "trash", label: "TONG SAMPAH", taskName: "Kosongkan", equipment: "Plastik Sampah", frequency: "Setiap Hari" },
    { key: "mirror", label: "CERMIN", taskName: "Lap Permukaan", equipment: "Kain", frequency: "3 Kali Seminggu" },
    { key: "ceiling", label: "SILING DAN DINDING", taskName: "Lap Habuk dan Sawang", equipment: "Mop Dinding dan Penyapu Sawang", frequency: "3 Kali Seminggu" }
  ],
  "machine-3in1": [
    { key: "floor", label: "LANTAI", taskName: "Sapu dan Mop", equipment: "Penyapu dan Mop Lantai", frequency: "Setiap Hari" },
    { key: "machine", label: "MESIN", taskName: "Lap Bahagian Mesin", equipment: "Kain", frequency: "Setiap Hari" },
    { key: "trash", label: "TONG SAMPAH", taskName: "Kosongkan", equipment: "Plastik Sampah", frequency: "Setiap Hari" },
    { key: "mirror", label: "CERMIN DAN PINTU", taskName: "Lap Habuk dan Permukaan", equipment: "Kain", frequency: "3 Kali Seminggu" },
    { key: "ceiling", label: "SILING DAN DINDING", taskName: "Lap Habuk dan Sawang", equipment: "Mop Dinding dan Penyapu Sawang", frequency: "3 Kali Seminggu" }
  ],
  "finishing": [
    { key: "floor", label: "LANTAI", taskName: "Sapu dan Mop", equipment: "Penyapu dan Mop Lantai", frequency: "Setiap Hari" },
    { key: "machine", label: "MESIN DAN KONVEYOR", taskName: "Lap Habuk dan Permukaan", equipment: "Kain", frequency: "Setiap Hari" },
    { key: "trash", label: "TONG SAMPAH", taskName: "Kosongkan", equipment: "Plastik Sampah", frequency: "Setiap Hari" },
    { key: "mirror", label: "CERMIN DAN PINTU", taskName: "Lap Habuk dan Permukaan", equipment: "Kain", frequency: "3 Kali Seminggu" },
    { key: "ceiling", label: "SILING DAN DINDING", taskName: "Lap Habuk dan Sawang", equipment: "Mop Dinding dan Penyapu Sawang", frequency: "3 Kali Seminggu" }
  ],
  "blower-buffer": [
    { key: "floor", label: "LANTAI", taskName: "Sapu dan Mop", equipment: "Penyapu dan Mop Lantai", frequency: "Setiap Hari" },
    { key: "machine", label: "MESIN DAN KONVEYOR", taskName: "Lap Habuk dan Permukaan", equipment: "Kain", frequency: "Setiap Hari" },
    { key: "trash", label: "TONG SAMPAH", taskName: "Kosongkan", equipment: "Plastik Sampah", frequency: "Setiap Hari" },
    { key: "ceiling", label: "SILING DAN DINDING", taskName: "Lap Habuk dan Sawang", equipment: "Mop Dinding dan Penyapu Sawang", frequency: "3 Kali Seminggu" }
  ],
  "auto-scrambler": [
    { key: "floor", label: "LANTAI", taskName: "Sapu dan Mop", equipment: "Penyapu dan Mop Lantai", frequency: "Setiap Hari" },
    { key: "machine", label: "MESIN DAN KONVEYOR", taskName: "Lap Habuk dan Permukaan", equipment: "Kain", frequency: "Setiap Hari" },
    { key: "trash", label: "TONG SAMPAH", taskName: "Kosongkan", equipment: "Plastik Sampah", frequency: "Setiap Hari" },
    { key: "ceiling", label: "SILING DAN DINDING", taskName: "Lap Habuk dan Sawang", equipment: "Mop Dinding dan Penyapu Sawang", frequency: "3 Kali Seminggu" }
  ]
}

export function CleaningForm({ userName }: { userName: string }) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [signature, setSignature] = useState<string | null>(null)

  const [selectedSection, setSelectedSection] = useState("meeting-changing")
  const [isLineApplicable, setIsLineApplicable] = useState(false)

  // Track checklist values locally
  const [checklist, setChecklist] = useState<Record<string, boolean>>({})

  // Update line applicability when section changes
  useEffect(() => {
    setIsLineApplicable(selectedSection !== "meeting-changing" && selectedSection !== "filtration-uv")
    
    // Reset checklist values for new tasks
    const newTasks = SECTION_TASKS[selectedSection] || []
    const initialChecklist: Record<string, boolean> = {}
    newTasks.forEach(task => {
      initialChecklist[task.key] = false
    })
    setChecklist(initialChecklist)
  }, [selectedSection])

  const handleToggle = (key: string, val: boolean) => {
    setChecklist(prev => ({
      ...prev,
      [key]: val
    }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!signature) {
      setError("Sila tandatangan borang sebelum menghantar.")
      return
    }
    setLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)
    formData.append("performedSignature", signature)
    
    // Append checklist boolean values explicitly
    Object.keys(checklist).forEach(key => {
      formData.set(`${key}Ok`, checklist[key] ? "true" : "false")
    })

    const res = await submitCleaningInspectionForm(formData)

    if (res.success) {
      setSuccess(true)
      setSignature(null)
      ;(e.target as HTMLFormElement).reset()
      // Reset checklist state
      const resetChecklist = { ...checklist }
      Object.keys(resetChecklist).forEach(key => { resetChecklist[key] = false })
      setChecklist(resetChecklist)
      setTimeout(() => setSuccess(false), 5000)
    } else {
      setError(res.error || "Something went wrong")
    }
    setLoading(false)
  }

  const currentTasks = SECTION_TASKS[selectedSection] || []

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {success && (
        <div className="bg-green-50 text-green-800 p-4 rounded-xl border border-green-200 flex items-center font-medium">
          <CheckCircle2 className="w-5 h-5 mr-3 text-green-500" />
          Cleaning Inspection Record submitted successfully!
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-800 p-4 rounded-xl border border-red-200 font-medium">
          {error}
        </div>
      )}

      {/* Main Details Card */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Date <span className="text-red-500">*</span></label>
          <input 
            type="date" 
            name="date" 
            required
            defaultValue={new Date().toISOString().split('T')[0]}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Shift <span className="text-red-500">*</span></label>
          <select 
            name="shift" 
            required
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white font-medium"
          >
            <option value="AM">Sesi Pagi (AM)</option>
            <option value="PM">Sesi Petang (PM)</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Section / Kawasan <span className="text-red-500">*</span></label>
          <select 
            name="section" 
            required
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white font-medium"
          >
            <option value="meeting-changing">Meeting & Changing Area</option>
            <option value="filtration-uv">Filtration & UV System Area</option>
            <option value="labelling">Labelling Area</option>
            <option value="raw-material">Raw Material Area</option>
            <option value="packing">Packing Area</option>
            <option value="machine-3in1">3 In 1 Machine Area</option>
            <option value="finishing">Finishing Area</option>
            <option value="blower-buffer">Blower & Buffer Area</option>
            <option value="auto-scrambler">Auto Scrambler Area</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Line</label>
          <select 
            name="line" 
            disabled={!isLineApplicable}
            className={`w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white font-medium ${!isLineApplicable ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed" : ""}`}
          >
            {isLineApplicable ? (
              <>
                <option value="Line 1">Line 1</option>
                <option value="Line 2">Line 2</option>
              </>
            ) : (
              <option value="">Not Applicable</option>
            )}
          </select>
        </div>
      </div>

      {/* Dynamic Checklist Tasks Section */}
      <div className="space-y-4">
        <h3 className="text-base font-black uppercase tracking-widest text-slate-800 flex items-center">
          <Brush className="w-5 h-5 mr-2 text-blue-700 animate-bounce" />
          Checklist Items for {selectedSection.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} {isLineApplicable ? "(Interactive)" : ""}
        </h3>
        
        <div className="grid grid-cols-1 gap-6">
          {currentTasks.map((task) => (
            <div 
              key={task.key} 
              className={`p-6 rounded-2xl border-2 transition-all duration-300 bg-white ${
                checklist[task.key] 
                  ? "border-green-500 shadow-md bg-green-50/10" 
                  : "border-slate-200 hover:border-blue-300 shadow-sm"
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                
                {/* Task Details */}
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-black uppercase bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full">
                      {task.label}
                    </span>
                    <span className="text-xs font-bold uppercase bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                      {task.frequency}
                    </span>
                  </div>
                  <h4 className="text-lg font-black text-slate-800">{task.taskName}</h4>
                  <p className="text-sm text-slate-500 font-medium">Peralatan: <span className="font-bold text-slate-700">{task.equipment}</span></p>
                </div>

                {/* Chemical input */}
                <div className="w-full lg:w-96 space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Jenis Pencuci & Kuantiti (Cleaner & Qty)</label>
                  <input 
                    type="text" 
                    name={`${task.key}Cleaner`}
                    placeholder="e.g. Soap 50ml, Alcohol 70%..."
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                  />
                </div>

                {/* Status Toggle Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggle(task.key, false)}
                    className={`px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider border-2 transition-all ${
                      checklist[task.key] === false
                        ? "bg-red-50 border-red-500 text-red-600 shadow-sm"
                        : "border-slate-200 text-slate-400 hover:bg-slate-50"
                    }`}
                  >
                    ✗ Fail
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggle(task.key, true)}
                    className={`px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider border-2 transition-all ${
                      checklist[task.key] === true
                        ? "bg-green-50 border-green-500 text-green-600 shadow-sm"
                        : "border-slate-200 text-slate-400 hover:bg-slate-50"
                    }`}
                  >
                    ✓ Pass
                  </button>
                </div>

              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Submitter */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <div className="space-y-2 max-w-md">
          <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Checked By <span className="text-red-500">*</span></label>
          <input 
            type="text" 
            name="checkedBy" 
            required
            defaultValue={userName}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-bold"
          />
        </div>
      </div>

      <div className="space-y-2 border-t border-gray-200 pt-6">
        <SignaturePadClient 
          onSave={setSignature}
          label="Staff Signature (Tandatangan Kakitangan) *"
        />
      </div>

      {/* Action Buttons */}
      <div className="pt-6 border-t border-gray-100 flex items-center gap-4">
        <button 
          type="submit" 
          disabled={loading}
          className="w-full sm:w-auto px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-wider rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center disabled:opacity-70"
        >
          {loading ? (
            <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Submitting...</>
          ) : (
            "Submit Record"
          )}
        </button>
      </div>
    </form>
  )
}
