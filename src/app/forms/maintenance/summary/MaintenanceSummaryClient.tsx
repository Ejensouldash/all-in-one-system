"use client"

import { useState } from "react"
import { RefreshCw, Pencil, Trash2, PenTool, X, Save } from "lucide-react"
import {
  getMaintenanceSummaryRecords,
  deleteMaintenanceRecord,
  updateMaintenanceRecord,
  verifyMaintenanceRecord,
} from "@/app/actions/maintenance-summary"
import { GenericSignatureModal } from "@/components/forms/GenericSignatureModal"

type FieldType = "text" | "number" | "checkbox" | "date"

type FieldConfig = {
  key: string
  label: string
  type: FieldType
}

const FORM_TYPES: { value: string; label: string }[] = [
  { value: "lighting", label: "Lighting Inspection" },
  { value: "finished-goods", label: "Finished Goods" },
  { value: "waste-management", label: "Waste Management" },
  { value: "waste-disposal", label: "Waste Disposal" },
  { value: "food-handler", label: "Food Handler" },
  { value: "chemical-control", label: "Chemical Control" },
  { value: "cleaning", label: "Cleaning" },
]

const FIELD_CONFIG: Record<string, FieldConfig[]> = {
  lighting: [
    { key: "coverageArea", label: "Coverage Area", type: "text" },
    { key: "results", label: "Results", type: "text" },
    { key: "action", label: "Action Taken", type: "text" },
    { key: "performedBy", label: "Performed By", type: "text" },
  ],
  "finished-goods": [
    { key: "qtyDamage425x24", label: "425ML x24", type: "number" },
    { key: "qtyDamage425x6", label: "425ML x6", type: "number" },
    { key: "qtyDamage800x12", label: "800ML x12", type: "number" },
    { key: "qtyDamage800x20", label: "800ML x20", type: "number" },
    { key: "actionTaken", label: "Action Taken", type: "text" },
    { key: "remarks", label: "Remarks", type: "text" },
    { key: "performedBy", label: "Performed By", type: "text" },
  ],
  "waste-management": [
    { key: "recyclePlasticBottle", label: "Recycle Plastic Bottle", type: "text" },
    { key: "recycleCap", label: "Recycle Cap", type: "text" },
    { key: "recycleCartonBox", label: "Recycle Carton Box", type: "text" },
    { key: "recycleLabel", label: "Recycle Label", type: "text" },
    { key: "recycleOthers", label: "Recycle Others", type: "text" },
    { key: "disposalPlasticBottle", label: "Disposal Plastic Bottle", type: "text" },
    { key: "disposalCap", label: "Disposal Cap", type: "text" },
    { key: "disposalCartonBox", label: "Disposal Carton Box", type: "text" },
    { key: "disposalLabel", label: "Disposal Label", type: "text" },
    { key: "disposalOthers", label: "Disposal Others", type: "text" },
    { key: "checkedBy", label: "Checked By", type: "text" },
  ],
  "waste-disposal": [
    { key: "inspectionTime", label: "Inspection Time", type: "text" },
    { key: "feederArea", label: "Feeder Area", type: "checkbox" },
    { key: "labelArea", label: "Label Area", type: "checkbox" },
    { key: "fillingArea", label: "Filling Area", type: "checkbox" },
    { key: "packagingArea", label: "Packaging Area", type: "checkbox" },
    { key: "changingRoom", label: "Changing Room", type: "checkbox" },
    { key: "checkedBy", label: "Checked By", type: "text" },
  ],
  "food-handler": [
    { key: "employeeName", label: "Employee Name", type: "text" },
    { key: "hairnet", label: "Hairnet", type: "checkbox" },
    { key: "facemask", label: "Facemask", type: "checkbox" },
    { key: "cleanUniform", label: "Clean Uniform", type: "checkbox" },
    { key: "shoes", label: "Shoes", type: "checkbox" },
    { key: "glove", label: "Glove", type: "checkbox" },
    { key: "fingernails", label: "Fingernails", type: "checkbox" },
    { key: "noJewellery", label: "No Jewellery", type: "checkbox" },
    { key: "checkedBy", label: "Checked By", type: "text" },
  ],
  "chemical-control": [
    { key: "chemicalCode", label: "Chemical Code", type: "text" },
    { key: "timeTaken", label: "Time Taken", type: "text" },
    { key: "takenBy", label: "Taken By", type: "text" },
    { key: "timeReturn", label: "Time Return", type: "text" },
    { key: "returnBy", label: "Return By", type: "text" },
  ],
  cleaning: [
    { key: "shift", label: "Shift", type: "text" },
    { key: "section", label: "Section", type: "text" },
    { key: "line", label: "Line", type: "text" },
    { key: "checkedBy", label: "Checked By", type: "text" },
  ],
}

function formatDate(d: string | Date) {
  const date = new Date(d)
  return date.toLocaleDateString("en-GB")
}

function formatValue(val: any, type: FieldType) {
  if (type === "checkbox") return val ? "Yes" : "No"
  if (val === null || val === undefined || val === "") return "-"
  return String(val)
}

export function MaintenanceSummaryClient({
  initialRecords,
  initialFormType,
  initialStartDate,
  initialEndDate,
  userName,
}: {
  initialRecords: any[]
  initialFormType: string
  initialStartDate: string
  initialEndDate: string
  userName: string
}) {
  const [formType, setFormType] = useState(initialFormType)
  const [records, setRecords] = useState<any[]>(initialRecords)
  const [startDate, setStartDate] = useState(initialStartDate)
  const [endDate, setEndDate] = useState(initialEndDate)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [editingRecord, setEditingRecord] = useState<any | null>(null)
  const [editForm, setEditForm] = useState<Record<string, any>>({})
  const [savingEdit, setSavingEdit] = useState(false)

  const [signingRecord, setSigningRecord] = useState<any | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fields = FIELD_CONFIG[formType] || []

  async function fetchRecords(nextFormType = formType, nextStart = startDate, nextEnd = endDate) {
    setLoading(true)
    setError("")
    const res = await getMaintenanceSummaryRecords(nextFormType, nextStart, nextEnd)
    if (res.success) {
      setRecords(res.data || [])
    } else {
      setError(res.error || "Failed to load records.")
    }
    setLoading(false)
  }

  function handleFormTypeChange(value: string) {
    setFormType(value)
    fetchRecords(value, startDate, endDate)
  }

  function openEdit(record: any) {
    const initial: Record<string, any> = {}
    for (const f of fields) {
      initial[f.key] = record[f.key]
    }
    setEditForm(initial)
    setEditingRecord(record)
  }

  async function saveEdit() {
    if (!editingRecord) return
    setSavingEdit(true)
    const data: Record<string, any> = {}
    for (const f of fields) {
      data[f.key] = f.type === "number" ? Number(editForm[f.key] || 0) : editForm[f.key]
    }
    const res = await updateMaintenanceRecord(formType, editingRecord.id, data)
    setSavingEdit(false)
    if (res.success) {
      setEditingRecord(null)
      fetchRecords()
    } else {
      setError(res.error || "Failed to update record.")
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this record? This cannot be undone.")) return
    setDeletingId(id)
    const res = await deleteMaintenanceRecord(formType, id)
    setDeletingId(null)
    if (res.success) {
      fetchRecords()
    } else {
      setError(res.error || "Failed to delete record.")
    }
  }

  async function handleVerify(signature: string) {
    if (!signingRecord) return
    const res = await verifyMaintenanceRecord(formType, signingRecord.id, userName, signature)
    if (res.success) {
      setSigningRecord(null)
      fetchRecords()
    } else {
      setError(res.error || "Failed to verify record.")
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-800 p-4 rounded-xl border border-red-200 font-medium">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-wider text-gray-500">Form Type</label>
            <select
              value={formType}
              onChange={(e) => handleFormTypeChange(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm bg-white font-bold outline-none focus:ring-2 focus:ring-blue-500"
            >
              {FORM_TYPES.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-wider text-gray-500">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm bg-white font-bold outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-wider text-gray-500">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm bg-white font-bold outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={() => fetchRecords()}
            disabled={loading}
            className="flex items-center px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-sm font-black uppercase tracking-wider transition-colors shadow-md disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-left">
              <th className="px-4 py-3 font-black uppercase tracking-wider text-xs text-gray-500">Date</th>
              {fields.map((f) => (
                <th key={f.key} className="px-4 py-3 font-black uppercase tracking-wider text-xs text-gray-500">{f.label}</th>
              ))}
              <th className="px-4 py-3 font-black uppercase tracking-wider text-xs text-gray-500">Verified By</th>
              <th className="px-4 py-3 font-black uppercase tracking-wider text-xs text-gray-500 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={fields.length + 3} className="px-4 py-10 text-center text-gray-500">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-700" />
                  Loading records...
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={fields.length + 3} className="px-4 py-10 text-center text-gray-400 font-medium">
                  No records found for this range.
                </td>
              </tr>
            ) : (
              records.map((rec) => (
                <tr key={rec.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-bold whitespace-nowrap">{formatDate(rec.date)}</td>
                  {fields.map((f) => (
                    <td key={f.key} className="px-4 py-3 text-gray-700">{formatValue(rec[f.key], f.type)}</td>
                  ))}
                  <td className="px-4 py-3">
                    {rec.verifiedBy ? (
                      <span className="text-emerald-700 font-bold uppercase text-xs">{rec.verifiedBy}</span>
                    ) : (
                      <span className="text-gray-400 text-xs uppercase">Pending</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(rec)}
                        title="Edit"
                        className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setSigningRecord(rec)}
                        title="Sign / Verify"
                        disabled={!!rec.verifiedBy}
                        className="p-2 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <PenTool className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(rec.id)}
                        disabled={deletingId === rec.id}
                        title="Delete"
                        className="p-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 transition-colors disabled:opacity-40"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setEditingRecord(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 p-1 rounded-full hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-black uppercase tracking-tight mb-6">Edit Record</h2>

            <div className="space-y-4">
              {fields.map((f) => (
                <div key={f.key} className="space-y-1">
                  <label className="text-xs font-black uppercase tracking-wider text-gray-500">{f.label}</label>
                  {f.type === "checkbox" ? (
                    <input
                      type="checkbox"
                      checked={!!editForm[f.key]}
                      onChange={(e) => setEditForm({ ...editForm, [f.key]: e.target.checked })}
                      className="w-5 h-5 rounded border-gray-300"
                    />
                  ) : (
                    <input
                      type={f.type === "number" ? "number" : "text"}
                      value={editForm[f.key] ?? ""}
                      onChange={(e) => setEditForm({ ...editForm, [f.key]: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
              <button
                onClick={() => setEditingRecord(null)}
                className="px-5 py-2.5 rounded-xl font-black uppercase tracking-wider text-sm text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={savingEdit}
                className="flex items-center px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-black uppercase tracking-wider text-sm transition-colors shadow-md disabled:opacity-50"
              >
                <Save className="w-4 h-4 mr-2" /> {savingEdit ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      <GenericSignatureModal
        isOpen={!!signingRecord}
        onClose={() => setSigningRecord(null)}
        onConfirm={handleVerify}
        userName={userName}
        role="Supervisor"
        title="Verify & Sign Record"
      />
    </div>
  )
}
