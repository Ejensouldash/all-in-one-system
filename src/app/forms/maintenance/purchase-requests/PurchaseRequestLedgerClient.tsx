"use client"

import React, { useState, useMemo } from "react"
import { 
  FileText, Plus, Search, Filter, CheckCircle2, AlertTriangle, 
  Clock, Truck, PackageCheck, AlertCircle, X, Download, Eye, 
  Trash2, Calendar, User, Building, MapPin, Loader2, Camera, 
  Image as ImageIcon, History, Send, Check, ShieldCheck
} from "lucide-react"
import Link from "next/link"
import { SignaturePadClient } from "@/components/ui/SignaturePadClient"
import { 
  createMaintenancePurchaseRequest,
  approveMaintenancePurchaseRequest,
  rejectMaintenancePurchaseRequest,
  updatePrEstimatedDelivery,
  receiveMaintenancePurchaseRequest,
  type CreatePrLineItemInput
} from "@/app/actions/maintenance-pr"

// Canvas-based image compression for instant, lightweight photo uploads (<1MB)
async function compressImageFile(file: File, maxDimension = 1600, quality = 0.82): Promise<File> {
  if (!file.type.startsWith("image/") && !file.name.match(/\.(jpg|jpeg|png|webp|heic|heif)$/i)) {
    return file
  }
  if (file.size < 400 * 1024 && (file.type === "image/jpeg" || file.type === "image/png" || file.type === "image/webp")) {
    return file
  }

  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        let width = img.width
        let height = img.height

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width)
            width = maxDimension
          } else {
            width = Math.round((width * maxDimension) / height)
            height = maxDimension
          }
        }

        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          resolve(file)
          return
        }

        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file)
              return
            }
            const cleanName = file.name.replace(/\.[^/.]+$/, "") + ".jpg"
            const compressed = new File([blob], cleanName, { type: "image/jpeg" })
            resolve(compressed)
          },
          "image/jpeg",
          quality
        )
      }
      img.onerror = () => resolve(file)
      img.src = e.target?.result as string
    }
    reader.onerror = () => resolve(file)
    reader.readAsDataURL(file)
  })
}

interface InventoryCatalogItem {
  id: string
  name: string
  brand?: string | null
  location: string
  quantity: number
  unit: string
  pricePerUnit: number
}

interface Props {
  initialPrs: any[]
  inventoryCatalog: InventoryCatalogItem[]
  userName: string
  userDepartment: string
  canApprovePr: boolean
  isSuperAdmin: boolean
  selectedPrParam?: string
}

export function PurchaseRequestLedgerClient({
  initialPrs,
  inventoryCatalog,
  userName,
  userDepartment,
  canApprovePr,
  isSuperAdmin,
  selectedPrParam,
}: Props) {
  const [prs, setPrs] = useState<any[]>(initialPrs)
  const [searchTerm, setSearchTerm] = useState(selectedPrParam || "")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [successMsg, setSuccessMsg] = useState("")

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedPr, setSelectedPr] = useState<any | null>(() => {
    if (selectedPrParam) {
      return initialPrs.find(p => p.prNumber === selectedPrParam) || null
    }
    return null
  })
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(!!selectedPr)
  const [detailTab, setDetailTab] = useState<"ITEMS" | "LOGS">("ITEMS")

  // Create Form State
  const [company, setCompany] = useState("BUBBLES O2 SDN BHD")
  const [department, setDepartment] = useState(userDepartment || "MAINTENANCE / ENGINEERING")
  const [dateRequired, setDateRequired] = useState("")
  const [requesterSignature, setRequesterSignature] = useState<string | null>(null)
  const [lineItems, setLineItems] = useState<CreatePrLineItemInput[]>([
    { itemRequested: "", brand: "", stockBalance: 0, quantityRequest: 1, projectMachine: "" }
  ])

  // Approval Form State
  const [approvalRemarks, setApprovalRemarks] = useState("")
  const [approverSignature, setApproverSignature] = useState<string | null>(null)

  // Delivery Tracking State (Requirement 1 & 2)
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false)
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState("")
  const [deliveryRemarks, setDeliveryRemarks] = useState("")

  // Receive / Damage Reporting State (Requirement 8 & 9)
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false)
  const [isDamagedChoice, setIsDamagedChoice] = useState(false)
  const [damageReason, setDamageReason] = useState("")
  const [receivePhotoFile, setReceivePhotoFile] = useState<File | null>(null)
  const [receivePhotoPreview, setReceivePhotoPreview] = useState<string | null>(null)
  const [receiverSignature, setReceiverSignature] = useState<string | null>(null)
  const [uploadStatusText, setUploadStatusText] = useState("")

  const triggerMessage = (type: "success" | "error", msg: string) => {
    if (type === "success") {
      setSuccessMsg(msg)
      setErrorMsg("")
    } else {
      setErrorMsg(msg)
      setSuccessMsg("")
    }
    setTimeout(() => {
      setSuccessMsg("")
      setErrorMsg("")
    }, 4000)
  }

  // Filtered PR list
  const filteredPrs = useMemo(() => {
    return prs.filter((p) => {
      const matchesStatus = statusFilter === "ALL" || p.status === statusFilter
      const q = searchTerm.toLowerCase().trim()
      if (!q) return matchesStatus

      const matchesSearch =
        p.prNumber.toLowerCase().includes(q) ||
        p.requesterName.toLowerCase().includes(q) ||
        (p.department && p.department.toLowerCase().includes(q)) ||
        p.items.some((it: any) =>
          it.itemRequested.toLowerCase().includes(q) ||
          (it.brand && it.brand.toLowerCase().includes(q)) ||
          it.projectMachine.toLowerCase().includes(q)
        )

      return matchesStatus && matchesSearch
    })
  }, [prs, statusFilter, searchTerm])

  // KPI Metrics
  const metrics = useMemo(() => {
    return {
      total: prs.length,
      pending: prs.filter((p) => p.status === "PENDING_APPROVAL").length,
      ordered: prs.filter((p) => p.status === "ORDERED" || p.status === "APPROVED").length,
      received: prs.filter((p) => p.status === "RECEIVED").length,
      damaged: prs.filter((p) => p.status === "DAMAGED_OR_WRONG_ITEM").length,
    }
  }, [prs])

  // --- Handlers ---

  const handleAddLineItem = () => {
    setLineItems([
      ...lineItems,
      { itemRequested: "", brand: "", stockBalance: 0, quantityRequest: 1, projectMachine: "" }
    ])
  }

  const handleRemoveLineItem = (index: number) => {
    if (lineItems.length === 1) return
    setLineItems(lineItems.filter((_, i) => i !== index))
  }

  const handleSelectCatalogItem = (index: number, itemId: string) => {
    const found = inventoryCatalog.find(c => c.id === itemId)
    const updated = [...lineItems]
    if (found) {
      updated[index] = {
        ...updated[index],
        itemId: found.id,
        itemRequested: found.name.toUpperCase(),
        brand: (found.brand || "").toUpperCase(),
        stockBalance: found.quantity,
      }
    } else {
      updated[index] = {
        ...updated[index],
        itemId: null,
        stockBalance: 0,
      }
    }
    setLineItems(updated)
  }

  const handleLineItemChange = (index: number, field: keyof CreatePrLineItemInput, value: any) => {
    const updated = [...lineItems]
    if (typeof value === "string" && field !== "itemId") {
      updated[index] = { ...updated[index], [field]: value.toUpperCase() }
    } else {
      updated[index] = { ...updated[index], [field]: value }
    }
    setLineItems(updated)
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!dateRequired) {
      triggerMessage("error", "Please specify the Date Required.")
      return
    }

    if (lineItems.some(it => !it.itemRequested.trim() || it.quantityRequest <= 0)) {
      triggerMessage("error", "Please fill in all item names and ensure quantity is at least 1.")
      return
    }

    setSubmitting(true)
    setErrorMsg("")

    const res = await createMaintenancePurchaseRequest({
      company,
      department,
      dateRequired,
      requesterName: userName,
      requesterDepartment: department,
      requesterSignature,
      items: lineItems,
    })

    setSubmitting(false)

    if (res.success && res.data) {
      triggerMessage("success", `Purchase Requisition ${res.data.prNumber} created successfully!`)
      setPrs([res.data, ...prs])
      setIsCreateModalOpen(false)
      // Reset form
      setDateRequired("")
      setRequesterSignature(null)
      setLineItems([{ itemRequested: "", brand: "", stockBalance: 0, quantityRequest: 1, projectMachine: "" }])
    } else {
      triggerMessage("error", res.error || "Failed to create Purchase Requisition.")
    }
  }

  const handleApprove = async () => {
    if (!selectedPr) return
    setSubmitting(true)
    const res = await approveMaintenancePurchaseRequest(selectedPr.id, {
      remarks: approvalRemarks,
      signature: approverSignature || undefined,
    })
    setSubmitting(false)

    if (res.success && res.data) {
      triggerMessage("success", `Purchase Requisition ${selectedPr.prNumber} approved!`)
      setPrs(prs.map(p => p.id === selectedPr.id ? { ...p, ...res.data } : p))
      setSelectedPr({ ...selectedPr, ...res.data })
      setIsDetailModalOpen(false)
    } else {
      triggerMessage("error", res.error || "Failed to approve PR.")
    }
  }

  const handleReject = async () => {
    if (!selectedPr) return
    const reason = prompt("Please provide a reason for rejecting this PR:")
    if (!reason?.trim()) return

    setSubmitting(true)
    const res = await rejectMaintenancePurchaseRequest(selectedPr.id, reason)
    setSubmitting(false)

    if (res.success && res.data) {
      triggerMessage("success", `Purchase Requisition ${selectedPr.prNumber} rejected.`)
      setPrs(prs.map(p => p.id === selectedPr.id ? { ...p, ...res.data } : p))
      setSelectedPr({ ...selectedPr, ...res.data })
      setIsDetailModalOpen(false)
    } else {
      triggerMessage("error", res.error || "Failed to reject PR.")
    }
  }

  const handleUpdateDeliverySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPr || !estimatedDeliveryDate) {
      triggerMessage("error", "Please provide the estimated delivery date.")
      return
    }

    setSubmitting(true)
    const res = await updatePrEstimatedDelivery(selectedPr.id, {
      estimatedDeliveryDate,
      deliveryRemarks,
    })
    setSubmitting(false)

    if (res.success && res.data) {
      triggerMessage("success", `Delivery date updated! Automated email notification sent to Requester & PIC.`)
      setPrs(prs.map(p => p.id === selectedPr.id ? { ...p, ...res.data } : p))
      setSelectedPr({ ...selectedPr, ...res.data })
      setIsDeliveryModalOpen(false)
    } else {
      triggerMessage("error", res.error || "Failed to update delivery estimate.")
    }
  }

  const handleReceivePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadStatusText("Compressing receipt image...")
    try {
      const compressed = await compressImageFile(file, 1600, 0.82)
      setReceivePhotoFile(compressed)
      setReceivePhotoPreview(URL.createObjectURL(compressed))
    } catch (err) {
      console.error("Photo compression error:", err)
      setReceivePhotoFile(file)
      setReceivePhotoPreview(URL.createObjectURL(file))
    } finally {
      setUploadStatusText("")
    }
  }

  const handleReceiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPr) return
    if (!receivePhotoFile) {
      triggerMessage("error", "A photo of the received goods / defect is required as evidence.")
      return
    }
    if (isDamagedChoice && !damageReason.trim()) {
      triggerMessage("error", "Please describe the discrepancy or damage.")
      return
    }

    setSubmitting(true)
    setUploadStatusText("Uploading evidence photo to Cloudflare R2...")

    const formData = new FormData()
    formData.set("id", selectedPr.id)
    formData.set("receiverName", userName)
    formData.set("receiverDepartment", userDepartment)
    if (receiverSignature) formData.set("receiverSignature", receiverSignature)
    formData.set("isDamaged", isDamagedChoice ? "true" : "false")
    if (damageReason) formData.set("damageReason", damageReason)
    formData.set("photo", receivePhotoFile)

    const res = await receiveMaintenancePurchaseRequest(formData)
    setSubmitting(false)
    setUploadStatusText("")

    if (res.success && res.data) {
      if (res.isDamaged) {
        triggerMessage("success", "Shipment discrepancy reported. Alert email sent to Purchasing & Maintenance Leads.")
      } else {
        triggerMessage("success", "Items successfully received and auto-restocked into FMS Inventory!")
      }
      setPrs(prs.map(p => p.id === selectedPr.id ? { ...p, ...res.data } : p))
      setSelectedPr({ ...selectedPr, ...res.data })
      setIsReceiveModalOpen(false)
      setReceivePhotoFile(null)
      setReceivePhotoPreview(null)
      setReceiverSignature(null)
    } else {
      triggerMessage("error", res.error || "Failed to process receipt.")
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING_APPROVAL":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">Pending Approval</span>
      case "APPROVED":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">Approved</span>
      case "ORDERED":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">In Delivery</span>
      case "RECEIVED":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">Received (Restocked)</span>
      case "DAMAGED_OR_WRONG_ITEM":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-200">Damaged / Wrong Item</span>
      case "REJECTED":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300">Rejected</span>
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">{status}</span>
    }
  }

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {errorMsg && (
        <div className="p-4 bg-red-50 text-red-800 border border-red-200 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-extrabold uppercase tracking-wider">
              Procurement &bull; SOP BOSB-FMS-850-001
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            Purchase Requisitions (PR)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Generate official purchase requests, track estimated supplier arrival dates, verify physical receipt with photos, and restock FMS inventory.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" />
          <span>New Purchase Requisition</span>
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total PRs</div>
          <div className="text-xl font-black text-slate-900 mt-1">{metrics.total}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Pending Approval</div>
          <div className="text-xl font-black text-amber-600 mt-1">{metrics.pending}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">In Delivery</div>
          <div className="text-xl font-black text-purple-600 mt-1">{metrics.ordered}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Received Good</div>
          <div className="text-xl font-black text-emerald-600 mt-1">{metrics.received}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Damaged / Wrong</div>
          <div className="text-xl font-black text-red-600 mt-1">{metrics.damaged}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Status filter pills */}
        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {[
            { id: "ALL", label: "All" },
            { id: "PENDING_APPROVAL", label: "Pending" },
            { id: "APPROVED", label: "Approved" },
            { id: "ORDERED", label: "In Delivery" },
            { id: "RECEIVED", label: "Received" },
            { id: "DAMAGED_OR_WRONG_ITEM", label: "Damaged/Wrong" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === tab.id
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search PR No, item, machine..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800"
          />
        </div>
      </div>

      {/* PR Table Ledger */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs divide-y divide-slate-200">
            <thead className="bg-slate-50 font-bold text-slate-600 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">PR Number</th>
                <th className="py-3 px-4">Date Required</th>
                <th className="py-3 px-4">Requester</th>
                <th className="py-3 px-4">Requested Items</th>
                <th className="py-3 px-4">Est. Delivery</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredPrs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No purchase requisitions found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredPrs.map((pr) => (
                  <tr key={pr.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-700">
                      {pr.prNumber}
                      {pr.ticket && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          Ticket: BO2-MT-{pr.ticket.ticketNumber.toString().padStart(4, "0")}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {new Date(pr.dateRequired).toLocaleDateString("en-GB")}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800">{pr.requesterName}</div>
                      <div className="text-[10px] text-slate-400 uppercase">{pr.department}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800 max-w-xs truncate">
                        {pr.items.map((it: any) => `${it.quantityRequest}x ${it.itemRequested}`).join(", ")}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {pr.items.length} line item(s)
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {pr.estimatedDeliveryDate ? (
                        <div>
                          <div className="font-bold text-purple-700">
                            {new Date(pr.estimatedDeliveryDate).toLocaleDateString("en-GB")}
                          </div>
                          {pr.deliveryRemarks && (
                            <div className="text-[10px] text-slate-500 truncate max-w-xs" title={pr.deliveryRemarks}>
                              {pr.deliveryRemarks}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Not set</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {getStatusBadge(pr.status)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPr(pr)
                            setIsDetailModalOpen(true)
                          }}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-bold text-[11px] inline-flex items-center gap-1 shadow-sm"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>View</span>
                        </button>
                        <a
                          href={`/api/forms/maintenance/purchase-requests/${pr.id}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-blue-600 hover:bg-blue-50 shadow-sm"
                          title="Download Official PDF"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL 1: CREATE PURCHASE REQUISITION --- */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full p-6 sm:p-8 space-y-5 border border-slate-100 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">New Purchase Requisition</h3>
                <p className="text-xs text-slate-500">Official requisition matching template SOP BOSB-FMS-850-001</p>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Company</label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value.toUpperCase())}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    required
                    value={department}
                    onChange={(e) => setDepartment(e.target.value.toUpperCase())}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 text-slate-800 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date Required *</label>
                  <input
                    type="date"
                    required
                    value={dateRequired}
                    onChange={(e) => setDateRequired(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 text-slate-800 font-semibold bg-white"
                  />
                </div>
              </div>

              {/* Line Items Table */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Requested Items (Specifications)</span>
                  <button
                    type="button"
                    onClick={handleAddLineItem}
                    className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 font-bold text-slate-600 uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-2.5 px-3 w-8 text-center">No</th>
                          <th className="py-2.5 px-3">Item Requested (Catalog / Custom)</th>
                          <th className="py-2.5 px-3 w-32">Brand / Mfr</th>
                          <th className="py-2.5 px-3 w-24 text-center">Stock Bal.</th>
                          <th className="py-2.5 px-3 w-20 text-center">Qty *</th>
                          <th className="py-2.5 px-3 w-36">Project / Machine</th>
                          <th className="py-2.5 px-2 w-8"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {lineItems.map((item, index) => (
                          <tr key={index} className="align-top">
                            <td className="py-2.5 px-3 text-center font-bold text-slate-400">
                              {index + 1}
                            </td>
                            <td className="py-2 px-3 space-y-1">
                              {/* Quick picker from inventory */}
                              <select
                                onChange={(e) => handleSelectCatalogItem(index, e.target.value)}
                                className="w-full text-[11px] px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-700"
                              >
                                <option value="">-- Choose from FMS Inventory (Optional) --</option>
                                {inventoryCatalog.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.name} {c.brand ? `[${c.brand}]` : ""} ({c.location} &bull; Bal: {c.quantity} {c.unit})
                                  </option>
                                ))}
                              </select>
                              <input
                                type="text"
                                required
                                value={item.itemRequested}
                                onChange={(e) => handleLineItemChange(index, "itemRequested", e.target.value)}
                                placeholder="ITEM DESCRIPTION & SPECS"
                                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 font-bold text-slate-800 uppercase"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={item.brand || ""}
                                onChange={(e) => handleLineItemChange(index, "brand", e.target.value)}
                                placeholder="E.G. SKF, FESTO"
                                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 uppercase font-semibold text-slate-700"
                              />
                            </td>
                            <td className="py-2 px-3 text-center">
                              <input
                                type="number"
                                min={0}
                                value={item.stockBalance}
                                onChange={(e) => handleLineItemChange(index, "stockBalance", Number(e.target.value))}
                                className="w-full text-center text-xs px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 font-bold text-slate-600"
                              />
                            </td>
                            <td className="py-2 px-3 text-center">
                              <input
                                type="number"
                                min={1}
                                required
                                value={item.quantityRequest}
                                onChange={(e) => handleLineItemChange(index, "quantityRequest", Number(e.target.value))}
                                className="w-full text-center text-xs px-2 py-1.5 rounded-lg border border-slate-200 font-black text-blue-700"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={item.projectMachine}
                                onChange={(e) => handleLineItemChange(index, "projectMachine", e.target.value)}
                                placeholder="E.G. KAR LINE 2"
                                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 uppercase font-semibold text-slate-700"
                              />
                            </td>
                            <td className="py-2 px-2 text-center">
                              {lineItems.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveLineItem(index)}
                                  className="p-1 rounded text-slate-400 hover:text-red-600 transition-colors"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Requester Signature Pad */}
              <div className="space-y-1 pt-2">
                <label className="block text-xs font-bold text-slate-700">Requester Digital Signature</label>
                <div className="border border-slate-200 rounded-2xl p-2 bg-slate-50/50">
                  <SignaturePadClient
                    label="Requester Signature"
                    onSave={(sig) => setRequesterSignature(sig)}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  <span>Submit Purchase Requisition</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: PR DETAIL & WORKFLOW ACTIONS --- */}
      {isDetailModalOpen && selectedPr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full p-6 sm:p-8 space-y-5 border border-slate-100 my-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-black text-blue-700">{selectedPr.prNumber}</span>
                  {getStatusBadge(selectedPr.status)}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Created on {new Date(selectedPr.createdAt).toLocaleDateString("en-GB")} by <strong>{selectedPr.requesterName}</strong> ({selectedPr.department})
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`/api/forms/maintenance/purchase-requests/${selectedPr.id}/pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                >
                  <Download className="h-4 w-4" />
                  <span>Download PDF</span>
                </a>
                <button onClick={() => setIsDetailModalOpen(false)} className="text-slate-400 hover:text-slate-700 p-1">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Quick Action Ribbon */}
            <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
              {/* Approver actions */}
              {selectedPr.status === "PENDING_APPROVAL" && canApprovePr && (
                <>
                  <button
                    onClick={handleApprove}
                    disabled={submitting}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Approve PR</span>
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={submitting}
                    className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5"
                  >
                    <X className="h-4 w-4" />
                    <span>Reject</span>
                  </button>
                </>
              )}

              {/* Set / Update Delivery Date (Requirement 1 & 2) */}
              {(selectedPr.status === "APPROVED" || selectedPr.status === "ORDERED") && (
                <button
                  onClick={() => {
                    setEstimatedDeliveryDate(selectedPr.estimatedDeliveryDate ? selectedPr.estimatedDeliveryDate.substring(0, 10) : "")
                    setDeliveryRemarks(selectedPr.deliveryRemarks || "")
                    setIsDeliveryModalOpen(true)
                  }}
                  className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5"
                >
                  <Truck className="h-4 w-4" />
                  <span>Update Delivery Date &amp; Remarks</span>
                </button>
              )}

              {/* Receive Goods / Report Damage (Requirement 8 & 9) */}
              {(selectedPr.status === "ORDERED" || selectedPr.status === "APPROVED") && (
                <button
                  onClick={() => {
                    setIsDamagedChoice(false)
                    setDamageReason("")
                    setIsReceiveModalOpen(true)
                  }}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5"
                >
                  <PackageCheck className="h-4 w-4" />
                  <span>Receive Goods / Report Discrepancy</span>
                </button>
              )}
            </div>

            {/* Delivery Alert Banner if ETA is set */}
            {selectedPr.estimatedDeliveryDate && (
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl flex items-start gap-3">
                <Truck className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-purple-950">
                    Estimated Delivery: {new Date(selectedPr.estimatedDeliveryDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                  </div>
                  {selectedPr.deliveryRemarks && (
                    <div className="text-[11px] text-purple-800">
                      Remarks: {selectedPr.deliveryRemarks}
                    </div>
                  )}
                  {selectedPr.deliveryUpdatedByName && (
                    <div className="text-[10px] text-purple-600 font-mono">
                      Updated by {selectedPr.deliveryUpdatedByName} on {new Date(selectedPr.deliveryUpdatedAt).toLocaleString("en-GB")}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Discrepancy Alert Banner if damaged */}
            {selectedPr.status === "DAMAGED_OR_WRONG_ITEM" && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="text-xs font-bold text-red-950 uppercase tracking-wide">
                    Shipment Discrepancy / Damage Reported
                  </div>
                  <div className="text-xs text-red-900">
                    {selectedPr.damageReportReason}
                  </div>
                  <div className="text-[10px] text-red-700">
                    Reported by {selectedPr.damageReportedByName} on {new Date(selectedPr.damageReportedAt).toLocaleString("en-GB")}
                  </div>
                  {selectedPr.damageReportPhotoUrl && (
                    <div className="pt-2">
                      <a href={selectedPr.damageReportPhotoUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-red-700 underline inline-flex items-center gap-1">
                        <Camera className="h-3.5 w-3.5" />
                        <span>View Defect Photo Evidence</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Receipt Proof Photo if Received */}
            {selectedPr.status === "RECEIVED" && selectedPr.receivedPhotoUrl && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-emerald-950">Received by {selectedPr.receivedByName}</div>
                    <div className="text-[10px] text-emerald-800">
                      Items successfully restocked into FMS Inventory on {new Date(selectedPr.receivedAt).toLocaleString("en-GB")}
                    </div>
                  </div>
                </div>
                <a
                  href={selectedPr.receivedPhotoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-white border border-emerald-200 text-emerald-800 font-bold text-xs rounded-xl shadow-sm hover:bg-emerald-100 flex items-center gap-1.5"
                >
                  <ImageIcon className="h-4 w-4" />
                  <span>View Proof Photo</span>
                </a>
              </div>
            )}

            {/* Sub-tabs: Line Items vs Activity Logs (Requirement 10) */}
            <div className="border-b border-slate-200 flex gap-4">
              <button
                type="button"
                onClick={() => setDetailTab("ITEMS")}
                className={`pb-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                  detailTab === "ITEMS"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <FileText className="h-4 w-4" />
                <span>Line Items ({selectedPr.items.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setDetailTab("LOGS")}
                className={`pb-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                  detailTab === "LOGS"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <History className="h-4 w-4" />
                <span>Activity &amp; Tracking Log (Requirement 10)</span>
              </button>
            </div>

            {/* TAB CONTENT: ITEMS */}
            {detailTab === "ITEMS" && (
              <div className="space-y-4">
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 font-bold text-slate-600 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3 text-center w-8">No</th>
                        <th className="py-2.5 px-3">Item Requested</th>
                        <th className="py-2.5 px-3">Brand</th>
                        <th className="py-2.5 px-3 text-center">Stock Bal.</th>
                        <th className="py-2.5 px-3 text-center">Qty Request</th>
                        <th className="py-2.5 px-3">Project / Machine</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {selectedPr.items.map((it: any, idx: number) => (
                        <tr key={it.id || idx}>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-800">{it.itemRequested}</td>
                          <td className="py-2.5 px-3 text-slate-600 font-semibold">{it.brand || "-"}</td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-500">{it.stockBalance}</td>
                          <td className="py-2.5 px-3 text-center font-mono font-black text-blue-700">{it.quantityRequest}</td>
                          <td className="py-2.5 px-3 text-slate-700 font-semibold">{it.projectMachine || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Signatures Overview */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="border border-slate-200 rounded-2xl p-3 bg-slate-50/50">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">1. Requester</div>
                    <div className="font-bold text-xs text-slate-900 mt-1">{selectedPr.requesterName}</div>
                    <div className="text-[10px] text-slate-400">{selectedPr.requesterDepartment}</div>
                    {selectedPr.requesterSignature && (
                      <img src={selectedPr.requesterSignature} alt="sig" className="h-10 mt-2 object-contain" />
                    )}
                  </div>
                  <div className="border border-slate-200 rounded-2xl p-3 bg-slate-50/50">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">2. Approval</div>
                    <div className="font-bold text-xs text-slate-900 mt-1">{selectedPr.approvedByName || "Pending"}</div>
                    <div className="text-[10px] text-slate-400">{selectedPr.approverDepartment || "-"}</div>
                    {selectedPr.approverSignature && (
                      <img src={selectedPr.approverSignature} alt="sig" className="h-10 mt-2 object-contain" />
                    )}
                  </div>
                  <div className="border border-slate-200 rounded-2xl p-3 bg-slate-50/50">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">3. Receive</div>
                    <div className="font-bold text-xs text-slate-900 mt-1">{selectedPr.receivedByName || "Pending"}</div>
                    <div className="text-[10px] text-slate-400">{selectedPr.receiverDepartment || "-"}</div>
                    {selectedPr.receiverSignature && (
                      <img src={selectedPr.receiverSignature} alt="sig" className="h-10 mt-2 object-contain" />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: LOGS (Requirement 10) */}
            {detailTab === "LOGS" && (
              <div className="space-y-3">
                <div className="text-xs text-slate-500">
                  Comprehensive audit trail of all lifecycle events for {selectedPr.prNumber}:
                </div>
                <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden bg-white max-h-80 overflow-y-auto">
                  {selectedPr.activityLogs && selectedPr.activityLogs.length > 0 ? (
                    selectedPr.activityLogs.map((log: any) => (
                      <div key={log.id} className="p-3 text-xs flex items-start gap-3 hover:bg-slate-50/50">
                        <div className="p-1.5 rounded-lg bg-blue-50 text-blue-700 shrink-0 mt-0.5 font-mono text-[10px] font-bold">
                          {log.action}
                        </div>
                        <div className="flex-1 space-y-0.5">
                          <div className="text-slate-800 font-medium">{log.details}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            Actor: <strong>{log.actorName}</strong> &bull; {new Date(log.createdAt).toLocaleString("en-GB")}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-slate-400 text-xs">No activity logs recorded.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- MODAL 3: UPDATE ESTIMATED DELIVERY DATE (Requirement 1 & 2) --- */}
      {isDeliveryModalOpen && selectedPr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-100">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">Update Delivery Date &amp; Remarks</h3>
                <p className="text-[11px] text-slate-500">Will automatically notify {selectedPr.requesterName} &amp; Engineering PIC</p>
              </div>
              <button onClick={() => setIsDeliveryModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateDeliverySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Estimated Delivery Date *</label>
                <input
                  type="date"
                  required
                  value={estimatedDeliveryDate}
                  onChange={(e) => setEstimatedDeliveryDate(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Procurement Remarks / Supplier Lead Time</label>
                <textarea
                  rows={3}
                  value={deliveryRemarks}
                  onChange={(e) => setDeliveryRemarks(e.target.value.toUpperCase())}
                  placeholder="E.G. PO SENT TO SUPPLIER SKF; EXPECTED COURIER ARRIVAL BY WEDNESDAY."
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 uppercase font-semibold text-slate-800"
                />
              </div>

              <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-xs text-purple-900 flex items-center gap-2">
                <Send className="h-4 w-4 text-purple-600 shrink-0" />
                <span>An automated email will be dispatched to the requester and logged in the Outbox.</span>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDeliveryModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  <span>Save &amp; Notify</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 4: RECEIVE GOODS OR REPORT DAMAGE (Requirement 8 & 9) --- */}
      {isReceiveModalOpen && selectedPr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-slate-100 my-8">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">Receive Shipment / Report Discrepancy</h3>
                <p className="text-[11px] text-slate-500">Verify received goods for {selectedPr.prNumber}</p>
              </div>
              <button onClick={() => setIsReceiveModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleReceiveSubmit} className="space-y-4">
              {/* Toggle Good vs Damaged */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setIsDamagedChoice(false)}
                  className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                    !isDamagedChoice ? "bg-white text-emerald-800 shadow-sm" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Good Condition</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsDamagedChoice(true)}
                  className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                    isDamagedChoice ? "bg-white text-red-800 shadow-sm" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span>Damaged / Wrong Item</span>
                </button>
              </div>

              {/* Damaged Discrepancy Input */}
              {isDamagedChoice && (
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-red-700">
                    Defect / Wrong Item Description *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={damageReason}
                    onChange={(e) => setDamageReason(e.target.value.toUpperCase())}
                    placeholder="DESCRIBE WHY THE ITEM CANNOT BE ACCEPTED (E.G. WRONG SIZE, DAMAGED CRATE, CRACKED CASING)."
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-red-300 uppercase font-semibold text-red-950 focus:ring-2 focus:ring-red-500"
                  />
                  <p className="text-[10px] text-red-600 font-medium">
                    Defective items will NOT be restocked into usable inventory. An urgent alert email will be sent to Purchasing.
                  </p>
                </div>
              )}

              {/* Photo Evidence Upload (Requirement 9) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  {isDamagedChoice ? "Damage Proof Photo *" : "Received Items Proof Photo *"}
                </label>

                {receivePhotoPreview ? (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200">
                    <img src={receivePhotoPreview} alt="proof" className="w-full h-44 object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setReceivePhotoFile(null)
                        setReceivePhotoPreview(null)
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black text-white rounded-full"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <label className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-3.5 flex items-center justify-center gap-2 cursor-pointer bg-slate-50/70 hover:bg-blue-50/40 transition-all">
                      <Camera className="h-4 w-4 text-blue-600 shrink-0" />
                      <span className="text-xs font-bold text-slate-700">Snap Photo (Camera)</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={handleReceivePhotoChange}
                      />
                    </label>
                    <label className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-3.5 flex items-center justify-center gap-2 cursor-pointer bg-slate-50/70 hover:bg-blue-50/40 transition-all">
                      <ImageIcon className="h-4 w-4 text-slate-600 shrink-0" />
                      <span className="text-xs font-bold text-slate-700">Choose from Gallery</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleReceivePhotoChange}
                      />
                    </label>
                  </div>
                )}
                <p className="text-[10px] text-slate-400 text-center">
                  Auto-compressed for mobile upload &bull; Supports Camera &amp; Gallery
                </p>
              </div>

              {/* Receiver Signature Pad */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Receiver Digital Signature</label>
                <div className="border border-slate-200 rounded-2xl p-2 bg-slate-50/50">
                  <SignaturePadClient
                    label="Receiver Signature"
                    onSave={(sig) => setReceiverSignature(sig)}
                  />
                </div>
              </div>

              {uploadStatusText && (
                <div className="p-3 bg-blue-50 text-blue-800 text-xs font-bold rounded-xl flex items-center gap-2 animate-pulse">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  <span>{uploadStatusText}</span>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsReceiveModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-5 py-2.5 font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5 ${
                    isDamagedChoice
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white"
                  }`}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isDamagedChoice ? (
                    <AlertTriangle className="h-4 w-4" />
                  ) : (
                    <PackageCheck className="h-4 w-4" />
                  )}
                  <span>{isDamagedChoice ? "Submit Discrepancy Report" : "Confirm Receipt & Restock"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
