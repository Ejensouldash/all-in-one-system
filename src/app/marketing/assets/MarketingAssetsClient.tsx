"use client"

import React, { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { MarketingNavTabs } from "@/components/marketing/MarketingNavTabs"
import { 
  Layers, Plus, Search, Calendar, Clock, MapPin, 
  User, CheckCircle2, XCircle, AlertTriangle, ArrowRight, 
  Trash2, Edit3, Eye, Filter, RefreshCw, Send, Check, 
  RotateCcw, Info, Sparkles, Building, Phone, FileText,
  Monitor, Sofa, Utensils, AlertCircle, X, ShieldAlert,
  Upload, Image as ImageIcon, QrCode, Camera
} from "lucide-react"
import { 
  addMarketingAsset, 
  editMarketingAsset, 
  deleteMarketingAsset, 
  requestMarketingAssetLoan, 
  approveMarketingAssetLoan, 
  dispatchMarketingAssetLoan, 
  rejectMarketingAssetLoan, 
  returnMarketingAssetLoan,
  uploadMarketingAssetPhotoAction 
} from "@/app/actions/marketing-assets"

type Asset = {
  id: string
  assetCode: string
  name: string
  category: string
  brand?: string | null
  location: string
  totalQuantity: number
  availableQuantity: number
  unit: string
  condition: string
  imageUrl?: string | null
  notes?: string | null
  department?: string | null
  createdAt: Date
  updatedAt: Date
  loans?: Loan[]
}

type Loan = {
  id: string
  loanNumber: string
  assetId: string
  asset: Asset
  quantity: number
  borrowerName: string
  borrowerStaffId?: string | null
  borrowerDepartment?: string | null
  borrowerContact?: string | null
  borrowerEmail?: string | null
  destination: string
  purpose?: string | null
  borrowDateTime: Date | string
  expectedReturn: Date | string
  actualReturn?: Date | string | null
  status: string
  rejectionReason?: string | null
  approvedBy?: string | null
  approvedAt?: Date | string | null
  returnedBy?: string | null
  returnedNotes?: string | null
  conditionOnReturn?: string | null
  remarks?: string | null
  createdAt: Date | string
}

type Props = {
  initialAssets: Asset[]
  initialLoans: Loan[]
  userName: string
  userModules?: string[]
  isSuperAdmin?: boolean
}

const ASSET_CATEGORIES = [
  { id: "ALL", label: "ALL CATEGORIES" },
  { id: "FURNITURE", label: "FURNITURE (TABLES, SOFAS, CHAIRS)" },
  { id: "DISPLAY_TECH", label: "DISPLAY & LED BOARDS" },
  { id: "AUDIO_VISUAL", label: "AUDIO / VISUAL (PA, MICS)" },
  { id: "EVENT_EQUIPMENT", label: "EVENT & CANOPY SETUP" },
  { id: "BOOTH_FIXTURE", label: "BOOTH FIXTURES & COUNTERS" },
  { id: "OTHER", label: "OTHER ASSETS" },
]

/**
 * Automatically compress photos on mobile before upload to prevent network timeouts
 * and payload rejection, converting 15MB camera files into crisp ~500KB JPEG images.
 */
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
      const img = new window.Image()
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

export function MarketingAssetsClient({ 
  initialAssets, 
  initialLoans, 
  userName,
  userModules,
  isSuperAdmin = false,
}: Props) {
  const [assets, setAssets] = useState<Asset[]>(initialAssets)
  const [loans, setLoans] = useState<Loan[]>(initialLoans)
  const [activeTab, setActiveTab] = useState<"REQUESTS" | "TRACKING" | "CATALOG">("REQUESTS")
  
  // Feedback alerts
  const [errorMsg, setErrorMsg] = useState("")
  const [successMsg, setSuccessMsg] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Filters
  const [catalogSearch, setCatalogSearch] = useState("")
  const [catalogCategory, setCatalogCategory] = useState("ALL")
  const [loanStatusFilter, setLoanStatusFilter] = useState("ALL")
  const [trackingSearch, setTrackingSearch] = useState("")

  // --- Modal States ---
  // 1. Add Asset Modal
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false)
  const [assetName, setAssetName] = useState("")
  const [assetCode, setAssetCode] = useState("")
  const [assetCategory, setAssetCategory] = useState("FURNITURE")
  const [assetBrand, setAssetBrand] = useState("")
  const [assetLocation, setAssetLocation] = useState("HQ Store")
  const [assetQty, setAssetQty] = useState(1)
  const [assetUnit, setAssetUnit] = useState("units")
  const [assetCondition, setAssetCondition] = useState("Good")
  const [assetNotes, setAssetNotes] = useState("")
  const [assetPhotoFile, setAssetPhotoFile] = useState<File | null>(null)
  const [assetPhotoPreview, setAssetPhotoPreview] = useState<string | null>(null)

  // 2. Edit Asset Modal
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)
  const [editName, setEditName] = useState("")
  const [editCategory, setEditCategory] = useState("FURNITURE")
  const [editBrand, setEditBrand] = useState("")
  const [editLocation, setEditLocation] = useState("HQ Store")
  const [editQty, setEditQty] = useState(1)
  const [editUnit, setEditUnit] = useState("units")
  const [editCondition, setEditCondition] = useState("Good")
  const [editNotes, setEditNotes] = useState("")
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null)
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null)
  const [editPhotoRemoved, setEditPhotoRemoved] = useState(false)

  // Image Lightbox / Zoom Modal
  const [previewModalPhoto, setPreviewModalPhoto] = useState<{ url: string; title: string; code?: string } | null>(null)

  // 3. New Loan Request Modal
  const [isNewLoanOpen, setIsNewLoanOpen] = useState(false)
  const [loanAssetId, setLoanAssetId] = useState("")
  const [loanQty, setLoanQty] = useState(1)
  const [loanBorrowerName, setLoanBorrowerName] = useState("")
  const [loanBorrowerDept, setLoanBorrowerDept] = useState("")
  const [loanBorrowerContact, setLoanBorrowerContact] = useState("")
  const [loanDestination, setLoanDestination] = useState("")
  const [loanPurpose, setLoanPurpose] = useState("")
  const [loanBorrowDateTime, setLoanBorrowDateTime] = useState("")
  const [loanExpectedReturn, setLoanExpectedReturn] = useState("")
  const [loanRemarks, setLoanRemarks] = useState("")

  // 4. Reject Request Modal
  const [rejectingLoan, setRejectingLoan] = useState<Loan | null>(null)
  const [rejectionReason, setRejectionReason] = useState("")

  // 5. Return Asset Modal
  const [returningLoan, setReturningLoan] = useState<Loan | null>(null)
  const [returnCondition, setReturnCondition] = useState("Good")
  const [returnedByPerson, setReturnedByPerson] = useState("")
  const [returnNotes, setReturnNotes] = useState("")

  // 6. Asset Loan History Modal
  const [historyAsset, setHistoryAsset] = useState<Asset | null>(null)

  // Quick stats calculation
  const totalAssetsCount = assets.reduce((sum, a) => sum + a.totalQuantity, 0)
  const lentAssetsCount = loans
    .filter((l) => l.status === "LENT_OUT" || l.status === "APPROVED")
    .reduce((sum, l) => sum + l.quantity, 0)
  const pendingRequestsCount = loans.filter((l) => l.status === "PENDING").length

  const now = new Date()
  const overdueLoans = loans.filter((l) => {
    if (l.status !== "LENT_OUT" && l.status !== "APPROVED") return false
    return new Date(l.expectedReturn) < now
  })
  const overdueCount = overdueLoans.length

  // Helper for photo upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0]
    if (!rawFile) return
    try {
      const file = await compressImageFile(rawFile)
      setAssetPhotoFile(file)
      setAssetPhotoPreview(URL.createObjectURL(file))
    } catch {
      setAssetPhotoFile(rawFile)
      setAssetPhotoPreview(URL.createObjectURL(rawFile))
    } finally {
      e.target.value = ""
    }
  }

  const handleEditPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0]
    if (!rawFile) return
    try {
      const file = await compressImageFile(rawFile)
      setEditPhotoFile(file)
      setEditPhotoPreview(URL.createObjectURL(file))
      setEditPhotoRemoved(false)
    } catch {
      setEditPhotoFile(rawFile)
      setEditPhotoPreview(URL.createObjectURL(rawFile))
      setEditPhotoRemoved(false)
    } finally {
      e.target.value = ""
    }
  }

  // Handle Add Asset Submit
  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrorMsg("")

    try {
      let imageUrl: string | null = null
      if (assetPhotoFile) {
        const formData = new FormData()
        formData.append("photo", assetPhotoFile)
        const uploadRes = await uploadMarketingAssetPhotoAction(formData)
        if (uploadRes.success && uploadRes.url) {
          imageUrl = uploadRes.url
        }
      }

      const res = await addMarketingAsset({
        assetCode: assetCode.trim() || undefined,
        name: assetName,
        category: assetCategory,
        brand: assetBrand,
        location: assetLocation,
        quantity: assetQty,
        unit: assetUnit,
        condition: assetCondition,
        notes: assetNotes,
        imageUrl,
      })

      if (!res.success) {
        setErrorMsg(res.error || "Failed to add asset.")
      } else {
        setAssets((prev) => [...prev, res.data as any].sort((a, b) => a.name.localeCompare(b.name)))
        setSuccessMsg(`Asset "${res.data?.name}" registered successfully.`)
        setIsAddAssetOpen(false)
        // Reset form
        setAssetName("")
        setAssetCode("")
        setAssetBrand("")
        setAssetQty(1)
        setAssetNotes("")
        setAssetPhotoFile(null)
        setAssetPhotoPreview(null)
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Edit Asset Submit
  const handleEditAsset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingAsset) return
    setIsSubmitting(true)
    setErrorMsg("")

    try {
      let imageUrl: string | null | undefined = undefined
      if (editPhotoFile) {
        const formData = new FormData()
        formData.append("photo", editPhotoFile)
        const uploadRes = await uploadMarketingAssetPhotoAction(formData)
        if (uploadRes.success && uploadRes.url) {
          imageUrl = uploadRes.url
        }
      } else if (editPhotoRemoved) {
        imageUrl = null
      }

      const res = await editMarketingAsset(editingAsset.id, {
        name: editName,
        category: editCategory,
        brand: editBrand,
        location: editLocation,
        totalQuantity: editQty,
        unit: editUnit,
        condition: editCondition,
        notes: editNotes,
        imageUrl,
      })

      if (!res.success) {
        setErrorMsg(res.error || "Failed to update asset.")
      } else {
        setAssets((prev) => prev.map((a) => (a.id === editingAsset.id ? { ...a, ...res.data } : a)))
        setSuccessMsg(`Asset "${res.data?.name}" updated successfully.`)
        setEditingAsset(null)
        setEditPhotoFile(null)
        setEditPhotoPreview(null)
        setEditPhotoRemoved(false)
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Delete Asset
  const handleDeleteAsset = async (asset: Asset) => {
    if (!confirm(`Are you sure you want to remove asset "${asset.name}" (${asset.assetCode})?`)) return
    setErrorMsg("")

    try {
      const res = await deleteMarketingAsset(asset.id)
      if (!res.success) {
        setErrorMsg(res.error || "Failed to delete asset.")
      } else {
        setAssets((prev) => prev.filter((a) => a.id !== asset.id))
        setSuccessMsg(`Asset "${asset.name}" removed successfully.`)
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred while deleting.")
    }
  }

  // Handle Create Loan Request Submit
  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrorMsg("")

    try {
      const res = await requestMarketingAssetLoan({
        assetId: loanAssetId,
        quantity: loanQty,
        borrowerName: loanBorrowerName,
        borrowerDepartment: loanBorrowerDept,
        borrowerContact: loanBorrowerContact,
        destination: loanDestination,
        purpose: loanPurpose,
        borrowDateTime: loanBorrowDateTime,
        expectedReturn: loanExpectedReturn,
        remarks: loanRemarks,
      })

      if (!res.success) {
        setErrorMsg(res.error || "Failed to submit lending request.")
      } else {
        setLoans((prev) => [res.data as any, ...prev])
        setSuccessMsg(`Lending request ${res.data?.loanNumber} submitted successfully. Waiting for marketing approval.`)
        setIsNewLoanOpen(false)
        // Reset form
        setLoanAssetId("")
        setLoanQty(1)
        setLoanBorrowerName("")
        setLoanBorrowerDept("")
        setLoanBorrowerContact("")
        setLoanDestination("")
        setLoanPurpose("")
        setLoanBorrowDateTime("")
        setLoanExpectedReturn("")
        setLoanRemarks("")
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Approve Loan
  const handleApproveLoan = async (loanId: string, dispatchImmediately = false) => {
    setIsSubmitting(true)
    setErrorMsg("")

    try {
      const res = await approveMarketingAssetLoan(loanId, dispatchImmediately)
      if (!res.success) {
        setErrorMsg(res.error || "Failed to approve loan.")
      } else {
        setLoans((prev) => prev.map((l) => (l.id === loanId ? { ...l, ...res.data } : l)))
        // Update local available qty
        const approvedLoan = loans.find((l) => l.id === loanId)
        if (approvedLoan) {
          setAssets((prev) =>
            prev.map((a) =>
              a.id === approvedLoan.assetId
                ? { ...a, availableQuantity: Math.max(0, a.availableQuantity - approvedLoan.quantity) }
                : a
            )
          )
        }
        setSuccessMsg(`Request ${res.data?.loanNumber} approved successfully.`)
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Dispatch / Lent Out
  const handleDispatchLoan = async (loanId: string) => {
    setIsSubmitting(true)
    setErrorMsg("")

    try {
      const res = await dispatchMarketingAssetLoan(loanId)
      if (!res.success) {
        setErrorMsg(res.error || "Failed to dispatch loan.")
      } else {
        setLoans((prev) => prev.map((l) => (l.id === loanId ? { ...l, ...res.data } : l)))
        setSuccessMsg(`Asset marked as Lent Out.`)
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Reject Loan
  const handleRejectLoan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rejectingLoan) return
    setIsSubmitting(true)
    setErrorMsg("")

    try {
      const res = await rejectMarketingAssetLoan(rejectingLoan.id, rejectionReason)
      if (!res.success) {
        setErrorMsg(res.error || "Failed to reject loan.")
      } else {
        setLoans((prev) => prev.map((l) => (l.id === rejectingLoan.id ? { ...l, ...res.data } : l)))
        setSuccessMsg(`Request ${rejectingLoan.loanNumber} rejected.`)
        setRejectingLoan(null)
        setRejectionReason("")
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Return Loan
  const handleReturnLoan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!returningLoan) return
    setIsSubmitting(true)
    setErrorMsg("")

    try {
      const res = await returnMarketingAssetLoan(returningLoan.id, {
        returnedBy: returnedByPerson || returningLoan.borrowerName,
        conditionOnReturn: returnCondition,
        returnedNotes: returnNotes,
      })

      if (!res.success) {
        setErrorMsg(res.error || "Failed to mark as returned.")
      } else {
        setLoans((prev) => prev.map((l) => (l.id === returningLoan.id ? { ...l, ...res.data } : l)))
        // Restock asset locally
        setAssets((prev) =>
          prev.map((a) =>
            a.id === returningLoan.assetId
              ? {
                  ...a,
                  availableQuantity: Math.min(a.totalQuantity, a.availableQuantity + returningLoan.quantity),
                  condition: returnCondition,
                }
              : a
          )
        )
        setSuccessMsg(`Asset returned and checked in successfully.`)
        setReturningLoan(null)
        setReturnedByPerson("")
        setReturnNotes("")
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filtered lists
  const filteredCatalog = assets.filter((asset) => {
    const matchesCat = catalogCategory === "ALL" || asset.category === catalogCategory
    const matchesSearch =
      asset.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      asset.assetCode.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      (asset.brand && asset.brand.toLowerCase().includes(catalogSearch.toLowerCase()))
    return matchesCat && matchesSearch
  })

  const filteredLoans = loans.filter((loan) => {
    if (loanStatusFilter === "ALL") return true
    if (loanStatusFilter === "OVERDUE") {
      return (loan.status === "LENT_OUT" || loan.status === "APPROVED") && new Date(loan.expectedReturn) < now
    }
    return loan.status === loanStatusFilter
  })

  const activeTrackingLoans = loans.filter((loan) => {
    const isActive = loan.status === "LENT_OUT" || loan.status === "APPROVED"
    if (!isActive) return false
    const matchesSearch =
      loan.destination.toLowerCase().includes(trackingSearch.toLowerCase()) ||
      loan.borrowerName.toLowerCase().includes(trackingSearch.toLowerCase()) ||
      (loan.asset?.name && loan.asset.name.toLowerCase().includes(trackingSearch.toLowerCase()))
    return matchesSearch
  })

  return (
    <div className="bg-slate-50 min-h-screen pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* Nav Header Tabs */}
        <MarketingNavTabs userModules={userModules} isSuperAdmin={isSuperAdmin} />

        {/* Global Toasts */}
        {errorMsg && (
          <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center justify-between shadow-sm animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg("")} className="p-1 hover:bg-red-100 rounded">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between shadow-sm animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg("")} className="p-1 hover:bg-emerald-100 rounded">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Page Title & Main Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-black uppercase tracking-wider mb-2">
              <Layers className="w-3.5 h-3.5" />
              Marketing Asset Control
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              MARKETING ASSETS MANAGEMENT
            </h1>
            <p className="text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wide mt-1">
              TRACK LENT ASSETS (LED BOARDS, TABLES, SOFAS, CHAIRS), APPROVE LENDING REQUESTS &amp; LOG RETURNS
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/marketing/assets/qr"
              className="py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-black uppercase tracking-wider transition flex items-center gap-2 shadow-xs cursor-pointer"
              title="Print Marketing Requisition QR Poster for Department Offices"
            >
              <QrCode className="w-4 h-4 text-blue-600" />
              Print QR Poster
            </Link>
            <button
              onClick={() => setIsNewLoanOpen(true)}
              className="py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider transition flex items-center gap-2 shadow-sm"
            >
              <Send className="w-4 h-4" />
              Request Asset Loan
            </button>
            <button
              onClick={() => setIsAddAssetOpen(true)}
              className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider transition flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Register Asset
            </button>
          </div>
        </div>

        {/* 4 Key Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">
                TOTAL ASSET UNITS
              </span>
              <span className="text-3xl font-black text-slate-900 mt-1 block">
                {totalAssetsCount}
              </span>
              <span className="text-[10px] font-bold text-slate-500 mt-0.5 block">
                {assets.length} unique asset types
              </span>
            </div>
            <div className="h-11 w-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">
                CURRENTLY LENT OUT
              </span>
              <span className="text-3xl font-black text-amber-600 mt-1 block">
                {lentAssetsCount}
              </span>
              <span className="text-[10px] font-bold text-slate-500 mt-0.5 block">
                In use at events &amp; venues
              </span>
            </div>
            <div className="h-11 w-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">
                PENDING APPROVAL
              </span>
              <span className={`text-3xl font-black mt-1 block ${pendingRequestsCount > 0 ? "text-indigo-600" : "text-slate-900"}`}>
                {pendingRequestsCount}
              </span>
              <span className="text-[10px] font-bold text-slate-500 mt-0.5 block">
                Waiting for marketing approval
              </span>
            </div>
            <div className="h-11 w-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">
                OVERDUE RETURNS
              </span>
              <span className={`text-3xl font-black mt-1 block ${overdueCount > 0 ? "text-rose-600" : "text-slate-900"}`}>
                {overdueCount}
              </span>
              <span className="text-[10px] font-bold text-slate-500 mt-0.5 block">
                Past scheduled return date
              </span>
            </div>
            <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${overdueCount > 0 ? "bg-rose-50 text-rose-600 animate-pulse" : "bg-slate-100 text-slate-400"}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Section View Tabs */}
        <div className="bg-white rounded-2xl border border-slate-200 p-2 mb-6 flex gap-2 overflow-x-auto shadow-sm">
          <button
            onClick={() => setActiveTab("REQUESTS")}
            className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              activeTab === "REQUESTS"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Clock className="w-4 h-4" />
            Lending Requests &amp; Approvals
            {pendingRequestsCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                {pendingRequestsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("TRACKING")}
            className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              activeTab === "TRACKING"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <MapPin className="w-4 h-4" />
            Live Asset Tracking (Where Items Go)
            {lentAssetsCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-blue-500 text-white text-[10px] font-bold">
                {lentAssetsCount} units
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("CATALOG")}
            className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              activeTab === "CATALOG"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Layers className="w-4 h-4" />
            Asset Catalog (Lent Items Master)
          </button>
        </div>

        {/* TAB 1: LENDING REQUESTS & APPROVALS */}
        {activeTab === "REQUESTS" && (
          <div className="space-y-4">
            {/* Filter pills */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2 overflow-x-auto">
                {["ALL", "PENDING", "APPROVED", "LENT_OUT", "RETURNED", "OVERDUE", "REJECTED"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setLoanStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-colors ${
                      loanStatusFilter === st
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {st === "ALL" ? "ALL REQUESTS" : st.replace("_", " ")}
                  </button>
                ))}
              </div>

              <span className="text-xs font-bold text-slate-400">
                Showing {filteredLoans.length} request(s)
              </span>
            </div>

            {/* Requests Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-black uppercase tracking-wider text-slate-500">
                      <th className="py-3.5 px-4">LOAN NO / DATE</th>
                      <th className="py-3.5 px-4">ASSET ITEM</th>
                      <th className="py-3.5 px-4">BORROWER</th>
                      <th className="py-3.5 px-4">WHERE BROUGHT TO (DESTINATION)</th>
                      <th className="py-3.5 px-4">LENDING PERIOD</th>
                      <th className="py-3.5 px-4">STATUS</th>
                      <th className="py-3.5 px-4 text-right">MARKETING ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredLoans.map((loan) => {
                      const isPastDue =
                        (loan.status === "LENT_OUT" || loan.status === "APPROVED") &&
                        new Date(loan.expectedReturn) < now

                      return (
                        <tr key={loan.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-4 px-4 font-mono font-bold text-slate-900">
                            <div>{loan.loanNumber}</div>
                            <span className="text-[10px] font-normal text-slate-400 font-sans">
                              {new Date(loan.createdAt).toLocaleDateString("en-MY")}
                            </span>
                          </td>

                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2.5">
                              {loan.asset?.imageUrl ? (
                                <button
                                  type="button"
                                  onClick={() => setPreviewModalPhoto({ url: loan.asset.imageUrl!, title: loan.asset.name, code: loan.asset.assetCode })}
                                  className="group relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white hover:ring-2 hover:ring-blue-500 transition cursor-pointer"
                                  title="Click to zoom image"
                                >
                                  <img
                                    src={loan.asset.imageUrl}
                                    alt={loan.asset.name}
                                    className="h-full w-full object-cover transition-transform group-hover:scale-110"
                                  />
                                </button>
                              ) : (
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-slate-400">
                                  <ImageIcon className="h-4 w-4" />
                                </div>
                              )}
                              <div>
                                <span className="font-black text-slate-800 block">
                                  {loan.asset?.name || "Asset"}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400">
                                  Qty: {loan.quantity} {loan.asset?.unit || "units"} • {loan.asset?.category}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-4">
                            <span className="font-bold text-slate-800 block">
                              {loan.borrowerName} {loan.borrowerStaffId && <span className="text-[10px] text-slate-400 font-mono font-normal">({loan.borrowerStaffId})</span>}
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              {loan.borrowerDepartment || "Staff"} {loan.borrowerContact && `• ${loan.borrowerContact}`}
                            </span>
                          </td>

                          <td className="py-4 px-4">
                            <div className="flex items-start gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-bold text-slate-900 block">
                                  {loan.destination}
                                </span>
                                {loan.purpose && (
                                  <span className="text-[10px] text-slate-400 block">
                                    {loan.purpose}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-4">
                            <div className="space-y-0.5 text-[11px]">
                              <div className="text-slate-600">
                                <span className="font-bold text-slate-400">Out:</span> {new Date(loan.borrowDateTime).toLocaleString("en-MY", { dateStyle: "short", timeStyle: "short" })}
                              </div>
                              <div className={isPastDue ? "text-rose-600 font-bold" : "text-slate-600"}>
                                <span className="font-bold text-slate-400">Return:</span> {new Date(loan.expectedReturn).toLocaleString("en-MY", { dateStyle: "short", timeStyle: "short" })}
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-4">
                            {loan.status === "PENDING" && (
                              <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Pending Approval
                              </span>
                            )}
                            {loan.status === "APPROVED" && (
                              <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1">
                                <Check className="w-3 h-3" /> Approved (Ready)
                              </span>
                            )}
                            {loan.status === "LENT_OUT" && !isPastDue && (
                              <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1">
                                <ArrowRight className="w-3 h-3" /> Lent Out
                              </span>
                            )}
                            {loan.status === "LENT_OUT" && isPastDue && (
                              <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 animate-pulse">
                                <AlertTriangle className="w-3 h-3" /> Overdue
                              </span>
                            )}
                            {loan.status === "RETURNED" && (
                              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Returned
                              </span>
                            )}
                            {loan.status === "REJECTED" && (
                              <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1">
                                <XCircle className="w-3 h-3" /> Rejected
                              </span>
                            )}
                          </td>

                          <td className="py-4 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Pending Approval Actions */}
                              {loan.status === "PENDING" && (
                                <>
                                  <button
                                    onClick={() => handleApproveLoan(loan.id, false)}
                                    disabled={isSubmitting}
                                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs transition"
                                    title="Approve Lending Request"
                                  >
                                    <Check className="w-3.5 h-3.5" /> Approve
                                  </button>
                                  <button
                                    onClick={() => {
                                      setRejectingLoan(loan)
                                      setRejectionReason("")
                                    }}
                                    disabled={isSubmitting}
                                    className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold flex items-center gap-1 transition"
                                    title="Reject Request"
                                  >
                                    <X className="w-3.5 h-3.5" /> Reject
                                  </button>
                                </>
                              )}

                              {/* Approved -> Mark Lent Out */}
                              {loan.status === "APPROVED" && (
                                <button
                                  onClick={() => handleDispatchLoan(loan.id)}
                                  disabled={isSubmitting}
                                  className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs transition"
                                >
                                  <ArrowRight className="w-3.5 h-3.5" /> Mark Lent Out
                                </button>
                              )}

                              {/* Lent Out -> Mark Returned */}
                              {(loan.status === "LENT_OUT" || loan.status === "APPROVED") && (
                                <button
                                  onClick={() => {
                                    setReturningLoan(loan)
                                    setReturnedByPerson(loan.borrowerName)
                                    setReturnCondition(loan.asset?.condition || "Good")
                                    setReturnNotes("")
                                  }}
                                  disabled={isSubmitting}
                                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs transition"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" /> Mark Returned
                                </button>
                              )}

                              {loan.status === "REJECTED" && loan.rejectionReason && (
                                <span className="text-[10px] text-red-500 italic max-w-xs truncate" title={loan.rejectionReason}>
                                  Reason: {loan.rejectionReason}
                                </span>
                              )}

                              {loan.status === "RETURNED" && (
                                <span className="text-[10px] text-emerald-600 font-medium">
                                  Checked in on {loan.actualReturn ? new Date(loan.actualReturn).toLocaleDateString("en-MY") : "Yes"}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {filteredLoans.length === 0 && (
                <div className="p-12 text-center">
                  <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-600">No lending requests found</p>
                  <p className="text-xs text-slate-400 mt-0.5">Use the "Request Asset Loan" button to submit a request.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: LIVE ASSET TRACKING (WHERE ITEMS GO) */}
        {activeTab === "TRACKING" && (
          <div className="space-y-4">
            {/* Search destination */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter by destination, venue, borrower, or asset name..."
                  value={trackingSearch}
                  onChange={(e) => setTrackingSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="text-xs font-bold text-slate-500 whitespace-nowrap">
                {activeTrackingLoans.length} Active Lent Out / Approved
              </div>
            </div>

            {/* Tracking Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeTrackingLoans.map((loan) => {
                const isPastDue = new Date(loan.expectedReturn) < now

                return (
                  <div
                    key={loan.id}
                    className={`bg-white rounded-2xl border p-5 shadow-sm transition hover:shadow-md flex flex-col justify-between ${
                      isPastDue ? "border-rose-300 ring-1 ring-rose-200" : "border-slate-200/80"
                    }`}
                  >
                    <div>
                      {/* Destination Header */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-1.5 text-blue-700">
                          <MapPin className="w-4 h-4 shrink-0" />
                          <span className="text-xs font-black uppercase tracking-wider">
                            {loan.destination}
                          </span>
                        </div>
                        {isPastDue ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black uppercase animate-pulse">
                            Overdue
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase">
                            On-Site
                          </span>
                        )}
                      </div>

                      {/* Asset Info with Photo */}
                      <div className="flex items-center gap-3 mb-3">
                        {loan.asset?.imageUrl ? (
                          <button
                            type="button"
                            onClick={() => setPreviewModalPhoto({ url: loan.asset.imageUrl!, title: loan.asset.name, code: loan.asset.assetCode })}
                            className="group relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white hover:ring-2 hover:ring-blue-500 transition cursor-pointer"
                            title="Click to zoom image"
                          >
                            <img
                              src={loan.asset.imageUrl}
                              alt={loan.asset.name}
                              className="h-full w-full object-cover transition-transform group-hover:scale-110"
                            />
                          </button>
                        ) : (
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-400">
                            <ImageIcon className="h-5 w-5" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base font-black text-slate-900 truncate">
                            {loan.asset?.name}
                          </h3>
                          <div className="text-xs font-bold text-slate-500">
                            Qty Lent: <span className="text-slate-900 font-black">{loan.quantity} {loan.asset?.unit}</span> • Ref: {loan.loanNumber}
                          </div>
                        </div>
                      </div>

                      {/* Key details */}
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2 mb-4 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 font-bold uppercase text-[10px]">Borrower:</span>
                          <span className="font-bold text-slate-800">{loan.borrowerName} ({loan.borrowerDepartment || "Staff"})</span>
                        </div>
                        {loan.borrowerContact && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 font-bold uppercase text-[10px]">Contact:</span>
                            <span className="font-mono text-slate-700">{loan.borrowerContact}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 font-bold uppercase text-[10px]">Lent Out On:</span>
                          <span className="text-slate-700 font-medium">
                            {new Date(loan.borrowDateTime).toLocaleString("en-MY", { dateStyle: "short", timeStyle: "short" })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 font-bold uppercase text-[10px]">Due Return:</span>
                          <span className={`font-bold ${isPastDue ? "text-rose-600" : "text-slate-800"}`}>
                            {new Date(loan.expectedReturn).toLocaleString("en-MY", { dateStyle: "short", timeStyle: "short" })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action */}
                    <button
                      onClick={() => {
                        setReturningLoan(loan)
                        setReturnedByPerson(loan.borrowerName)
                        setReturnCondition(loan.asset?.condition || "Good")
                        setReturnNotes("")
                      }}
                      className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-blue-600 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Check-in / Mark as Returned
                    </button>
                  </div>
                )
              })}
            </div>

            {activeTrackingLoans.length === 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-700">All marketing assets are safely in HQ Store!</h3>
                <p className="text-xs text-slate-400 mt-1">There are no assets currently lent out or in the field.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ASSET CATALOG (LENT ITEMS MASTER) */}
        {activeTab === "CATALOG" && (
          <div className="space-y-4">
            {/* Search & Category Filter */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search marketing assets by name, code, brand..."
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {ASSET_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCatalogCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-colors ${
                      catalogCategory === cat.id
                        ? "bg-slate-900 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Catalog Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-black uppercase tracking-wider text-slate-500">
                      <th className="py-3.5 px-4">ASSET CODE</th>
                      <th className="py-3.5 px-4">ITEM NAME</th>
                      <th className="py-3.5 px-4">CATEGORY</th>
                      <th className="py-3.5 px-4">LOCATION</th>
                      <th className="py-3.5 px-4">AVAILABILITY (AVAILABLE / TOTAL)</th>
                      <th className="py-3.5 px-4">CONDITION</th>
                      <th className="py-3.5 px-4 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredCatalog.map((asset) => {
                      const lentOut = asset.totalQuantity - asset.availableQuantity

                      return (
                        <tr key={asset.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-4 px-4 font-mono font-bold text-blue-700">
                            {asset.assetCode}
                          </td>

                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              {asset.imageUrl ? (
                                <button
                                  type="button"
                                  onClick={() => setPreviewModalPhoto({ url: asset.imageUrl!, title: asset.name, code: asset.assetCode })}
                                  className="group relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white hover:ring-2 hover:ring-blue-500 transition cursor-pointer"
                                  title="Click to zoom image"
                                >
                                  <img
                                    src={asset.imageUrl}
                                    alt={asset.name}
                                    className="h-full w-full object-cover transition-transform group-hover:scale-110"
                                  />
                                </button>
                              ) : (
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-400">
                                  <ImageIcon className="h-5 w-5" />
                                </div>
                              )}
                              <div>
                                <span className="font-black text-slate-900 block text-sm">
                                  {asset.name}
                                </span>
                                {asset.brand && (
                                  <span className="text-[10px] text-slate-400 block">
                                    Brand: {asset.brand}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-4">
                            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-wide">
                              {asset.category}
                            </span>
                          </td>

                          <td className="py-4 px-4 font-medium text-slate-600">
                            {asset.location}
                          </td>

                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-slate-900 text-sm">
                                {asset.availableQuantity} / {asset.totalQuantity} {asset.unit}
                              </span>
                              {lentOut > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold">
                                  {lentOut} lent
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-4 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              asset.condition === "Good" 
                                ? "bg-emerald-50 text-emerald-700" 
                                : asset.condition === "Fair"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-red-50 text-red-700"
                            }`}>
                              {asset.condition}
                            </span>
                          </td>

                          <td className="py-4 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Request loan shortcut */}
                              <button
                                onClick={() => {
                                  setLoanAssetId(asset.id)
                                  setIsNewLoanOpen(true)
                                }}
                                disabled={asset.availableQuantity === 0}
                                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition ${
                                  asset.availableQuantity > 0
                                    ? "bg-blue-50 hover:bg-blue-100 text-blue-700"
                                    : "bg-slate-100 text-slate-400 cursor-not-allowed"
                                }`}
                                title="Borrow this asset"
                              >
                                <Send className="w-3.5 h-3.5" /> Lend
                              </button>

                              {/* Edit Master */}
                              <button
                                onClick={() => {
                                  setEditingAsset(asset)
                                  setEditName(asset.name)
                                  setEditCategory(asset.category)
                                  setEditBrand(asset.brand || "")
                                  setEditLocation(asset.location)
                                  setEditQty(asset.totalQuantity)
                                  setEditUnit(asset.unit)
                                  setEditCondition(asset.condition)
                                  setEditNotes(asset.notes || "")
                                  setEditPhotoFile(null)
                                  setEditPhotoPreview(null)
                                  setEditPhotoRemoved(false)
                                }}
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition"
                                title="Edit Asset Master"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>

                              {/* Remove Asset */}
                              <button
                                onClick={() => handleDeleteAsset(asset)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                title="Delete Asset"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {filteredCatalog.length === 0 && (
                <div className="p-12 text-center">
                  <Layers className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-600">No assets found</p>
                  <p className="text-xs text-slate-400 mt-0.5">Click "Register Asset" to add new equipment.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL 1: ADD NEW ASSET */}
        {isAddAssetOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Register Marketing Asset</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Add equipment to lend (e.g. LED Board, table, sofa, chairs)</p>
                </div>
                <button onClick={() => setIsAddAssetOpen(false)} className="p-2 text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddAsset} className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Asset Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. LED Display Board 65', Executive Sofa"
                    value={assetName}
                    onChange={(e) => setAssetName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Asset Code</label>
                    <input
                      type="text"
                      placeholder="Auto-generated if empty"
                      value={assetCode}
                      onChange={(e) => setAssetCode(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Category *</label>
                    <select
                      value={assetCategory}
                      onChange={(e) => setAssetCategory(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    >
                      <option value="FURNITURE">FURNITURE (TABLE, SOFA, CHAIR)</option>
                      <option value="DISPLAY_TECH">DISPLAY & LED BOARDS</option>
                      <option value="AUDIO_VISUAL">AUDIO / VISUAL</option>
                      <option value="EVENT_EQUIPMENT">EVENT & CANOPY SETUP</option>
                      <option value="BOOTH_FIXTURE">BOOTH FIXTURE & COUNTER</option>
                      <option value="OTHER">OTHER</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Total Quantity *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={assetQty}
                      onChange={(e) => setAssetQty(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Unit</label>
                    <input
                      type="text"
                      value={assetUnit}
                      onChange={(e) => setAssetUnit(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Brand / Model</label>
                    <input
                      type="text"
                      placeholder="e.g. Samsung, Lifetime"
                      value={assetBrand}
                      onChange={(e) => setAssetBrand(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Condition</label>
                    <select
                      value={assetCondition}
                      onChange={(e) => setAssetCondition(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    >
                      <option value="Good">Good</option>
                      <option value="Fair">Fair</option>
                      <option value="Damaged">Damaged</option>
                      <option value="Under Repair">Under Repair</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Storage Location</label>
                  <input
                    type="text"
                    value={assetLocation}
                    onChange={(e) => setAssetLocation(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Asset Image (Optional)</label>
                  <div className="rounded-2xl border border-dashed border-slate-300 p-3 bg-slate-50/50 space-y-2.5">
                    {assetPhotoPreview && (
                      <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200">
                        <img
                          src={assetPhotoPreview}
                          alt="Preview"
                          className="h-14 w-14 shrink-0 rounded-lg border border-slate-200 object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{assetPhotoFile?.name || "Selected photo"}</p>
                          <p className="text-[10px] text-emerald-600 font-semibold">
                            {assetPhotoFile ? `${(assetPhotoFile.size / 1024).toFixed(0)} KB • Ready to upload` : "Asset photo"}
                          </p>
                        </div>
                        {assetPhotoFile && (
                          <button
                            type="button"
                            onClick={() => {
                              setAssetPhotoFile(null)
                              setAssetPhotoPreview(null)
                            }}
                            className="px-2.5 py-1 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-3 flex items-center justify-center gap-2 cursor-pointer bg-white hover:bg-blue-50/40 transition-all shadow-xs">
                        <Camera className="h-4 w-4 text-blue-600 shrink-0" />
                        <span className="text-xs font-bold text-slate-700">Take Photo (Camera)</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={handlePhotoUpload}
                        />
                      </label>
                      <label className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-3 flex items-center justify-center gap-2 cursor-pointer bg-white hover:bg-blue-50/40 transition-all shadow-xs">
                        <ImageIcon className="h-4 w-4 text-slate-600 shrink-0" />
                        <span className="text-xs font-bold text-slate-700">Choose from Gallery</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handlePhotoUpload}
                        />
                      </label>
                    </div>
                    <p className="text-[10px] text-slate-400 text-center">
                      Auto-compressed for mobile upload &bull; Supports direct camera or gallery selection
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Notes / Description</label>
                  <textarea
                    rows={2}
                    placeholder="Details, cables included, maintenance notes..."
                    value={assetNotes}
                    onChange={(e) => setAssetNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddAssetOpen(false)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition"
                  >
                    {isSubmitting ? "Saving..." : "Register Asset"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: EDIT ASSET MASTER */}
        {editingAsset && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Edit Asset Master</h2>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{editingAsset.assetCode}</p>
                </div>
                <button onClick={() => setEditingAsset(null)} className="p-2 text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditAsset} className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Asset Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Category</label>
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    >
                      <option value="FURNITURE">FURNITURE</option>
                      <option value="DISPLAY_TECH">DISPLAY & LED BOARDS</option>
                      <option value="AUDIO_VISUAL">AUDIO / VISUAL</option>
                      <option value="EVENT_EQUIPMENT">EVENT & CANOPY SETUP</option>
                      <option value="BOOTH_FIXTURE">BOOTH FIXTURE & COUNTER</option>
                      <option value="OTHER">OTHER</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Total Quantity</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={editQty}
                      onChange={(e) => setEditQty(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Location</label>
                    <input
                      type="text"
                      value={editLocation}
                      onChange={(e) => setEditLocation(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Condition</label>
                    <select
                      value={editCondition}
                      onChange={(e) => setEditCondition(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    >
                      <option value="Good">Good</option>
                      <option value="Fair">Fair</option>
                      <option value="Damaged">Damaged</option>
                      <option value="Under Repair">Under Repair</option>
                    </select>
                  </div>
                </div>

                {/* Edit Asset Photo */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Asset Image</label>
                  <div className="rounded-2xl border border-dashed border-slate-300 p-3 bg-slate-50/50 space-y-2.5">
                    {(editPhotoPreview || (!editPhotoRemoved && editingAsset.imageUrl)) && (
                      <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200">
                        <img
                          src={editPhotoPreview || editingAsset.imageUrl || ""}
                          alt={editingAsset.name}
                          className="h-14 w-14 shrink-0 rounded-lg border border-slate-200 object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">
                            {editPhotoFile?.name || "Current asset photo"}
                          </p>
                          <p className="text-[10px] text-emerald-600 font-semibold">
                            {editPhotoFile ? `${(editPhotoFile.size / 1024).toFixed(0)} KB • Ready to upload` : "Current asset photo"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setEditPhotoFile(null)
                            setEditPhotoPreview(null)
                            setEditPhotoRemoved(true)
                          }}
                          className="px-2.5 py-1 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-3 flex items-center justify-center gap-2 cursor-pointer bg-white hover:bg-blue-50/40 transition-all shadow-xs">
                        <Camera className="h-4 w-4 text-blue-600 shrink-0" />
                        <span className="text-xs font-bold text-slate-700">Take Photo (Camera)</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={handleEditPhotoUpload}
                        />
                      </label>
                      <label className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-3 flex items-center justify-center gap-2 cursor-pointer bg-white hover:bg-blue-50/40 transition-all shadow-xs">
                        <ImageIcon className="h-4 w-4 text-slate-600 shrink-0" />
                        <span className="text-xs font-bold text-slate-700">Choose from Gallery</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleEditPhotoUpload}
                        />
                      </label>
                    </div>
                    <p className="text-[10px] text-slate-400 text-center">
                      Auto-compressed for mobile upload &bull; Supports direct camera or gallery selection
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingAsset(null)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition"
                  >
                    {isSubmitting ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 3: REQUEST ASSET LOAN */}
        {isNewLoanOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Asset Lending Request Form</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Submit request to borrow marketing equipment for events</p>
                </div>
                <button onClick={() => setIsNewLoanOpen(false)} className="p-2 text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateLoan} className="p-6 space-y-4">
                {/* Asset Selection */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Select Asset Item *</label>
                  <select
                    required
                    value={loanAssetId}
                    onChange={(e) => {
                      setLoanAssetId(e.target.value)
                      setLoanQty(1)
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  >
                    <option value="">-- Choose an asset to borrow --</option>
                    {assets.map((a) => (
                      <option key={a.id} value={a.id} disabled={a.availableQuantity === 0}>
                        {a.name} ({a.availableQuantity} of {a.totalQuantity} {a.unit} available) - {a.location}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Quantity to Borrow *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={loanQty}
                    onChange={(e) => setLoanQty(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                {/* Borrower details */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Borrower Name (Who Lent) *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ahmad Razif"
                      value={loanBorrowerName}
                      onChange={(e) => setLoanBorrowerName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Borrower Department</label>
                    <input
                      type="text"
                      placeholder="e.g. Sales, Marketing, HR"
                      value={loanBorrowerDept}
                      onChange={(e) => setLoanBorrowerDept(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Contact Phone / Email</label>
                  <input
                    type="text"
                    placeholder="e.g. 012-3456789"
                    value={loanBorrowerContact}
                    onChange={(e) => setLoanBorrowerContact(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                {/* Destination & Purpose */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Where is it being brought to? (Destination / Venue) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PWTC Hall 3 (Halal Fest), Sunway Pyramid Roadshow"
                    value={loanDestination}
                    onChange={(e) => setLoanDestination(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Purpose / Event Details</label>
                  <input
                    type="text"
                    placeholder="e.g. 3-day exhibition booth backdrop"
                    value={loanPurpose}
                    onChange={(e) => setLoanPurpose(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Lending Date &amp; Time *</label>
                    <input
                      type="datetime-local"
                      required
                      value={loanBorrowDateTime}
                      onChange={(e) => setLoanBorrowDateTime(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Expected Return Date &amp; Time *</label>
                    <input
                      type="datetime-local"
                      required
                      value={loanExpectedReturn}
                      onChange={(e) => setLoanExpectedReturn(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsNewLoanOpen(false)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition"
                  >
                    {isSubmitting ? "Submitting..." : "Submit Requisition"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 4: REJECT REQUEST */}
        {rejectingLoan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Reject Lending Request</h3>
                  <p className="text-xs text-slate-500 font-mono">{rejectingLoan.loanNumber}</p>
                </div>
              </div>

              <form onSubmit={handleRejectLoan} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Reason for Rejection *</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Provide reason (e.g. Asset scheduled for another event, insufficient stock)..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setRejectingLoan(null)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700"
                  >
                    {isSubmitting ? "Rejecting..." : "Confirm Reject"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 5: RETURN ASSET CHECK-IN */}
        {returningLoan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Check-in Returned Asset</h3>
                  <p className="text-xs text-slate-500 font-mono">{returningLoan.loanNumber} • {returningLoan.asset?.name}</p>
                </div>
              </div>

              <form onSubmit={handleReturnLoan} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Returned By (Person)</label>
                  <input
                    type="text"
                    value={returnedByPerson}
                    onChange={(e) => setReturnedByPerson(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Asset Condition upon Return</label>
                  <select
                    value={returnCondition}
                    onChange={(e) => setReturnCondition(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  >
                    <option value="Good">Good (No damage)</option>
                    <option value="Fair">Fair (Minor wear &amp; tear)</option>
                    <option value="Damaged">Damaged (Requires maintenance / repair)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Return Inspection Notes</label>
                  <textarea
                    rows={2}
                    placeholder="All parts returned, cables intact, cleaned..."
                    value={returnNotes}
                    onChange={(e) => setReturnNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setReturningLoan(null)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700"
                  >
                    {isSubmitting ? "Checking in..." : "Mark as Returned"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 6: IMAGE LIGHTBOX / ZOOM MODAL */}
        {previewModalPhoto && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in"
            onClick={() => setPreviewModalPhoto(null)}
          >
            <div
              className="relative max-w-3xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black tracking-wide">{previewModalPhoto.title}</h3>
                  {previewModalPhoto.code && (
                    <span className="text-[10px] font-mono text-slate-400">{previewModalPhoto.code}</span>
                  )}
                </div>
                <button
                  onClick={() => setPreviewModalPhoto(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="bg-slate-950 flex items-center justify-center p-2 max-h-[75vh]">
                <img
                  src={previewModalPhoto.url}
                  alt={previewModalPhoto.title}
                  className="max-h-[70vh] w-auto max-w-full object-contain rounded-xl"
                />
              </div>
              <div className="p-3 bg-slate-900 text-center">
                <span className="text-xs text-slate-400 font-medium">Bubbles O2 Marketing Asset Photograph</span>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
