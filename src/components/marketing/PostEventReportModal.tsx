"use client"

import React, { useState, useEffect, useMemo } from "react"
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
  Wallet,
  Bot,
  Utensils,
  Building,
  Car,
  Package,
  Banknote,
  TrendingUp,
  Info,
} from "lucide-react"
import {
  getPostEventReport,
  savePostEventReport,
  submitPostEventReport,
  approvePostEventReport,
  uploadPostEventFile,
  setEventBudgetCap,
  setEventCategoryBudgets,
  type PostEventReportFormData,
  type VipEntry,
  type PlannedFlowItem,
  type ActivationItem,
  type ActivationImageItem,
  type ClaimantGroup,
  type ClaimItemDetail,
  type MediaLinkItem,
} from "@/app/actions/marketing-post-event-report"
import { runFeedbackSentimentAnalysis } from "@/app/actions/marketing-feedback-ai"
import {
  buildEventScoreBreakdown,
  formatScore,
  round2,
  getScoreMissingRequirements,
  type EventScoreBreakdown,
  type ImpactItem,
  type ImpactItemType,
  type SentimentLabel,
  type BudgetCategoryKey,
  type EventCategoryBudgets,
  type StaffInvolvedEntry,
  BUDGET_CATEGORY_LABELS,
  aggregateClaimsByCategory,
  parseCategoryBudgets,
  getClaimCategoryFormValue,
} from "@/lib/marketing/event-success-rate"
import { EventSuccessScoreCard } from "./EventSuccessScoreCard"

interface PostEventReportModalProps {
  isOpen: boolean
  onClose: () => void
  requisitionId: string
  eventName: string
  currentUserRole?: string
  currentUserName?: string
  canEdit?: boolean
  canSetBudget?: boolean
}

type TabType = "SCOPE" | "FLOW" | "FINANCE" | "FEEDBACK" | "APPROVAL"

interface FeedbackRow {
  id: string
  respondentName: string
  likedMost: string
  likedLeast: string
  comments: string
  satisfaction: string
  wellOrganized: boolean
  aiSentiment: string | null
  aiReason: string | null
  aiConfidence: number | null
  createdAt: string | Date
}

interface FeedbackStats {
  totalFeedbacks: number
  satisfactionCounts: {
    EXTREMELY_SATISFIED: number
    VERY_SATISFIED: number
    SOMEWHAT_SATISFIED: number
    NOT_SO_SATISFIED: number
    NOT_AT_ALL_SATISFIED: number
  }
  satisfactionIndex: number
  positiveRate: number
  satisfactionRate: number
  sentimentCounts: { GOOD: number; NEUTRAL: number; BAD: number }
  aiAnalyzed: number
  feedbacks: FeedbackRow[]
}

const SENTIMENT_STYLES: Record<SentimentLabel, string> = {
  GOOD: "bg-emerald-50 text-emerald-800 border-emerald-200",
  NEUTRAL: "bg-amber-50 text-amber-800 border-amber-200",
  BAD: "bg-rose-50 text-rose-800 border-rose-200",
}

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
  { value: "MEALS", label: "Meals" },
  { value: "ACCOMMODATION", label: "Accommodation" },
  { value: "TRANSPORTATION", label: "Transportation (Fuel / Toll)" },
  { value: "MISCELLANEOUS", label: "Miscellaneous" },
  { value: "PETTY CASH", label: "Petty Cash" },
]

const BUDGET_CATEGORIES_CONFIG: Array<{
  key: BudgetCategoryKey
  label: string
  sublabel: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}> = [
  {
    key: "meals",
    label: "Meals",
    sublabel: "Staff meal allowance",
    icon: Utensils,
    color: "text-amber-700 bg-amber-100/60 border-amber-200",
  },
  {
    key: "accommodation",
    label: "Accommodation",
    sublabel: "Hotel & lodging expenses",
    icon: Building,
    color: "text-blue-700 bg-blue-100/60 border-blue-200",
  },
  {
    key: "transportation",
    label: "Transportation",
    sublabel: "Fuel, toll, parking & mileage",
    icon: Car,
    color: "text-emerald-700 bg-emerald-100/60 border-emerald-200",
  },
  {
    key: "miscellaneous",
    label: "Miscellaneous",
    sublabel: "Booth items, ice & event supplies",
    icon: Package,
    color: "text-purple-700 bg-purple-100/60 border-purple-200",
  },
  {
    key: "pettyCash",
    label: "Petty Cash",
    sublabel: "Emergency on-site cash",
    icon: Banknote,
    color: "text-rose-700 bg-rose-100/60 border-rose-200",
  },
]

export function PostEventReportModal({
  isOpen,
  onClose,
  requisitionId,
  eventName,
  currentUserRole = "STAFF",
  currentUserName = "Staff",
  canEdit = false,
  canSetBudget = false,
}: PostEventReportModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("SCOPE")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingReceipt, setUploadingReceipt] = useState<string | null>(null)
  const [uploadingFlow, setUploadingFlow] = useState(false)
  const [uploadingActivation, setUploadingActivation] = useState(false)
  const [feedbackStats, setFeedbackStats] = useState<FeedbackStats | null>(null)
  const [scoreBreakdown, setScoreBreakdown] = useState<EventScoreBreakdown | null>(null)
  const [scoreLocked, setScoreLocked] = useState(false)
  const [categoryBudgets, setCategoryBudgets] = useState<EventCategoryBudgets>({
    meals: 0,
    accommodation: 0,
    transportation: 0,
    miscellaneous: 0,
    pettyCash: 0,
  })
  const [categoryBudgetInputs, setCategoryBudgetInputs] = useState<Record<BudgetCategoryKey, string>>({
    meals: "",
    accommodation: "",
    transportation: "",
    miscellaneous: "",
    pettyCash: "",
  })
  const [hasBudgetSet, setHasBudgetSet] = useState(false)
  const [budgetMeta, setBudgetMeta] = useState<{ setBy: string | null; setAt: string | null }>({
    setBy: null,
    setAt: null,
  })
  const [savingBudget, setSavingBudget] = useState(false)
  const [analyzingFeedback, setAnalyzingFeedback] = useState(false)
  const [aiMessage, setAiMessage] = useState<string | null>(null)
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
    impactDistribution: [],
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
    eventSuccessRate: 0,
    mediaLinks: [],
    status: "DRAFT",
  })

  // Load report data on open
  useEffect(() => {
    if (!isOpen || !requisitionId) return

    let isMounted = true

    getPostEventReport(requisitionId)
      .then((res) => {
        if (!isMounted) return

        const data = res as unknown as {
          success: boolean
          error?: string
          report?: PostEventReportFormData
          feedbackStats?: FeedbackStats | null
          scoreBreakdown?: EventScoreBreakdown | null
          scoreLocked?: boolean
          requisition?: {
            budgetCap?: number | null
            categoryBudgets?: string | null
            budgetSetBy?: string | null
            budgetSetAt?: string | null
          }
        }

        if (data.success && data.report) {
          setFormData(data.report)
          setFeedbackStats(data.feedbackStats || null)
          setScoreBreakdown(data.scoreBreakdown || null)
          setScoreLocked(Boolean(data.scoreLocked))
          const reqBudgets = parseCategoryBudgets(
            data.requisition?.categoryBudgets,
            data.requisition?.budgetCap
          )
          setCategoryBudgets(reqBudgets)
          setCategoryBudgetInputs({
            meals: reqBudgets.meals > 0 ? String(reqBudgets.meals) : "",
            accommodation: reqBudgets.accommodation > 0 ? String(reqBudgets.accommodation) : "",
            transportation: reqBudgets.transportation > 0 ? String(reqBudgets.transportation) : "",
            miscellaneous: reqBudgets.miscellaneous > 0 ? String(reqBudgets.miscellaneous) : "",
            pettyCash: reqBudgets.pettyCash > 0 ? String(reqBudgets.pettyCash) : "",
          })
          const isSet = Boolean(
            data.requisition?.budgetSetBy ||
              (data.requisition?.budgetCap !== null && data.requisition?.budgetCap !== undefined)
          )
          setHasBudgetSet(isSet)
          setBudgetMeta({
            setBy: data.requisition?.budgetSetBy ?? null,
            setAt: data.requisition?.budgetSetAt ?? null,
          })
        } else {
          setErrorMsg(data.error || "Failed to load post-event report")
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

  const totalApprovedBudget = useMemo(() => {
    return round2(
      (Number(categoryBudgets.meals) || 0) +
        (Number(categoryBudgets.accommodation) || 0) +
        (Number(categoryBudgets.transportation) || 0) +
        (Number(categoryBudgets.miscellaneous) || 0) +
        (Number(categoryBudgets.pettyCash) || 0)
    )
  }, [categoryBudgets])

  const categoryClaims = useMemo(() => {
    return aggregateClaimsByCategory(formData.claimBreakdown)
  }, [formData.claimBreakdown])

  const totalClaimsAmount = useMemo(() => {
    return round2(formData.claimBreakdown.reduce((sum, g) => sum + (g.subtotal || 0), 0))
  }, [formData.claimBreakdown])

  const previewBreakdown = useMemo<EventScoreBreakdown>(() => {
    if (scoreLocked && scoreBreakdown) return scoreBreakdown

    return buildEventScoreBreakdown({
      feedbacks: (feedbackStats?.feedbacks || []).map((row) => ({
        satisfaction: row.satisfaction,
        aiSentiment: row.aiSentiment,
      })),
      budgetCap: totalApprovedBudget,
      categoryBudgets,
      claimBreakdown: formData.claimBreakdown,
      hasBudgetBeenSet: hasBudgetSet,
      impactItems: formData.impactDistribution,
      totalClaimAmount: totalClaimsAmount,
    })
  }, [
    scoreLocked,
    scoreBreakdown,
    feedbackStats,
    totalApprovedBudget,
    categoryBudgets,
    formData.claimBreakdown,
    hasBudgetSet,
    formData.impactDistribution,
    totalClaimsAmount,
  ])

  const missingRequirements = getScoreMissingRequirements(previewBreakdown.flags)
  const aiPending = (feedbackStats?.totalFeedbacks || 0) > (feedbackStats?.aiAnalyzed || 0)
  const impactPreview = previewBreakdown.components.impact
  const budgetPreview = previewBreakdown.components.budget
  const suggestionPreview = previewBreakdown.components.suggestion
  const submissionChecks = [
    {
      label: "At least one public feedback response received",
      ok: (feedbackStats?.totalFeedbacks || 0) > 0,
    },
    {
      label: "All feedback responses analysed by Gemini",
      ok:
        (feedbackStats?.totalFeedbacks || 0) > 0 &&
        (feedbackStats?.aiAnalyzed || 0) >= (feedbackStats?.totalFeedbacks || 0),
    },
    {
      label: "Stock / impact items recorded with quantity given",
      ok: formData.impactDistribution.some((item) => item.qtyGiven > 0),
    },
    {
      label: "Approved category budget allocations set by Finance",
      ok: hasBudgetSet,
    },
  ]

  const updateImpactItem = (index: number, patch: Partial<ImpactItem>) => {
    setFormData((prev) => ({
      ...prev,
      impactDistribution: prev.impactDistribution.map((item, idx) =>
        idx === index ? { ...item, ...patch } : item
      ),
    }))
  }

  const handleAddImpactItem = () => {
    setFormData((prev) => ({
      ...prev,
      impactDistribution: [
        ...prev.impactDistribution,
        { id: `impact-${Date.now()}`, type: "WATER", name: "", unit: "ctn", qtyGiven: 0, qtyUsed: 0 },
      ],
    }))
  }

  const handleRemoveImpactItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      impactDistribution: prev.impactDistribution.filter((_, idx) => idx !== index),
    }))
  }

  const handleCategoryInputChange = (key: BudgetCategoryKey, valStr: string) => {
    setCategoryBudgetInputs((prev) => ({ ...prev, [key]: valStr }))
    const val = Math.max(0, parseFloat(valStr) || 0)
    setCategoryBudgets((prev) => ({ ...prev, [key]: val }))
  }

  const handleSaveBudget = async () => {
    if (!canSetBudget) return

    if (
      scoreLocked &&
      !confirm(
        "This report is already submitted/approved and its success rate is locked. " +
          "Recalculating it with the new budget allocations will update the locked snapshot. Continue?"
      )
    ) {
      return
    }

    setSavingBudget(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      const res = await setEventCategoryBudgets(requisitionId, categoryBudgets)
      if (res.success) {
        setHasBudgetSet(true)
        setBudgetMeta({ setBy: res.budgetSetBy ?? null, setAt: res.budgetSetAt ?? null })
        if ("breakdown" in res && res.breakdown) {
          setScoreBreakdown(res.breakdown)
          setFormData((prev) => ({ ...prev, eventSuccessRate: res.breakdown!.total }))
        }
        setSuccessMsg(
          "wasLocked" in res && res.wasLocked
            ? "Category budget allocations saved. The locked success-rate snapshot was recalculated."
            : "Category budget allocations saved. The success rate was recalculated."
        )
        setTimeout(() => setSuccessMsg(null), 3000)
      } else {
        setErrorMsg(res.error || "Failed to save category budget allocations.")
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error saving category budget allocations.")
    } finally {
      setSavingBudget(false)
    }
  }

  const handleAnalyzeFeedback = async () => {
    if (!feedbackStats?.totalFeedbacks) return

    setAnalyzingFeedback(true)
    setAiMessage(null)
    setErrorMsg(null)

    try {
      const res = await runFeedbackSentimentAnalysis(requisitionId)

      if (res.feedbacks?.length) {
        setFeedbackStats((prev) => {
          if (!prev) return prev

          const updated = prev.feedbacks.map((row) => {
            const match = res.feedbacks.find((item) => item.id === row.id)
            return match
              ? {
                  ...row,
                  aiSentiment: match.aiSentiment,
                  aiReason: match.aiReason,
                  aiConfidence: match.aiConfidence,
                }
              : row
          })

          const sentimentCounts = { GOOD: 0, NEUTRAL: 0, BAD: 0 }
          updated.forEach((row) => {
            if (
              row.aiSentiment === "GOOD" ||
              row.aiSentiment === "NEUTRAL" ||
              row.aiSentiment === "BAD"
            ) {
              sentimentCounts[row.aiSentiment]++
            }
          })

          const aiAnalyzed = sentimentCounts.GOOD + sentimentCounts.NEUTRAL + sentimentCounts.BAD

          return { ...prev, feedbacks: updated, sentimentCounts, aiAnalyzed }
        })
      }

      if (res.breakdown) setScoreBreakdown(res.breakdown)

      if (res.success) {
        setAiMessage(
          `Gemini analysed ${res.analyzed} response(s)` +
            `${res.skipped ? `, ${res.skipped} already up to date` : ""}` +
            `${res.failed ? `, ${res.failed} failed` : ""}.`
        )
      } else {
        setErrorMsg(res.error || "Gemini could not analyse the participant feedback.")
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error analysing participant feedback.")
    } finally {
      setAnalyzingFeedback(false)
    }
  }

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
          category: "MEALS",
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
      category: "MEALS",
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
        if ("breakdown" in res && res.breakdown) setScoreBreakdown(res.breakdown)
        setSuccessMsg("Report draft saved successfully. The success rate was recalculated.")
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
    if (
      !confirm(
        "Submit this report for HOD review and sign-off? The success rate will be frozen as a snapshot."
      )
    )
      return

    setSaving(true)
    setErrorMsg(null)

    try {
      const saveRes = await savePostEventReport(formData)

      if (!saveRes.success) {
        setErrorMsg(saveRes.error || "Failed to save the report before submission.")
        return
      }

      const savedBreakdown = "breakdown" in saveRes ? saveRes.breakdown : null
      if (savedBreakdown) {
        setScoreBreakdown(savedBreakdown)
        const missing = getScoreMissingRequirements(savedBreakdown.flags)
        if (missing.length > 0) {
          setErrorMsg(`Complete the success rate before submitting: ${missing.join(" ")}`)
          setActiveTab("FEEDBACK")
          return
        }
      }

      const res = await submitPostEventReport(requisitionId)
      if (res.success) {
        setFormData({ ...formData, status: "SUBMITTED" })
        setScoreLocked(true)
        setSuccessMsg("Report submitted successfully. The success rate snapshot is now locked.")
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
        setScoreLocked(true)
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
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-teal-600 text-white">
                  {formatScore(previewBreakdown.total)}% success
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
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-xs font-bold text-slate-800">
                          6. Staff &amp; Departments Involved
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Record personnel and select their respective departments supporting event operations.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            staffInvolved: [
                              ...formData.staffInvolved,
                              { name: "", department: "MARKETING" },
                            ],
                          })
                        }}
                        className="px-2.5 py-1 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-lg flex items-center gap-1 transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Staff</span>
                      </button>
                    </div>

                    {formData.staffInvolved.length === 0 ? (
                      <div className="py-6 border-2 border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-xs">
                        No staff members recorded. Click &quot;Add Staff&quot; above to add personnel.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {formData.staffInvolved.map((staff, idx) => {
                          const deptOptions = COMMON_DEPARTMENTS.includes(staff.department)
                            ? COMMON_DEPARTMENTS
                            : [...COMMON_DEPARTMENTS, staff.department].filter(Boolean)

                          return (
                            <div key={idx} className="flex items-center gap-2">
                              <select
                                value={staff.department}
                                onChange={(e) => {
                                  const updated = [...formData.staffInvolved]
                                  updated[idx] = { ...updated[idx], department: e.target.value }
                                  setFormData({ ...formData, staffInvolved: updated })
                                }}
                                className="w-48 sm:w-56 text-xs px-3 py-1.5 border border-slate-300 rounded-lg bg-white outline-none font-semibold text-slate-700 focus:border-teal-500"
                              >
                                {deptOptions.map((dept) => (
                                  <option key={dept} value={dept}>
                                    {dept}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="text"
                                placeholder="Staff Name (e.g. Muhammad Putra / Cik Nana)"
                                value={staff.name}
                                onChange={(e) => {
                                  const updated = [...formData.staffInvolved]
                                  updated[idx] = { ...updated[idx], name: e.target.value }
                                  setFormData({ ...formData, staffInvolved: updated })
                                }}
                                className="flex-1 text-xs px-3 py-1.5 border border-slate-300 rounded-lg bg-white outline-none focus:border-teal-500"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = formData.staffInvolved.filter((_, i) => i !== idx)
                                  setFormData({ ...formData, staffInvolved: updated })
                                }}
                                className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition"
                                title="Remove Staff"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
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
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-700">
                          Expected Impact &amp; Stock Distribution
                        </label>
                        <span className="text-[10px] font-bold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full">
                          20% of success rate
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mb-2">
                        Record the stock allocated to the event and how much was actually distributed. The
                        component scores 20 points when all allocated units are used.
                      </p>

                      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase text-slate-400">
                              <th className="px-2 py-1.5 w-32">Type</th>
                              <th className="px-2 py-1.5">Item</th>
                              <th className="px-2 py-1.5 w-16">Unit</th>
                              <th className="px-2 py-1.5 w-24 text-right">Qty Given</th>
                              <th className="px-2 py-1.5 w-24 text-right">Qty Used</th>
                              <th className="px-2 py-1.5 w-20 text-right">Achieved</th>
                              <th className="px-2 py-1.5 w-8"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {formData.impactDistribution.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="px-2 py-4 text-center text-[11px] text-slate-400">
                                  No stock items recorded yet. Add the items given to this event.
                                </td>
                              </tr>
                            ) : (
                              formData.impactDistribution.map((item, index) => {
                                const rowAchievement =
                                  item.qtyGiven > 0
                                    ? Math.min(100, (item.qtyUsed / item.qtyGiven) * 100)
                                    : 0
                                const overConsumed = item.qtyUsed > item.qtyGiven

                                return (
                                  <tr key={item.id} className={overConsumed ? "bg-rose-50/40" : undefined}>
                                    <td className="px-2 py-1">
                                      <select
                                        value={item.type || "WATER"}
                                        disabled={scoreLocked}
                                        onChange={(e) =>
                                          updateImpactItem(index, {
                                            type: e.target.value as ImpactItemType,
                                          })
                                        }
                                        className="w-full text-xs px-2 py-1 border border-slate-200 rounded outline-none focus:border-teal-500 disabled:bg-slate-50 bg-white font-medium text-slate-700"
                                      >
                                        <option value="WATER">WATER</option>
                                        <option value="MERCHANDISE">MERCHANDISE</option>
                                      </select>
                                    </td>
                                    <td className="px-2 py-1">
                                      <input
                                        type="text"
                                        value={item.name}
                                        disabled={scoreLocked}
                                        onChange={(e) => updateImpactItem(index, { name: e.target.value })}
                                        placeholder="e.g. Bubbles O2 425ml x 24"
                                        className="w-full text-xs px-2 py-1 border border-slate-200 rounded outline-none focus:border-teal-500 disabled:bg-slate-50"
                                      />
                                    </td>
                                    <td className="px-2 py-1">
                                      <input
                                        type="text"
                                        value={item.unit}
                                        disabled={scoreLocked}
                                        onChange={(e) => updateImpactItem(index, { unit: e.target.value })}
                                        placeholder={item.type === "MERCHANDISE" ? "pcs" : "ctn"}
                                        className="w-full text-xs px-2 py-1 border border-slate-200 rounded outline-none focus:border-teal-500 disabled:bg-slate-50"
                                      />
                                    </td>
                                    <td className="px-2 py-1">
                                      <input
                                        type="number"
                                        min="0"
                                        step="any"
                                        value={item.qtyGiven === 0 ? "" : item.qtyGiven}
                                        disabled={scoreLocked}
                                        onChange={(e) => {
                                          const newGiven = Math.max(0, parseFloat(e.target.value) || 0)
                                          updateImpactItem(index, {
                                            qtyGiven: newGiven,
                                            qtyUsed: newGiven > 0 ? Math.min(item.qtyUsed, newGiven) : item.qtyUsed,
                                          })
                                        }}
                                        className="w-full text-xs text-right font-mono px-2 py-1 border border-slate-200 rounded outline-none focus:border-teal-500 disabled:bg-slate-50"
                                      />
                                    </td>
                                    <td className="px-2 py-1">
                                      <input
                                        type="number"
                                        min="0"
                                        max={item.qtyGiven > 0 ? item.qtyGiven : undefined}
                                        step="any"
                                        value={item.qtyUsed === 0 ? "" : item.qtyUsed}
                                        disabled={scoreLocked}
                                        onChange={(e) => {
                                          const val = Math.max(0, parseFloat(e.target.value) || 0)
                                          const capped = item.qtyGiven > 0 ? Math.min(val, item.qtyGiven) : val
                                          updateImpactItem(index, {
                                            qtyUsed: capped,
                                          })
                                        }}
                                        className="w-full text-xs text-right font-mono px-2 py-1 border border-slate-200 rounded outline-none focus:border-teal-500 disabled:bg-slate-50"
                                      />
                                    </td>
                                    <td
                                      className={`px-2 py-1 text-right font-mono font-bold ${
                                        overConsumed ? "text-rose-600" : "text-sky-700"
                                      }`}
                                    >
                                      {item.qtyGiven > 0 ? `${formatScore(rowAchievement)}%` : "—"}
                                    </td>
                                    <td className="px-2 py-1 text-right">
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveImpactItem(index)}
                                        disabled={scoreLocked}
                                        className="text-slate-300 hover:text-red-500 p-1 disabled:opacity-40"
                                        title="Remove item"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                )
                              })
                            )}
                          </tbody>
                        </table>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={handleAddImpactItem}
                          disabled={scoreLocked}
                          className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1 disabled:opacity-50"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Item</span>
                        </button>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600">
                          <span>
                            Water Utilisation:{" "}
                            <b className="font-mono text-slate-800">
                              {formatScore(impactPreview.waterUtilisation ?? 0)}%
                            </b>
                          </span>
                          <span className="text-slate-300">·</span>
                          <span>
                            Merchandise Utilisation
                            {impactPreview.merchandiseCount && impactPreview.merchandiseCount > 0 ? (
                              <span className="text-slate-400 font-normal">
                                {" "}
                                ({impactPreview.merchandiseCount}{" "}
                                {impactPreview.merchandiseCount === 1 ? "type" : "types"} ·{" "}
                                {formatScore(100 / impactPreview.merchandiseCount)}% ea)
                              </span>
                            ) : null}
                            :{" "}
                            <b className="font-mono text-slate-800">
                              {formatScore(impactPreview.merchandiseUtilisation ?? 0)}%
                            </b>
                          </span>
                          <span className="text-slate-300">·</span>
                          <span>
                            Final Score:{" "}
                            <span className="font-bold font-mono text-sky-700">
                              {formatScore(impactPreview.earned)} / 20 pts
                            </span>
                          </span>
                        </div>
                      </div>

                      <details className="mt-2">
                        <summary className="cursor-pointer text-[11px] font-semibold text-slate-500">
                          Distribution notes (optional)
                        </summary>
                        <textarea
                          rows={2}
                          value={formData.expectedImpact}
                          onChange={(e) => setFormData({ ...formData, expectedImpact: e.target.value })}
                          className="mt-1 w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                          placeholder="e.g.&#10;425mlx24 = 1154ctn for 3 days&#10;800mlx12 = 30ctn"
                        />
                      </details>
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

                  {/* Category Budget Allocation (Finance) */}
                  <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                          <Wallet className="w-4 h-4 text-amber-700" />
                          Category Budget Allocation (Finance)
                        </h3>
                        <p className="text-[11px] text-amber-900 mt-0.5">
                          Approved budget allocations across 5 categories. Each category awards up to 20 internal points
                          (100 points total), contributing 15% to the final Event Success Rate.
                        </p>
                      </div>
                      <span className="text-[10px] font-bold text-amber-800 bg-white border border-amber-200 px-2.5 py-0.5 rounded-full shadow-xs">
                        15% of success rate
                      </span>
                    </div>

                    {/* 5 Category Inputs Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                      {BUDGET_CATEGORIES_CONFIG.map((cat) => {
                        const Icon = cat.icon
                        const claimedVal = categoryClaims[cat.key] || 0
                        return (
                          <div
                            key={cat.key}
                            className="bg-white border border-amber-200/90 rounded-xl p-3 shadow-xs space-y-2 flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className={`p-1 rounded-md border ${cat.color}`}>
                                  <Icon className="w-3.5 h-3.5" />
                                </span>
                                <div>
                                  <span className="text-xs font-bold text-slate-800 block leading-tight">
                                    {cat.label}
                                  </span>
                                  <span className="text-[10px] text-slate-400 block leading-tight">
                                    {cat.sublabel}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                                Approved (RM)
                              </label>
                              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus-within:border-amber-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-amber-200 transition">
                                <span className="text-[11px] font-bold text-slate-500">RM</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={categoryBudgetInputs[cat.key]}
                                  disabled={!canSetBudget}
                                  onChange={(e) => handleCategoryInputChange(cat.key, e.target.value)}
                                  placeholder="0.00"
                                  className="w-full text-xs font-mono font-bold text-slate-800 bg-transparent outline-none disabled:text-slate-400"
                                />
                              </div>
                              <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                                <span>Spent:</span>
                                <span className="font-mono font-semibold text-slate-600">
                                  RM {claimedVal.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Total Approved Budget Bar & Save Action */}
                    <div className="bg-gradient-to-r from-amber-100/90 via-amber-50 to-amber-100/70 border border-amber-300/80 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 block">
                          Total Approved Budget (Sum of 5 Categories)
                        </span>
                        <div className="flex items-baseline gap-2 mt-0.5">
                          <span className="text-2xl font-black font-mono text-amber-950">
                            RM {totalApprovedBudget.toFixed(2)}
                          </span>
                          <span className="text-[11px] text-amber-800 font-medium">
                            Total Claims: <b className="font-mono text-amber-950">RM {totalClaimsAmount.toFixed(2)}</b>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleSaveBudget}
                          disabled={!canSetBudget || savingBudget}
                          className="px-4 py-2 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition"
                        >
                          {savingBudget ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          <span>Save Approved Budgets</span>
                        </button>
                      </div>
                    </div>

                    {!hasBudgetSet && (
                      <p className="text-[11px] font-semibold text-rose-700">
                        Category budget allocations not saved yet. The 15% budget performance component stays at 0 and
                        the report cannot be submitted until Finance saves approved budgets.
                      </p>
                    )}

                    {!canSetBudget && (
                      <p className="text-[11px] font-semibold text-rose-700">
                        {canEdit
                          ? "You can edit this report but not the approved budget. Ask a superadmin to grant the Post-Event Budget Cap module."
                          : "Only users granted the Post-Event Budget Cap module can set these budgets. Ask a superadmin for access."}
                      </p>
                    )}

                    {scoreLocked && canSetBudget && (
                      <p className="text-[11px] font-semibold text-amber-800">
                        This report is already {formData.status.toLowerCase()}. Saving new category budgets will
                        recalculate the locked success-rate snapshot and record the revision in the audit log.
                      </p>
                    )}

                    <p className="text-[10px] text-amber-800/80">
                      {budgetMeta.setBy
                        ? `Set by ${budgetMeta.setBy}${
                            budgetMeta.setAt
                              ? ` on ${new Date(budgetMeta.setAt).toLocaleDateString("en-GB", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}`
                              : ""
                          }.`
                        : "No budget allocations recorded yet."}
                      {scoreLocked && !canSetBudget
                        ? " This report is locked; only authorised budget users can revise the allocations."
                        : ""}
                    </p>
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
                                      value={getClaimCategoryFormValue(item.category)}
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

                  {/* Live Budget Performance Summary (15% Weightage) */}
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                          <TrendingUp className="w-4 h-4 text-teal-700" />
                          Live Budget Performance Summary (15% Weightage)
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Live evaluation of actual spending vs. approved budget allocations across 5 categories.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                          Internal: {budgetPreview.totalCategoryScore} / 100 pts
                        </span>
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                          Weighted: {formatScore(budgetPreview.earned)} / 15.0 pts
                        </span>
                      </div>
                    </div>

                    {/* KPI Cards Row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Approved</span>
                        <span className="text-sm font-black font-mono text-slate-800">
                          RM {budgetPreview.totalApproved.toFixed(2)}
                        </span>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Spent</span>
                        <span className="text-sm font-black font-mono text-teal-700">
                          RM {budgetPreview.totalActual.toFixed(2)}
                        </span>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block">Category Score</span>
                        <span className="text-sm font-black font-mono text-indigo-700">
                          {budgetPreview.totalCategoryScore} <span className="text-xs font-normal text-slate-400">/ 100</span>
                        </span>
                      </div>
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                        <span className="text-[10px] font-bold text-amber-800 uppercase block">Final Score (15%)</span>
                        <span className="text-sm font-black font-mono text-amber-900">
                          {formatScore(budgetPreview.earned)} <span className="text-xs font-normal text-amber-700">/ 15.0</span>
                        </span>
                      </div>
                    </div>

                    {/* Detailed Performance Table */}
                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold">
                            <th className="py-2.5 px-3">Category</th>
                            <th className="py-2.5 px-3 text-right">Approved (RM)</th>
                            <th className="py-2.5 px-3 text-right">Actual Spending (RM)</th>
                            <th className="py-2.5 px-3 text-right">Score (Max 20)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {budgetPreview.categoryList.map((cat) => {
                            const config = BUDGET_CATEGORIES_CONFIG.find((c) => c.key === cat.category)
                            const Icon = config?.icon || Wallet
                            const isPettyCash = cat.category === "pettyCash"

                            return (
                              <tr key={cat.category} className="hover:bg-slate-50/50">
                                <td className="py-2.5 px-3 font-semibold text-slate-800">
                                  <div className="flex items-center gap-2">
                                    <span className={`p-1 rounded-md border ${config?.color || "text-slate-600 bg-slate-100 border-slate-200"}`}>
                                      <Icon className="w-3.5 h-3.5" />
                                    </span>
                                    <div>
                                      <span className="font-bold text-slate-800">{cat.label}</span>
                                      {isPettyCash && (
                                        <span className="text-[10px] text-rose-600 font-medium ml-1.5">
                                          (Deduction on usage)
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-700">
                                  RM {cat.approved.toFixed(2)}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                                  RM {cat.actual.toFixed(2)}
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <span
                                    className={`inline-block font-mono font-bold px-2 py-0.5 rounded-md text-xs ${
                                      cat.score === 20
                                        ? "bg-emerald-100 text-emerald-800"
                                        : cat.score >= 15
                                          ? "bg-teal-100 text-teal-800"
                                          : cat.score >= 10
                                            ? "bg-amber-100 text-amber-800"
                                            : cat.score >= 5
                                              ? "bg-orange-100 text-orange-800"
                                              : "bg-rose-100 text-rose-800"
                                    }`}
                                  >
                                    {cat.score} / 20 pts
                                  </span>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-100/80 font-bold border-t border-slate-200 text-slate-800">
                            <td className="py-2.5 px-3">TOTAL</td>
                            <td className="py-2.5 px-3 text-right font-mono">
                              RM {budgetPreview.totalApproved.toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-teal-800">
                              RM {budgetPreview.totalActual.toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <span className="font-mono text-amber-900 font-black">
                                {budgetPreview.totalCategoryScore} / 100 pts
                              </span>
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Scoring Legend & Petty Cash Rule Card */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-[11px] space-y-2">
                      <div className="flex items-center gap-1.5 font-bold text-slate-700 uppercase text-[10px]">
                        <Info className="w-3.5 h-3.5 text-slate-500" />
                        Scoring Legend &amp; Performance Rules (15% Weightage)
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-600">
                        <div className="space-y-1">
                          <span className="font-bold text-slate-700 block">
                            Standard Categories (Meals, Accommodation, Transportation, Miscellaneous):
                          </span>
                          <ul className="space-y-0.5 text-[10px] pl-3 list-disc text-slate-600">
                            <li><b>0% or below (Within Budget):</b> 20 pts (Full)</li>
                            <li><b>&gt; 0% to &lt; 50% over budget:</b> 15 pts</li>
                            <li><b>50% to &lt; 75% over budget:</b> 10 pts</li>
                            <li><b>75% to 100% over budget:</b> 5 pts</li>
                            <li><b>&gt; 100% over budget or unbudgeted:</b> 0 pts</li>
                          </ul>
                        </div>
                        <div className="space-y-1">
                          <span className="font-bold text-slate-700 block">
                            Petty Cash (Emergency Reserve Rule):
                          </span>
                          <p className="text-[10px] leading-relaxed text-slate-600">
                            Zero actual spending maintains the full <b>20 pts</b>. Any actual usage incurs deductions based on Petty Cash Usage %:
                          </p>
                          <ul className="space-y-0.5 text-[10px] pl-3 list-disc text-slate-600">
                            <li><b>RM 0.00 spent:</b> 20 pts</li>
                            <li><b>&gt; 0% to &lt; 50% used:</b> 15 pts</li>
                            <li><b>50% to &lt; 75% used:</b> 10 pts</li>
                            <li><b>75% to 100% used:</b> 5 pts</li>
                            <li><b>&gt; 100% used or unbudgeted:</b> 0 pts</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
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
                      Statistics are automatically synchronized from respondent surveys via the event
                      feedback QR code. The satisfaction index contributes <b>50%</b> of the Event
                      Success Rate (index × 50 points).
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
                        <span className="text-slate-500 block text-[11px]">Satisfaction Index</span>
                        <span className="text-base font-black text-emerald-800">
                          {formatScore(feedbackStats?.satisfactionIndex ?? 0)}/100
                        </span>
                        <span className="block text-[10px] text-slate-400">
                          {formatScore(feedbackStats?.positiveRate ?? 0)}% high satisfaction
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
                        Participants&apos; Feedback &amp; Suggestions for Improvement (Internal Booth)
                      </label>
                      <textarea
                        rows={2}
                        value={formData.futureImprovementPart}
                        onChange={(e) => setFormData({ ...formData, futureImprovementPart: e.target.value })}
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg outline-none bg-white"
                        placeholder="e.g. Expand promotional merchandise inventory and increase product sampling stations..."
                      />
                    </div>

                    {/* Gemini suggestion analysis (15% component) */}
                    <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3 space-y-2">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h4 className="text-xs font-bold text-violet-950 flex items-center gap-1.5">
                            <Bot className="w-4 h-4 text-violet-700" />
                            Participants&apos; Suggestion Analysis (Gemini)
                          </h4>
                          <p className="text-[11px] text-violet-900">
                            Every feedback response is classified GOOD (1), NEUTRAL (0.5) or BAD (0);
                            the average contributes 15% of the success rate.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleAnalyzeFeedback}
                          disabled={
                            analyzingFeedback || scoreLocked || !feedbackStats?.totalFeedbacks
                          }
                          className="px-2.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                          {analyzingFeedback ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5" />
                          )}
                          <span>{feedbackStats?.aiAnalyzed ? "Re-analyse" : "Analyse with Gemini"}</span>
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="font-semibold text-violet-900">
                          {feedbackStats?.aiAnalyzed || 0} / {feedbackStats?.totalFeedbacks || 0} analysed
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full border font-bold ${SENTIMENT_STYLES.GOOD}`}
                        >
                          GOOD {suggestionPreview.good}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full border font-bold ${SENTIMENT_STYLES.NEUTRAL}`}
                        >
                          NEUTRAL {suggestionPreview.neutral}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full border font-bold ${SENTIMENT_STYLES.BAD}`}
                        >
                          BAD {suggestionPreview.bad}
                        </span>
                        <span className="font-bold text-violet-900">
                          {formatScore(suggestionPreview.earned)} / 15 pts
                        </span>
                      </div>

                      {aiPending && !analyzingFeedback && (
                        <p className="text-[11px] font-semibold text-amber-800">
                          {feedbackStats?.aiAnalyzed
                            ? "New feedback responses are waiting to be analysed."
                            : "No responses analysed yet. Run Gemini analysis to unlock this component."}
                        </p>
                      )}

                      {(feedbackStats?.feedbacks.length || 0) > 0 && (
                        <div className="max-h-56 overflow-y-auto divide-y divide-violet-100 rounded-lg border border-violet-200 bg-white">
                          {feedbackStats?.feedbacks.map((fb) => (
                            <div key={fb.id} className="p-2 text-[11px] space-y-1">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="font-bold text-slate-800">{fb.respondentName}</span>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-slate-400">
                                    {fb.satisfaction.replace(/_/g, " ")}
                                  </span>
                                  {fb.aiSentiment === "GOOD" ||
                                  fb.aiSentiment === "NEUTRAL" ||
                                  fb.aiSentiment === "BAD" ? (
                                    <span
                                      className={`px-1.5 py-0.5 rounded border text-[10px] font-black ${SENTIMENT_STYLES[fb.aiSentiment]}`}
                                    >
                                      {fb.aiSentiment}
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-400">
                                      PENDING
                                    </span>
                                  )}
                                </div>
                              </div>
                              <p className="text-slate-600 line-clamp-2">{fb.likedLeast}</p>
                              <p className="text-slate-500 line-clamp-2">{fb.comments}</p>
                              {fb.aiReason && (
                                <p className="text-[10px] italic text-violet-700">AI: {fb.aiReason}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {aiMessage && (
                        <p className="text-[11px] font-semibold text-emerald-700">{aiMessage}</p>
                      )}
                    </div>

                    <div className="pt-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        13. Future Consideration
                      </label>
                      <select
                        value={formData.futureConsideration ? "true" : "false"}
                        onChange={(e) =>
                          setFormData({ ...formData, futureConsideration: e.target.value === "true" })
                        }
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg outline-none bg-white font-semibold"
                      >
                        <option value="true">YES (Recommended for Future Participation)</option>
                        <option value="false">NO (Not Recommended)</option>
                      </select>
                    </div>

                    <div className="pt-2">
                      <EventSuccessScoreCard breakdown={previewBreakdown} />
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
                  <div className="max-w-xl mx-auto w-full space-y-3">
                    <EventSuccessScoreCard breakdown={previewBreakdown} />

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <h3 className="text-xs font-bold text-slate-800 mb-2">
                        Success Rate Completeness
                      </h3>
                      <ul className="space-y-1.5 text-[11px]">
                        {submissionChecks.map((check) => (
                          <li key={check.label} className="flex items-center gap-2">
                            {check.ok ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            ) : (
                              <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            )}
                            <span className={check.ok ? "text-slate-700" : "text-slate-500"}>
                              {check.label}
                            </span>
                          </li>
                        ))}
                      </ul>
                      {missingRequirements.length > 0 && (
                        <p className="mt-2 text-[11px] font-semibold text-amber-800">
                          Submission is blocked until every item above is complete.
                        </p>
                      )}
                    </div>
                  </div>

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
            <span className="text-slate-300">•</span>
            <span>Success Rate:</span>
            <span className="font-mono font-bold text-teal-700">
              {formatScore(previewBreakdown.total)}%
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
