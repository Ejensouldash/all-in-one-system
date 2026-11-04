"use client"

import React, { useState, useEffect } from "react"
import {
  X,
  FileText,
  DollarSign,
  Calendar,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Upload,
  Download,
  Loader2,
  Users,
  Award,
  Link as LinkIcon,
  Check,
  ChevronRight,
  ShieldCheck,
  Eye,
} from "lucide-react"
import {
  getPostEventReport,
  savePostEventReport,
  submitPostEventReport,
  approvePostEventReport,
  uploadPostEventFile,
  type PostEventReportFormData,
  type VipEntry,
  type PlannedFlowItem,
  type ActivationItem,
  type ActivationImageItem,
  type ClaimantGroup,
  type ClaimItemDetail,
  type MediaLinkItem,
} from "@/app/actions/marketing-post-event-report"

interface PostEventReportModalProps {
  isOpen: boolean
  onClose: () => void
  requisitionId: string
  eventName: string
  currentUserRole?: string
  currentUserName?: string
}

type TabType = "SCOPE" | "FLOW" | "FINANCE" | "FEEDBACK" | "APPROVAL"

const COMMON_DEPARTMENTS = [
  "MARKETING",
  "LOGISTIC",
  "HUMAN RESOURCES",
  "IT",
  "FINANCE",
  "PRODUCTION (RANTAU)",
  "PRODUCTION (PEDAS)",
  "ONLINE SALES",
  "CORPORATE",
  "BRAND DEVELOPMENT",
]

const CLAIM_CATEGORIES = [
  { value: "PETROL", label: "Petrol / Fuel" },
  { value: "TNG", label: "Touch 'n Go / Toll" },
  { value: "ACCOMMODATION", label: "Hotel / Accommodation" },
  { value: "MEALS", label: "Meal Allowance" },
  { value: "BOOTH_ITEMS", label: "Booth Materials & Setup" },
  { value: "ICE", label: "Ice Cubes" },
  { value: "LOGISTICS", label: "Logistics / Courier" },
  { value: "OTHER", label: "Other" },
]

export function PostEventReportModal({
  isOpen,
  onClose,
  requisitionId,
  eventName,
  currentUserRole = "STAFF",
  currentUserName = "Staff",
}: PostEventReportModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("SCOPE")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingReceipt, setUploadingReceipt] = useState<string | null>(null)
  const [uploadingFlow, setUploadingFlow] = useState(false)
  const [uploadingActivation, setUploadingActivation] = useState(false)
  const [feedbackStats, setFeedbackStats] = useState<any>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const [formData, setFormData] = useState<PostEventReportFormData>({
    requisitionId,
    documentNo: "",
    issueNo: "02",
    reportDate: new Date().toISOString().split("T")[0],
    reportPreparedBy: currentUserName,
    attendeesCount: "",
    typeOfInvolvement: "Sponsorship",
    vipsList: [],
    staffInvolved: [],
    aims: "",
    benefits: "",
    expectedImpact: "",
    flowType: "DAILY",
    plannedFlowText: "",
    plannedFlowImages: [],
    executedFlowText: "",
    activationsList: [],
    activationImages: [],
    claimBreakdown: [],
    totalClaimAmount: 0,
    futureImprovementOrg: "",
    futureImprovementPart: "",
    futureConsideration: true,
    eventSuccessRate: 99,
    mediaLinks: [],
    status: "DRAFT",
  })

  // Load report data on open
  useEffect(() => {
    if (!isOpen || !requisitionId) return

    let isMounted = true
    setLoading(true)
    setErrorMsg(null)

    getPostEventReport(requisitionId)
      .then((res) => {
        if (!isMounted) return
        if (res.success && res.report) {
          setFormData(res.report as PostEventReportFormData)
          setFeedbackStats(res.feedbackStats)
        } else {
          setErrorMsg(res.error || "Failed to load post-event report")
        }
      })
      .catch((err) => {
        if (!isMounted) return
        setErrorMsg(err.message || "Error loading report records")
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [isOpen, requisitionId])

  // Recalculate totals whenever claim breakdown changes
  const updateClaimGroup = (groupIndex: number, updatedGroup: ClaimantGroup) => {
    const newBreakdown = [...formData.claimBreakdown]
    newBreakdown[groupIndex] = updatedGroup

    let grand = 0
    newBreakdown.forEach((g) => {
      let sub = 0
      g.items.forEach((it) => {
        sub += typeof it.amount === "number" && !isNaN(it.amount) ? it.amount : 0
      })
      g.subtotal = Math.round(sub * 100) / 100
      grand += g.subtotal
    })

    setFormData({
      ...formData,
      claimBreakdown: newBreakdown,
      totalClaimAmount: Math.round(grand * 100) / 100,
    })
  }

  // Add Claimant Group
  const handleAddClaimant = () => {
    const newGroup: ClaimantGroup = {
      id: `claimant-${Date.now()}`,
      claimantName: "",
      items: [
        {
          id: `item-${Date.now()}-1`,
          description: "",
          category: "OTHER",
          amount: 0,
        },
      ],
      subtotal: 0,
    }
    setFormData({
      ...formData,
      claimBreakdown: [...formData.claimBreakdown, newGroup],
    })
  }

  // Remove Claimant Group
  const handleRemoveClaimant = (groupIndex: number) => {
    const newBreakdown = formData.claimBreakdown.filter((_, idx) => idx !== groupIndex)
    let grand = 0
    newBreakdown.forEach((g) => {
      grand += g.subtotal
    })
    setFormData({
      ...formData,
      claimBreakdown: newBreakdown,
      totalClaimAmount: Math.round(grand * 100) / 100,
    })
  }

  // Add Item inside Claimant
  const handleAddClaimItem = (groupIndex: number) => {
    const group = formData.claimBreakdown[groupIndex]
    const newItem: ClaimItemDetail = {
      id: `item-${Date.now()}-${group.items.length + 1}`,
      description: "",
      category: "OTHER",
      amount: 0,
    }
    const updatedGroup = {
      ...group,
      items: [...group.items, newItem],
    }
    updateClaimGroup(groupIndex, updatedGroup)
  }

  // Remove Item inside Claimant
  const handleRemoveClaimItem = (groupIndex: number, itemIndex: number) => {
    const group = formData.claimBreakdown[groupIndex]
    const updatedGroup = {
      ...group,
      items: group.items.filter((_, idx) => idx !== itemIndex),
    }
    updateClaimGroup(groupIndex, updatedGroup)
  }

  // Upload receipt for a claim item
  const handleUploadReceipt = async (
    groupIndex: number,
    itemIndex: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0]
    if (!file) return

    const itemId = formData.claimBreakdown[groupIndex]?.items[itemIndex]?.id
    setUploadingReceipt(itemId || "uploading")
    setErrorMsg(null)

    try {
      const data = new FormData()
      data.append("file", file)
      data.append("subfolder", "receipts")

      const res = await uploadPostEventFile(data)
      if (res.success && res.url) {
        const group = formData.claimBreakdown[groupIndex]
        const items = [...group.items]
        items[itemIndex] = {
          ...items[itemIndex],
          receiptUrl: res.url,
          receiptName: res.name || file.name,
        }
        updateClaimGroup(groupIndex, { ...group, items })
      } else {
        setErrorMsg(res.error || "Failed to upload receipt attachment")
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Upload error occurred")
    } finally {
      setUploadingReceipt(null)
    }
  }

  // Upload Flow Image (Timetable / Route Map)
  const handleUploadFlowImage = async (e: React.ChangeEvent<HTMLInputElement>, dayLabel = "Day 1") => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingFlow(true)
    setErrorMsg(null)

    try {
      const data = new FormData()
      data.append("file", file)
      data.append("subfolder", "flow")

      const res = await uploadPostEventFile(data)
      if (res.success && res.url) {
        const newItem: PlannedFlowItem = {
          id: `flow-${Date.now()}`,
          dayLabel,
          imageUrl: res.url,
          caption: file.name,
        }
        setFormData({
          ...formData,
          plannedFlowImages: [...formData.plannedFlowImages, newItem],
        })
      } else {
        setErrorMsg(res.error || "Failed to upload schedule image")
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error uploading image")
    } finally {
      setUploadingFlow(false)
    }
  }

  // Upload Activation Poster
  const handleUploadActivationImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingActivation(true)
    setErrorMsg(null)

    try {
      const data = new FormData()
      data.append("file", file)
      data.append("subfolder", "activations")

      const res = await uploadPostEventFile(data)
      if (res.success && res.url) {
        const newItem: ActivationImageItem = {
          id: `act-img-${Date.now()}`,
          title: file.name.replace(/\.[^/.]+$/, ""),
          imageUrl: res.url,
        }
        setFormData({
          ...formData,
          activationImages: [...formData.activationImages, newItem],
        })
      } else {
        setErrorMsg(res.error || "Failed to upload activation poster")
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error uploading poster")
    } finally {
      setUploadingActivation(false)
    }
  }

  // Save Draft
  const handleSaveDraft = async () => {
    setSaving(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      const res = await savePostEventReport(formData)
      if (res.success) {
        setSuccessMsg("Report draft saved successfully!")
        setTimeout(() => setSuccessMsg(null), 3000)
      } else {
        setErrorMsg(res.error || "Failed to save report draft")
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error occurred while saving")
    } finally {
      setSaving(false)
    }
  }

  // Submit Report
  const handleSubmitForApproval = async () => {
    if (!confirm("Are you sure you want to submit this report for HOD review and sign-off?")) return

    setSaving(true)
    setErrorMsg(null)
    try {
      await savePostEventReport(formData)
      const res = await submitPostEventReport(requisitionId)
      if (res.success) {
        setFormData({ ...formData, status: "SUBMITTED" })
        setSuccessMsg("Report submitted successfully for approval!")
        setActiveTab("APPROVAL")
      } else {
        setErrorMsg(res.error || "Failed to submit report")
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error occurred during submission")
    } finally {
      setSaving(false)
    }
  }

  // Approve Report
  const handleApproveReport = async () => {
    const approver = prompt("Please confirm Approving Officer Name (HOD / Executive):", currentUserName || "Head of Marketing Department")
    if (!approver) return

    setSaving(true)
    setErrorMsg(null)
    try {
      const res = await approvePostEventReport(requisitionId, approver)
      if (res.success) {
        setFormData({
          ...formData,
          status: "APPROVED",
          approvedBy: approver,
          approvedAt: new Date().toISOString(),
        })
        setSuccessMsg("Report successfully approved and locked!")
      } else {
        setErrorMsg(res.error || "Failed to approve report")
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error approving report")
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-sm">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Post-Event Report Hub
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
                  ISO BOMSB-MKT-A-850-001-QR05
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    formData.status === "APPROVED"
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      : formData.status === "SUBMITTED"
                      ? "bg-amber-100 text-amber-800 border border-amber-200"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {formData.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Event: <span className="font-semibold text-slate-800">{eventName}</span> • Ref:{" "}
                <span className="font-mono text-teal-700 font-semibold">{formData.documentNo || "Generating..."}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`/api/marketing/events/${requisitionId}/report/iso-pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-sm transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Generate Official PDF</span>
            </a>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-white px-5 overflow-x-auto gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("SCOPE")}
            className={`px-3 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer ${
              activeTab === "SCOPE"
                ? "border-teal-600 text-teal-700 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>1. Scope &amp; VIPs</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("FLOW")}
            className={`px-3 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer ${
              activeTab === "FLOW"
                ? "border-teal-600 text-teal-700 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>2. Objectives, Flow &amp; Activations</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("FINANCE")}
            className={`px-3 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer ${
              activeTab === "FINANCE"
                ? "border-teal-600 text-teal-700 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>3. Finance &amp; Claims</span>
            {formData.totalClaimAmount > 0 && (
              <span className="text-[10px] bg-teal-100 text-teal-800 px-1.5 py-0.2 rounded-full font-bold ml-1">
                RM {formData.totalClaimAmount.toFixed(2)}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("FEEDBACK")}
            className={`px-3 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer ${
              activeTab === "FEEDBACK"
                ? "border-teal-600 text-teal-700 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>4. Impact &amp; Review</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("APPROVAL")}
            className={`px-3 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer ${
              activeTab === "APPROVAL"
                ? "border-teal-600 text-teal-700 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>5. Approval &amp; Download</span>
          </button>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="mx-5 mt-3 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-5 mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-700">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-5">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
              <p className="text-xs">Loading post-event report data...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: SCOPE & VIPS */}
              {activeTab === "SCOPE" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        ISO Document Number
                      </label>
                      <input
                        type="text"
                        value={formData.documentNo}
                        onChange={(e) => setFormData({ ...formData, documentNo: e.target.value })}
                        className="w-full text-xs font-mono font-semibold px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Report Prepared By
                      </label>
                      <input
                        type="text"
                        value={formData.reportPreparedBy}
                        onChange={(e) => setFormData({ ...formData, reportPreparedBy: e.target.value })}
                        className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Report Date
                      </label>
                      <input
                        type="date"
                        value={formData.reportDate}
                        onChange={(e) => setFormData({ ...formData, reportDate: e.target.value })}
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        3. Number of Attendees
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 69,104 or 200,000*"
                        value={formData.attendeesCount}
                        onChange={(e) => setFormData({ ...formData, attendeesCount: e.target.value })}
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        4. Type of Involvement
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Sponsorship, Exhibition, Sampling, Official Hydration Partner"
                        value={formData.typeOfInvolvement}
                        onChange={(e) => setFormData({ ...formData, typeOfInvolvement: e.target.value })}
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* Section 5: VIPs List */}
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-xs font-bold text-slate-800">
                          5. VIPs / Dignitaries (If Any)
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          List dignitaries, ministers, board members, or executive stakeholders in attendance.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            vipsList: [...formData.vipsList, { name: "", title: "" }],
                          })
                        }
                        className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-300 rounded-lg hover:bg-slate-100 flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add VIP</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      {formData.vipsList.map((vip, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="VIP Name (e.g. Dato Arifin Marzuki)"
                            value={vip.name}
                            onChange={(e) => {
                              const updated = [...formData.vipsList]
                              updated[idx].name = e.target.value
                              setFormData({ ...formData, vipsList: updated })
                            }}
                            className="flex-1 text-xs px-3 py-1.5 border border-slate-300 rounded-lg bg-white outline-none"
                          />
                          <input
                            type="text"
                            placeholder="Title / Designation (e.g. Chairman Bubbles O2)"
                            value={vip.title}
                            onChange={(e) => {
                              const updated = [...formData.vipsList]
                              updated[idx].title = e.target.value
                              setFormData({ ...formData, vipsList: updated })
                            }}
                            className="flex-1 text-xs px-3 py-1.5 border border-slate-300 rounded-lg bg-white outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const updated = formData.vipsList.filter((_, i) => i !== idx)
                              setFormData({ ...formData, vipsList: updated })
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Section 6: Staff Involved */}
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                    <h3 className="text-xs font-bold text-slate-800 mb-1">
                      6. Staff &amp; Departments Involved
                    </h3>
                    <p className="text-[11px] text-slate-500 mb-3">
                      Select all departments that supported and executed event operations.
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {COMMON_DEPARTMENTS.map((dept) => {
                        const isSelected = formData.staffInvolved.includes(dept)
                        return (
                          <button
                            key={dept}
                            type="button"
                            onClick={() => {
                              const updated = isSelected
                                ? formData.staffInvolved.filter((d) => d !== dept)
                                : [...formData.staffInvolved, dept]
                              setFormData({ ...formData, staffInvolved: updated })
                            }}
                            className={`px-3 py-2 rounded-lg text-xs font-semibold text-left border flex items-center justify-between transition cursor-pointer ${
                              isSelected
                                ? "bg-teal-50 border-teal-300 text-teal-800"
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            <span>{dept}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-teal-600" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: OBJECTIVES, FLOW & ACTIVATIONS */}
              {activeTab === "FLOW" && (
                <div className="space-y-4">
                  {/* Section 7: Objectives */}
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                    <h3 className="text-xs font-bold text-slate-800">
                      7. Event Objectives
                    </h3>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Aims
                      </label>
                      <textarea
                        rows={2}
                        value={formData.aims}
                        onChange={(e) => setFormData({ ...formData, aims: e.target.value })}
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                        placeholder="Strategic aims of company involvement in this event..."
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Benefits
                      </label>
                      <textarea
                        rows={2}
                        value={formData.benefits}
                        onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                        placeholder="Brand recognition, business networking, direct consumer engagement..."
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Expected Impact &amp; Stock Distribution
                      </label>
                      <textarea
                        rows={2}
                        value={formData.expectedImpact}
                        onChange={(e) => setFormData({ ...formData, expectedImpact: e.target.value })}
                        className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                        placeholder="e.g.&#10;425mlx24 = 1154ctn for 3 days&#10;800mlx12 = 30ctn"
                      />
                    </div>
                  </div>

                  {/* Section 8: General Flow */}
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold text-slate-800">
                          8. General Flow &amp; Tentative
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Upload daily schedule images, stage route maps, or document tentative timeline.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="px-2.5 py-1 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-lg flex items-center gap-1 cursor-pointer transition">
                          {uploadingFlow ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                          <span>Upload Schedule / Map</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={uploadingFlow}
                            onChange={(e) => handleUploadFlowImage(e, `Day ${formData.plannedFlowImages.length + 1}`)}
                          />
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Planned Flow / Tentative Notes
                      </label>
                      <textarea
                        rows={2}
                        value={formData.plannedFlowText}
                        onChange={(e) => setFormData({ ...formData, plannedFlowText: e.target.value })}
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg outline-none bg-white"
                        placeholder="Summary of daily tentative or stage route schedule..."
                      />
                    </div>

                    {/* Flow Images Preview */}
                    {formData.plannedFlowImages.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                        {formData.plannedFlowImages.map((img, idx) => (
                          <div key={idx} className="border border-slate-200 rounded-xl p-2 bg-white relative group">
                            <img src={img.imageUrl} alt={img.dayLabel} className="w-full h-24 object-cover rounded-lg" />
                            <div className="mt-1 flex items-center justify-between text-[11px]">
                              <input
                                type="text"
                                value={img.dayLabel}
                                onChange={(e) => {
                                  const updated = [...formData.plannedFlowImages]
                                  updated[idx].dayLabel = e.target.value
                                  setFormData({ ...formData, plannedFlowImages: updated })
                                }}
                                className="w-20 font-bold border-b border-transparent hover:border-slate-300 outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = formData.plannedFlowImages.filter((_, i) => i !== idx)
                                  setFormData({ ...formData, plannedFlowImages: updated })
                                }}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Executed Flow / Operational Outcome
                      </label>
                      <input
                        type="text"
                        value={formData.executedFlowText}
                        onChange={(e) => setFormData({ ...formData, executedFlowText: e.target.value })}
                        className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg outline-none bg-white"
                        placeholder="e.g. Executed smoothly according to schedule without any safety or logistics disruptions."
                      />
                    </div>
                  </div>

                  {/* Section 9: Activations */}
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold text-slate-800">
                          9. Activation &amp; Engagement Activities
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Booth games, direct sales, social media activations, and promotional posters.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              activationsList: [
                                ...formData.activationsList,
                                { id: `act-${Date.now()}`, title: "", description: "" },
                              ],
                            })
                          }
                          className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-300 rounded-lg hover:bg-slate-100 flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Activity</span>
                        </button>

                        <label className="px-2.5 py-1 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-lg flex items-center gap-1 cursor-pointer transition">
                          {uploadingActivation ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                          <span>Upload Poster</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={uploadingActivation}
                            onChange={handleUploadActivationImage}
                          />
                        </label>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {formData.activationsList.map((act, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Activity Title (e.g. Pick, Reveal & Win / Strike A Pose)"
                            value={act.title}
                            onChange={(e) => {
                              const updated = [...formData.activationsList]
                              updated[idx].title = e.target.value
                              setFormData({ ...formData, activationsList: updated })
                            }}
                            className="flex-1 text-xs px-3 py-1.5 border border-slate-300 rounded-lg bg-white outline-none"
                          />
                          <input
                            type="text"
                            placeholder="Brief description..."
                            value={act.description || ""}
                            onChange={(e) => {
                              const updated = [...formData.activationsList]
                              updated[idx].description = e.target.value
                              setFormData({ ...formData, activationsList: updated })
                            }}
                            className="flex-1 text-xs px-3 py-1.5 border border-slate-300 rounded-lg bg-white outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const updated = formData.activationsList.filter((_, i) => i !== idx)
                              setFormData({ ...formData, activationsList: updated })
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Activation Posters Preview */}
                    {formData.activationImages.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                        {formData.activationImages.map((img, idx) => (
                          <div key={idx} className="border border-slate-200 rounded-xl p-2 bg-white relative">
                            <img src={img.imageUrl} alt={img.title} className="w-full h-28 object-contain rounded-lg bg-slate-50" />
                            <div className="mt-1 flex items-center justify-between text-[11px]">
                              <span className="truncate font-semibold text-slate-700">{img.title}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = formData.activationImages.filter((_, i) => i !== idx)
                                  setFormData({ ...formData, activationImages: updated })
                                }}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: FINANCE & CLAIMS */}
              {activeTab === "FINANCE" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-teal-50 border border-teal-200 p-4 rounded-xl">
                    <div>
                      <h3 className="text-sm font-bold text-teal-950">
                        10. Finance Report &amp; Itemized Claims (TEV)
                      </h3>
                      <p className="text-xs text-teal-800">
                        All claim totals are automatically calculated by the system to prevent manual arithmetic errors. Attached receipts will be formatted into PDF Appendix pages.
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-semibold text-teal-700 block">GRAND TOTAL CLAIMS</span>
                      <span className="text-xl font-black text-teal-900 font-mono">
                        RM {formData.totalClaimAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleAddClaimant}
                      className="px-3 py-1.5 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-lg flex items-center gap-1.5 shadow-sm transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Claimant</span>
                    </button>
                  </div>

                  {formData.claimBreakdown.length === 0 ? (
                    <div className="py-12 border-2 border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-xs">
                      No claims recorded yet. Click the button above to add a claimant (e.g. Cik Nana, Muhammad).
                    </div>
                  ) : (
                    formData.claimBreakdown.map((group, gIdx) => (
                      <div key={group.id} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                        {/* Group Header */}
                        <div className="bg-slate-100/90 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-slate-500 uppercase">Claimant {gIdx + 1}:</span>
                            <input
                              type="text"
                              placeholder="Staff Name (e.g. Cik Nana / Muhammad)"
                              value={group.claimantName}
                              onChange={(e) => {
                                updateClaimGroup(gIdx, { ...group, claimantName: e.target.value })
                              }}
                              className="text-xs font-bold text-slate-800 bg-white border border-slate-300 px-2 py-1 rounded-md outline-none focus:ring-1 focus:ring-teal-500"
                            />
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-500">
                              Subtotal:{" "}
                              <span className="font-mono font-bold text-teal-700">
                                RM {group.subtotal.toFixed(2)}
                              </span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveClaimant(gIdx)}
                              className="text-slate-400 hover:text-red-600 p-1 rounded transition"
                              title="Delete Claimant Group"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Items Table */}
                        <div className="p-3 overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-bold">
                                <th className="pb-2 w-10">No</th>
                                <th className="pb-2">Description</th>
                                <th className="pb-2 w-36">Category</th>
                                <th className="pb-2 w-28">Vehicle Plate</th>
                                <th className="pb-2 w-28 text-right">Amount (RM)</th>
                                <th className="pb-2 w-44 text-center">Receipt Attachment</th>
                                <th className="pb-2 w-8"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {group.items.map((item, iIdx) => (
                                <tr key={item.id} className="hover:bg-slate-50/50">
                                  <td className="py-2 text-slate-400 font-mono">{iIdx + 1}</td>
                                  <td className="py-2 pr-2">
                                    <input
                                      type="text"
                                      placeholder="e.g. Team Accommodation / Refuel SJU 802"
                                      value={item.description}
                                      onChange={(e) => {
                                        const items = [...group.items]
                                        items[iIdx].description = e.target.value
                                        updateClaimGroup(gIdx, { ...group, items })
                                      }}
                                      className="w-full text-xs px-2 py-1 border border-slate-200 rounded outline-none focus:border-teal-500"
                                    />
                                  </td>
                                  <td className="py-2 pr-2">
                                    <select
                                      value={item.category}
                                      onChange={(e) => {
                                        const items = [...group.items]
                                        items[iIdx].category = e.target.value as any
                                        updateClaimGroup(gIdx, { ...group, items })
                                      }}
                                      className="w-full text-xs px-2 py-1 border border-slate-200 rounded outline-none bg-white"
                                    >
                                      {CLAIM_CATEGORIES.map((c) => (
                                        <option key={c.value} value={c.value}>
                                          {c.label}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="py-2 pr-2">
                                    <input
                                      type="text"
                                      placeholder="e.g. SJU 802"
                                      value={item.vehiclePlate || ""}
                                      onChange={(e) => {
                                        const items = [...group.items]
                                        items[iIdx].vehiclePlate = e.target.value
                                        updateClaimGroup(gIdx, { ...group, items })
                                      }}
                                      className="w-full text-xs font-mono uppercase px-2 py-1 border border-slate-200 rounded outline-none focus:border-teal-500"
                                    />
                                  </td>
                                  <td className="py-2 pr-2 text-right">
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={item.amount === 0 ? "" : item.amount}
                                      onChange={(e) => {
                                        const val = parseFloat(e.target.value) || 0
                                        const items = [...group.items]
                                        items[iIdx].amount = val
                                        updateClaimGroup(gIdx, { ...group, items })
                                      }}
                                      className="w-full text-xs text-right font-mono font-bold px-2 py-1 border border-slate-200 rounded outline-none focus:border-teal-500"
                                    />
                                  </td>
                                  <td className="py-2 pr-2 text-center">
                                    {item.receiptUrl ? (
                                      <div className="flex items-center justify-center gap-1.5">
                                        <a
                                          href={item.receiptUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-[11px] text-teal-700 font-semibold hover:underline flex items-center gap-1"
                                        >
                                          <Eye className="w-3 h-3" />
                                          <span className="truncate max-w-[90px]">{item.receiptName || "View Receipt"}</span>
                                        </a>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const items = [...group.items]
                                            items[iIdx].receiptUrl = undefined
                                            items[iIdx].receiptName = undefined
                                            updateClaimGroup(gIdx, { ...group, items })
                                          }}
                                          className="text-red-500 hover:text-red-700"
                                          title="Remove Receipt"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    ) : (
                                      <label className="text-[11px] px-2 py-1 border border-dashed border-slate-300 rounded hover:border-teal-500 hover:text-teal-700 cursor-pointer flex items-center justify-center gap-1 text-slate-500 transition">
                                        {uploadingReceipt === item.id ? (
                                          <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                          <Upload className="w-3 h-3" />
                                        )}
                                        <span>Upload Receipt</span>
                                        <input
                                          type="file"
                                          accept="image/*,application/pdf"
                                          className="hidden"
                                          onChange={(e) => handleUploadReceipt(gIdx, iIdx, e)}
                                        />
                                      </label>
                                    )}
                                  </td>
                                  <td className="py-2 text-right">
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveClaimItem(gIdx, iIdx)}
                                      className="text-slate-300 hover:text-red-500 p-1"
                                      title="Delete Item"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>

                          <button
                            type="button"
                            onClick={() => handleAddClaimItem(gIdx)}
                            className="mt-2 text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Expense Item</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 4: IMPACT & FEEDBACK */}
              {activeTab === "FEEDBACK" && (
                <div className="space-y-4">
                  {/* Feedback auto-sync card */}
                  <div className="bg-teal-50/70 border border-teal-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-teal-700" />
                        <h3 className="text-xs font-bold text-teal-950 uppercase">
                          11. Public Feedback Analytics (Auto-Synced)
                        </h3>
                      </div>
                      <span className="text-[10px] font-bold bg-teal-100 text-teal-800 px-2.5 py-0.5 rounded-full">
                        {feedbackStats?.totalFeedbacks || 0} Responses Received
                      </span>
                    </div>

                    <p className="text-xs text-teal-900 leading-relaxed">
                      Statistics below are automatically synchronized from respondent surveys via the event feedback QR code. The vector donut chart will be rendered directly in the official report.
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-teal-200/60 text-xs">
                      <div className="bg-white p-2.5 rounded-lg border border-teal-100">
                        <span className="text-slate-500 block text-[11px]">Extremely Satisfied</span>
                        <span className="text-base font-bold text-teal-800">
                          {feedbackStats?.satisfactionCounts?.EXTREMELY_SATISFIED || 0}
                        </span>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-teal-100">
                        <span className="text-slate-500 block text-[11px]">Very Satisfied</span>
                        <span className="text-base font-bold text-cyan-800">
                          {feedbackStats?.satisfactionCounts?.VERY_SATISFIED || 0}
                        </span>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-teal-100">
                        <span className="text-slate-500 block text-[11px]">Somewhat Satisfied</span>
                        <span className="text-base font-bold text-amber-800">
                          {feedbackStats?.satisfactionCounts?.SOMEWHAT_SATISFIED || 0}
                        </span>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-teal-100">
                        <span className="text-slate-500 block text-[11px]">Satisfaction Rate</span>
                        <span className="text-base font-black text-emerald-800">
                          {feedbackStats?.satisfactionRate || 99}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Improvements & Reflection */}
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                    <h3 className="text-xs font-bold text-slate-800">
                      12. Review &amp; Future Improvements
                    </h3>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Future Improvements for Organizers (MATRADE / MSN / Secretariat)
                      </label>
                      <textarea
                        rows={2}
                        value={formData.futureImprovementOrg}
                        onChange={(e) => setFormData({ ...formData, futureImprovementOrg: e.target.value })}
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg outline-none bg-white"
                        placeholder="e.g. Issues regarding external contractor passes or delayed storage room handover..."
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Participants' Feedback &amp; Suggestions for Improvement (Internal Booth)
                      </label>
                      <textarea
                        rows={2}
                        value={formData.futureImprovementPart}
                        onChange={(e) => setFormData({ ...formData, futureImprovementPart: e.target.value })}
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg outline-none bg-white"
                        placeholder="e.g. Expand promotional merchandise inventory and increase product sampling stations..."
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          13. Future Consideration
                        </label>
                        <select
                          value={formData.futureConsideration ? "true" : "false"}
                          onChange={(e) => setFormData({ ...formData, futureConsideration: e.target.value === "true" })}
                          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg outline-none bg-white font-semibold"
                        >
                          <option value="true">YES (Recommended for Future Participation)</option>
                          <option value="false">NO (Not Recommended)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          14. Event Success Rate (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={formData.eventSuccessRate}
                          onChange={(e) => setFormData({ ...formData, eventSuccessRate: parseInt(e.target.value) || 99 })}
                          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg outline-none bg-white font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 15: Media Links */}
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-slate-800">
                        15. Media Links &amp; Digital Coverage
                      </h3>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            mediaLinks: [
                              ...formData.mediaLinks,
                              { id: `ml-${Date.now()}`, platform: "TikTok", url: "" },
                            ],
                          })
                        }
                        className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-300 rounded-lg hover:bg-slate-100 flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Link</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      {formData.mediaLinks.map((ml, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <select
                            value={ml.platform}
                            onChange={(e) => {
                              const updated = [...formData.mediaLinks]
                              updated[idx].platform = e.target.value as any
                              setFormData({ ...formData, mediaLinks: updated })
                            }}
                            className="w-32 text-xs px-2 py-1.5 border border-slate-300 rounded-lg bg-white"
                          >
                            <option value="TikTok">TikTok</option>
                            <option value="Facebook">Facebook</option>
                            <option value="Instagram">Instagram</option>
                            <option value="Website">Website</option>
                            <option value="Other">Other</option>
                          </select>
                          <input
                            type="url"
                            placeholder="https://..."
                            value={ml.url}
                            onChange={(e) => {
                              const updated = [...formData.mediaLinks]
                              updated[idx].url = e.target.value
                              setFormData({ ...formData, mediaLinks: updated })
                            }}
                            className="flex-1 text-xs px-3 py-1.5 border border-slate-300 rounded-lg bg-white outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const updated = formData.mediaLinks.filter((_, i) => i !== idx)
                              setFormData({ ...formData, mediaLinks: updated })
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: APPROVAL & DOWNLOAD */}
              {activeTab === "APPROVAL" && (
                <div className="space-y-5">
                  <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50 text-center max-w-xl mx-auto space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center mx-auto shadow-sm">
                      <ShieldCheck className="w-7 h-7" />
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Report Status: <span className="text-teal-700">{formData.status}</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        {formData.status === "APPROVED"
                          ? `This report has been formally reviewed and approved by ${formData.approvedBy || "HOD"}.`
                          : formData.status === "SUBMITTED"
                          ? "This report has been submitted and is awaiting HOD review and sign-off."
                          : "This report is currently in draft status. Complete all sections before submission."}
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                      <a
                        href={`/api/marketing/events/${requisitionId}/report/iso-pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition"
                      >
                        <Download className="w-4 h-4" />
                        <span>Preview / Download PDF</span>
                      </a>

                      {formData.status === "DRAFT" && (
                        <button
                          type="button"
                          onClick={handleSubmitForApproval}
                          disabled={saving}
                          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Submit For Approval</span>
                        </button>
                      )}

                      {formData.status === "SUBMITTED" && (
                        <button
                          type="button"
                          onClick={handleApproveReport}
                          disabled={saving}
                          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          <span>Approve Report (HOD Action)</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span>Total Claims:</span>
            <span className="font-mono font-bold text-slate-800">
              RM {formData.totalClaimAmount.toFixed(2)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition"
            >
              Close
            </button>

            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={saving || loading}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-1.5 shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>Save Draft</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
