"use client"

import { useState } from "react"
import {
  saveNrhoUatData,
  syncUatItemsFromBq,
} from "@/app/actions/nrho-project"
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Save,
  FileDown,
  RefreshCw,
  Plus,
  Trash2,
  ClipboardCheck,
  Building,
  Phone,
  MapPin,
  Calendar,
  Loader2,
  Check,
  HelpCircle,
} from "lucide-react"

interface UatItem {
  id?: string
  itemDescription: string
  installationStatus: string
  testResult: string
  issues?: string
}

interface ProjectUatTabProps {
  projectId: string
  project: any
}

export function ProjectUatTab({ projectId, project }: ProjectUatTabProps) {
  const existingUat = project.uatSessions?.[0]

  const [uatId, setUatId] = useState<string | undefined>(existingUat?.id)
  const [testerName, setTesterName] = useState<string>(
    existingUat?.testerName || project.projectManager || ""
  )
  const [testerPhone, setTesterPhone] = useState<string>(existingUat?.testerPhone || "")
  const [testerLocation, setTesterLocation] = useState<string>(
    existingUat?.testerLocation || project.siteLocation || ""
  )
  const [testerAddress, setTesterAddress] = useState<string>(
    existingUat?.testerAddress || project.clientOrDepartment || ""
  )
  const [startDate, setStartDate] = useState<string>(
    existingUat?.startDate
      ? new Date(existingUat.startDate).toISOString().split("T")[0]
      : project.startDate
      ? new Date(project.startDate).toISOString().split("T")[0]
      : ""
  )
  const [endDate, setEndDate] = useState<string>(
    existingUat?.endDate
      ? new Date(existingUat.endDate).toISOString().split("T")[0]
      : project.targetCompletionDate
      ? new Date(project.targetCompletionDate).toISOString().split("T")[0]
      : ""
  )
  const [overallResult, setOverallResult] = useState<string>(
    existingUat?.overallResult || "PENDING"
  )
  const [testedBySign, setTestedBySign] = useState<string>(
    existingUat?.testedBySign || existingUat?.testerName || project.projectManager || ""
  )
  const [approvedBySign, setApprovedBySign] = useState<string>(
    existingUat?.approvedBySign || ""
  )

  // Checklist items: initialize from existing UAT items, or populate from project's BQ items
  const [items, setItems] = useState<UatItem[]>(() => {
    if (existingUat?.items && existingUat.items.length > 0) {
      return existingUat.items.map((it: any) => ({
        id: it.id,
        itemDescription: it.itemDescription,
        installationStatus: it.installationStatus || "COMPLETED",
        testResult: it.testResult || "PASS",
        issues: it.issues || "",
      }))
    }
    if (project.bqItems && project.bqItems.length > 0) {
      return project.bqItems.map((b: any) => ({
        itemDescription: b.description,
        installationStatus: "COMPLETED",
        testResult: "PASS",
        issues: "",
      }))
    }
    return [
      {
        itemDescription: "General site works and installation verification",
        installationStatus: "COMPLETED",
        testResult: "PASS",
        issues: "",
      },
    ]
  })

  const [isSaving, setIsSaving] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  )

  const handleItemChange = (index: number, field: keyof UatItem, value: string) => {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    setItems(updated)
  }

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        itemDescription: "",
        installationStatus: "COMPLETED",
        testResult: "PASS",
        issues: "",
      },
    ])
  }

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return
    setItems(items.filter((_, i) => i !== index))
  }

  const handleSyncFromBq = async () => {
    setIsSyncing(true)
    setStatusMsg(null)

    const res = await syncUatItemsFromBq(projectId)
    setIsSyncing(false)

    if (res.success && res.data) {
      setUatId(res.data.id)
      setItems(
        res.data.items.map((it: any) => ({
          id: it.id,
          itemDescription: it.itemDescription,
          installationStatus: it.installationStatus || "COMPLETED",
          testResult: it.testResult || "PASS",
          issues: it.issues || "",
        }))
      )
      setStatusMsg({
        type: "success",
        text: `Checklist synced from BQ (${res.data.items.length} items total).`,
      })
    } else {
      setStatusMsg({
        type: "error",
        text: (res as any).error || "Failed to sync items from BQ.",
      })
    }
  }

  const handleSaveUat = async () => {
    setIsSaving(true)
    setStatusMsg(null)

    const cleanItems = items
      .filter((it) => it.itemDescription.trim().length > 0)
      .map((it) => ({
        id: it.id,
        itemDescription: it.itemDescription.trim(),
        installationStatus: it.installationStatus,
        testResult: it.testResult,
        issues: it.issues?.trim() || "",
      }))

    if (cleanItems.length === 0) {
      setStatusMsg({
        type: "error",
        text: "Please provide at least one checklist item description.",
      })
      setIsSaving(false)
      return
    }

    const payload = {
      uatId,
      testerName: testerName.trim(),
      testerPhone: testerPhone.trim(),
      testerLocation: testerLocation.trim(),
      testerAddress: testerAddress.trim(),
      startDate: startDate || null,
      endDate: endDate || null,
      overallResult,
      testedBySign: testedBySign.trim(),
      testedByDate: new Date().toISOString(),
      approvedBySign: approvedBySign.trim(),
      approvedByDate: new Date().toISOString(),
      items: cleanItems,
    }

    const res = await saveNrhoUatData(projectId, payload)
    setIsSaving(false)

    if (res.success) {
      setStatusMsg({
        type: "success",
        text: "User Acceptance Test (UAT) saved successfully!",
      })
      setTimeout(() => window.location.reload(), 1200)
    } else {
      setStatusMsg({
        type: "error",
        text: res.error || "Failed to save UAT data.",
      })
    }
  }

  const passedCount = items.filter((it) => it.testResult === "PASS").length
  const failedCount = items.filter((it) => it.testResult === "FAIL").length
  const pendingCount = items.length - passedCount - failedCount

  return (
    <div className="space-y-6">
      {/* Top Banner & Action Controls */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                User Acceptance Testing (UAT) Verification Form
              </h3>
              <p className="text-xs text-slate-500">
                Functional &amp; deliverable acceptance checklist based on project Bill of Quantities (BQ) specifications.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSyncFromBq}
            disabled={isSyncing}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
            title="Import all missing items from the project's Bill of Quantities"
          >
            {isSyncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            <span>Sync from BQ</span>
          </button>

          <a
            href={`/api/nrho-project/${projectId}/pdf?type=uat`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm flex items-center gap-1.5 transition-all active:scale-95"
          >
            <FileDown className="w-4 h-4" />
            <span>Export UAT PDF</span>
          </a>

          <button
            type="button"
            onClick={handleSaveUat}
            disabled={isSaving}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm flex items-center gap-2 transition-all active:scale-95"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save UAT Form</span>
          </button>
        </div>
      </div>

      {/* Status Notice */}
      {statusMsg && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-xs font-medium border ${
            statusMsg.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {statusMsg.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Particulars Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <Building className="w-4 h-4 text-blue-600" />
          User &amp; Testing Particulars
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-slate-500 font-medium mb-1">Tester / Inspector Name</label>
            <input
              type="text"
              value={testerName}
              onChange={(e) => setTesterName(e.target.value)}
              placeholder="e.g. John Doe / Hilmi"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-500 font-medium mb-1">Contact / Phone Number</label>
            <input
              type="text"
              value={testerPhone}
              onChange={(e) => setTesterPhone(e.target.value)}
              placeholder="e.g. 018-2295235"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-500 font-medium mb-1">Testing Site Location</label>
            <input
              type="text"
              value={testerLocation}
              onChange={(e) => setTesterLocation(e.target.value)}
              placeholder="e.g. IT Block D / Pedas Plant"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-500 font-medium mb-1">Department / Address</label>
            <input
              type="text"
              value={testerAddress}
              onChange={(e) => setTesterAddress(e.target.value)}
              placeholder="e.g. Information Technology Unit"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-500 font-medium mb-1">Testing Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-500 font-medium mb-1">Testing End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
            />
          </div>
        </div>
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-sm">
          <span className="text-slate-500 font-medium block">Total Items</span>
          <span className="text-lg font-black text-slate-900 font-mono">{items.length}</span>
        </div>
        <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3.5 shadow-sm">
          <span className="text-emerald-700 font-medium block">Passed</span>
          <span className="text-lg font-black text-emerald-800 font-mono">{passedCount}</span>
        </div>
        <div className="bg-rose-50/60 border border-rose-200/80 rounded-xl p-3.5 shadow-sm">
          <span className="text-rose-700 font-medium block">Failed</span>
          <span className="text-lg font-black text-rose-800 font-mono">{failedCount}</span>
        </div>
        <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3.5 shadow-sm">
          <span className="text-amber-700 font-medium block">Pending / Other</span>
          <span className="text-lg font-black text-amber-800 font-mono">{pendingCount}</span>
        </div>
      </div>

      {/* Checklist Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Verification &amp; Deliverables Checklist
          </h4>
          <span className="text-[11px] text-slate-500">
            {passedCount} of {items.length} deliverables verified as PASS
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-800">
            <thead className="bg-slate-100 text-slate-600 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 w-12 text-center">#</th>
                <th className="py-3 px-3 min-w-[280px]">Verification / BQ Item Description</th>
                <th className="py-3 px-3 w-40 text-center">Installation Status</th>
                <th className="py-3 px-3 w-40 text-center">Test Result</th>
                <th className="py-3 px-3 min-w-[200px]">Issues / Remarks</th>
                <th className="py-3 px-3 w-12 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-2.5 px-3 text-center text-slate-400 font-mono font-bold">
                    {idx + 1}
                  </td>

                  <td className="py-2.5 px-3">
                    <input
                      type="text"
                      value={item.itemDescription}
                      onChange={(e) => handleItemChange(idx, "itemDescription", e.target.value)}
                      placeholder="e.g. Check patch panel to faceplate cable connectivity"
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                    />
                  </td>

                  <td className="py-2.5 px-3">
                    <select
                      value={item.installationStatus}
                      onChange={(e) => handleItemChange(idx, "installationStatus", e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-900 text-center focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                    >
                      <option value="COMPLETED">Completed</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="PENDING">Pending</option>
                    </select>
                  </td>

                  <td className="py-2.5 px-3">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleItemChange(idx, "testResult", "PASS")}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition-all ${
                          item.testResult === "PASS"
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700"
                        }`}
                      >
                        PASS
                      </button>

                      <button
                        type="button"
                        onClick={() => handleItemChange(idx, "testResult", "FAIL")}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition-all ${
                          item.testResult === "FAIL"
                            ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-rose-50 hover:text-rose-700"
                        }`}
                      >
                        FAIL
                      </button>

                      <button
                        type="button"
                        onClick={() => handleItemChange(idx, "testResult", "NA")}
                        className={`px-2 py-1 rounded-md text-[11px] font-bold border transition-all ${
                          item.testResult === "NA"
                            ? "bg-slate-700 text-white border-slate-700 shadow-xs"
                            : "bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100 hover:text-slate-700"
                        }`}
                      >
                        N/A
                      </button>
                    </div>
                  </td>

                  <td className="py-2.5 px-3">
                    <input
                      type="text"
                      value={item.issues || ""}
                      onChange={(e) => handleItemChange(idx, "issues", e.target.value)}
                      placeholder="Optional notes or issues found..."
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </td>

                  <td className="py-2.5 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Remove Item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 border-t border-slate-200">
              <tr>
                <td colSpan={6} className="py-3 px-4">
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg border border-blue-200 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Extra Checklist Item</span>
                  </button>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Evaluation Result & Signatories Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-5">
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
          Evaluation Result &amp; Sign-off
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          <div>
            <label className="block text-slate-500 font-medium mb-1.5">Overall UAT Result</label>
            <select
              value={overallResult}
              onChange={(e) => setOverallResult(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="PASSED">PASSED (All Criteria Met)</option>
              <option value="FAILED">FAILED (Defects Require Rectification)</option>
              <option value="PENDING">PENDING (Testing Ongoing)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-500 font-medium mb-1.5">Tested By (Tester Name)</label>
            <input
              type="text"
              value={testedBySign}
              onChange={(e) => setTestedBySign(e.target.value)}
              placeholder="e.g. John Doe / Lead Engineer"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-500 font-medium mb-1.5">Approved By (Client / Management)</label>
            <input
              type="text"
              value={approvedBySign}
              onChange={(e) => setApprovedBySign(e.target.value)}
              placeholder="e.g. Head of Department"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
