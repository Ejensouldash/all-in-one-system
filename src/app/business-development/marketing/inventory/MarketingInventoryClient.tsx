"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { 
  Plus, Minus, FileText, Search, PackageOpen, AlertCircle, 
  Trash2, ArrowUpDown, RefreshCw, X, Calendar, Printer, User, MessageSquare,
  Image as ImageIcon, Upload, Tag, Pencil, Briefcase, HeartHandshake, Box, Layers, Camera
} from "lucide-react"
import { 
  addMarketingStock, 
  withdrawMarketingStock, 
  deleteMarketingItem, 
  getMarketingStockReport,
  uploadMarketingItemPhotoAction,
  editMarketingItemMaster
} from "@/app/actions/marketing-inventory"

type Item = {
  id: string
  name: string
  brand?: string | null
  category?: string | null
  location: string
  department?: string | null
  quantity: number
  unit: string
  pricePerUnit: number
  imageUrl?: string | null
  createdAt: Date
  updatedAt: Date
}

type StockLog = {
  id: string
  itemId: string
  type: string
  quantity: number
  totalPrice?: number | null
  pricePerUnit?: number | null
  department?: string | null
  handledBy: string
  remarks: string | null
  createdAt: Date
  item: {
    name: string
    unit: string
    location: string
    category?: string | null
  }
}

type Props = {
  initialItems: Item[]
  initialLogs: any[]
  userName: string
  userModules?: string[]
  isSuperAdmin?: boolean
}

const CATEGORIES = [
  { id: "ALL", label: "ALL" },
  { id: "MERCHANDISE", label: "MERCHANDISE" },
  { id: "POSM", label: "POSM / DISPLAY" },
  { id: "EVENT_ASSET", label: "EVENT ASSETS" },
  { id: "PROMO", label: "PROMOTIONAL" },
  { id: "APPAREL", label: "APPAREL / UNIFORM" },
]

const LOCATIONS = [
  "HQ Store",
  "Rantau Warehouse",
  "Pedas Plant",
  "Event Venue / On-site",
  "Other / Partner Location"
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

export function MarketingInventoryClient({ 
  initialItems, 
  initialLogs, 
  userName,
  isSuperAdmin = false,
}: Props) {
  const [items, setItems] = useState<Item[]>(initialItems)
  const [logs, setLogs] = useState<StockLog[]>(initialLogs as any)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("ALL")
  
  // Add Stock Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isNewItem, setIsNewItem] = useState(false)
  const [selectedAddItemId, setSelectedAddItemId] = useState("")
  const [newItemName, setNewItemName] = useState("")
  const [addBrand, setAddBrand] = useState("")
  const [addCategory, setAddCategory] = useState("MERCHANDISE")
  const [addQty, setAddQty] = useState(1)
  const [addTotalPrice, setAddTotalPrice] = useState("")
  const [addPhotoFile, setAddPhotoFile] = useState<File | null>(null)
  const [addPhotoPreview, setAddPhotoPreview] = useState<string | null>(null)
  const [addUnit, setAddUnit] = useState("pcs")
  const [addLocation, setAddLocation] = useState("HQ Store")
  const [addHandledBy, setAddHandledBy] = useState(userName)
  const [addRemarks, setAddRemarks] = useState("")

  // Edit Item Master Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [editName, setEditName] = useState("")
  const [editBrand, setEditBrand] = useState("")
  const [editCategory, setEditCategory] = useState("MERCHANDISE")
  const [editLocation, setEditLocation] = useState("HQ Store")
  const [editUnit, setEditUnit] = useState("pcs")
  const [editPricePerUnit, setEditPricePerUnit] = useState("0")
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null)
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null)
  const [editPhotoRemoved, setEditPhotoRemoved] = useState(false)
  const [editSubmitting, setEditSubmitting] = useState(false)
  
  // Withdraw Stock Modal State
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false)
  const [selectedWithdrawItemId, setSelectedWithdrawItemId] = useState("")
  const [withdrawQty, setWithdrawQty] = useState(1)
  const [withdrawHandledBy, setWithdrawHandledBy] = useState(userName)
  const [withdrawRemarks, setWithdrawRemarks] = useState("")

  // Detail & Ledger Modal State
  const [selectedDetailItem, setSelectedDetailItem] = useState<Item | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  
  // Report State
  const [isReportSectionOpen, setIsReportSectionOpen] = useState(false)
  const [reportStartDate, setReportStartDate] = useState("")
  const [reportEndDate, setReportEndDate] = useState("")
  const [reportLogs, setReportLogs] = useState<StockLog[]>([])
  const [loadingReport, setLoadingReport] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [successMsg, setSuccessMsg] = useState("")

  useEffect(() => {
    if (!addPhotoPreview) return
    return () => URL.revokeObjectURL(addPhotoPreview)
  }, [addPhotoPreview])

  useEffect(() => {
    if (!editPhotoPreview) return
    return () => URL.revokeObjectURL(editPhotoPreview)
  }, [editPhotoPreview])

  // Filter items
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (item.brand && item.brand.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesCat = categoryFilter === "ALL" || (item.category || "MERCHANDISE") === categoryFilter
    return matchesSearch && matchesCat
  })

  const totalUniqueItems = items.length
  const totalStockQty = items.reduce((sum, item) => sum + item.quantity, 0)
  const recentInCount = logs.filter(l => l.type === "IN").reduce((sum, l) => sum + l.quantity, 0)
  const recentOutCount = logs.filter(l => l.type === "OUT").reduce((sum, l) => sum + l.quantity, 0)
  const selectedAddItem = items.find(item => item.id === selectedAddItemId)
  const addPhotoDisplayUrl = addPhotoPreview || (!isNewItem ? selectedAddItem?.imageUrl || null : null)

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

  const handleAddPhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = event.target.files?.[0] || null
    if (!rawFile) return

    if (!rawFile.type.startsWith("image/") && !rawFile.name.match(/\.(jpg|jpeg|png|webp|heic|heif)$/i)) {
      setAddPhotoFile(null)
      setAddPhotoPreview(null)
      setErrorMsg("Please select an image file.")
      event.target.value = ""
      return
    }

    try {
      const file = await compressImageFile(rawFile)
      setErrorMsg("")
      setAddPhotoFile(file)
      setAddPhotoPreview(URL.createObjectURL(file))
    } catch {
      setErrorMsg("")
      setAddPhotoFile(rawFile)
      setAddPhotoPreview(URL.createObjectURL(rawFile))
    } finally {
      event.target.value = ""
    }
  }

  // Handle Add Stock (IN)
  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setErrorMsg("")

    if (!isNewItem && !selectedAddItemId) {
      setErrorMsg("Please select an item to restock.")
      setSubmitting(false)
      return
    }

    if (isNewItem && !newItemName.trim()) {
      setErrorMsg("Please enter a name for the new marketing item.")
      setSubmitting(false)
      return
    }

    const priceNum = parseFloat(addTotalPrice)
    if (isNaN(priceNum) || priceNum <= 0) {
      setErrorMsg("Total price is mandatory and must be greater than RM 0.00.")
      setSubmitting(false)
      return
    }

    const qtyNum = Number(addQty)
    if (isNaN(qtyNum) || qtyNum <= 0) {
      setErrorMsg("Quantity must be at least 1.")
      setSubmitting(false)
      return
    }

    let uploadedImageUrl: string | null = null
    if (addPhotoFile) {
      const photoFormData = new FormData()
      photoFormData.append("photo", addPhotoFile)
      const uploadRes = await uploadMarketingItemPhotoAction(photoFormData)
      if (uploadRes.success && uploadRes.url) {
        uploadedImageUrl = uploadRes.url
      } else {
        setErrorMsg(uploadRes.error || "Failed to upload item image.")
        setSubmitting(false)
        return
      }
    }

    const payload = {
      itemId: isNewItem ? null : selectedAddItemId,
      name: isNewItem ? newItemName.trim().toUpperCase() : "",
      brand: isNewItem ? (addBrand.trim().toUpperCase() || null) : undefined,
      category: isNewItem ? addCategory : undefined,
      quantity: qtyNum,
      totalPrice: priceNum,
      unit: isNewItem ? addUnit : "",
      handledBy: addHandledBy.trim() || userName,
      remarks: addRemarks.trim() || undefined,
      location: addLocation,
      department: "MARKETING",
      imageUrl: uploadedImageUrl,
    }

    const res = await addMarketingStock(payload)
    setSubmitting(false)

    if (res.success && res.data) {
      triggerMessage("success", `Stock (IN) logged successfully for ${res.data.name}!`)
      setIsAddModalOpen(false)
      
      // Update local items state
      setItems(prev => {
        const idx = prev.findIndex(i => i.id === res.data!.id)
        if (idx >= 0) {
          const updated = [...prev]
          updated[idx] = res.data!
          return updated
        } else {
          return [...prev, res.data!]
        }
      })

      // Add to recent logs
      const calculatedUnit = Number((priceNum / qtyNum).toFixed(4))
      const newLog: StockLog = {
        id: Math.random().toString(),
        itemId: res.data.id,
        type: "IN",
        quantity: qtyNum,
        totalPrice: priceNum,
        pricePerUnit: calculatedUnit,
        department: "MARKETING",
        handledBy: addHandledBy.trim() || userName,
        remarks: addRemarks.trim() || null,
        createdAt: new Date(),
        item: {
          name: res.data.name,
          unit: res.data.unit,
          location: res.data.location,
          category: res.data.category,
        }
      }
      setLogs(prev => [newLog, ...prev])

      // Reset form
      setNewItemName("")
      setAddBrand("")
      setAddCategory("MERCHANDISE")
      setSelectedAddItemId("")
      setAddQty(1)
      setAddTotalPrice("")
      setAddRemarks("")
      setAddPhotoFile(null)
      setAddPhotoPreview(null)
    } else {
      setErrorMsg(res.error || "Failed to add stock.")
    }
  }

  // Handle Withdraw Stock (OUT)
  const handleWithdrawStock = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setErrorMsg("")

    if (!selectedWithdrawItemId) {
      setErrorMsg("Please select an item to withdraw.")
      setSubmitting(false)
      return
    }

    const qtyNum = Number(withdrawQty)
    if (isNaN(qtyNum) || qtyNum <= 0) {
      setErrorMsg("Quantity must be at least 1.")
      setSubmitting(false)
      return
    }

    const res = await withdrawMarketingStock({
      itemId: selectedWithdrawItemId,
      quantity: qtyNum,
      handledBy: withdrawHandledBy.trim() || userName,
      remarks: withdrawRemarks.trim() || undefined,
    })

    setSubmitting(false)

    if (res.success && res.data) {
      triggerMessage("success", `Successfully withdrew ${qtyNum} ${res.data.unit} from ${res.data.name}!`)
      setIsWithdrawModalOpen(false)

      setItems(prev => {
        const idx = prev.findIndex(i => i.id === res.data!.id)
        if (idx >= 0) {
          const updated = [...prev]
          updated[idx] = res.data!
          return updated
        }
        return prev
      })

      const targetItem = items.find(i => i.id === selectedWithdrawItemId)
      const withdrawalTotal = Number(((targetItem?.pricePerUnit || 0) * qtyNum).toFixed(2))
      const newLog: StockLog = {
        id: Math.random().toString(),
        itemId: res.data.id,
        type: "OUT",
        quantity: qtyNum,
        totalPrice: withdrawalTotal,
        pricePerUnit: targetItem?.pricePerUnit || 0,
        department: "MARKETING",
        handledBy: withdrawHandledBy.trim() || userName,
        remarks: withdrawRemarks.trim() || null,
        createdAt: new Date(),
        item: {
          name: res.data.name,
          unit: res.data.unit,
          location: res.data.location,
          category: res.data.category,
        }
      }
      setLogs(prev => [newLog, ...prev])

      setSelectedWithdrawItemId("")
      setWithdrawQty(1)
      setWithdrawRemarks("")
    } else {
      setErrorMsg(res.error || "Failed to withdraw stock.")
    }
  }

  // Handle Edit Master
  const handleOpenEditModal = (item: Item) => {
    setEditingItem(item)
    setEditName(item.name)
    setEditBrand(item.brand || "")
    setEditCategory(item.category || "MERCHANDISE")
    setEditLocation(item.location || "HQ Store")
    setEditUnit(item.unit || "pcs")
    setEditPricePerUnit(String(item.pricePerUnit ?? 0))
    setEditPhotoFile(null)
    setEditPhotoPreview(null)
    setEditPhotoRemoved(false)
    setIsEditModalOpen(true)
  }

  const handleEditPhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = event.target.files?.[0] || null
    if (!rawFile) return

    if (!rawFile.type.startsWith("image/") && !rawFile.name.match(/\.(jpg|jpeg|png|webp|heic|heif)$/i)) {
      setEditPhotoFile(null)
      setEditPhotoPreview(null)
      setErrorMsg("Please select an image file.")
      event.target.value = ""
      return
    }

    try {
      const file = await compressImageFile(rawFile)
      setErrorMsg("")
      setEditPhotoFile(file)
      setEditPhotoPreview(URL.createObjectURL(file))
      setEditPhotoRemoved(false)
    } catch {
      setErrorMsg("")
      setEditPhotoFile(rawFile)
      setEditPhotoPreview(URL.createObjectURL(rawFile))
      setEditPhotoRemoved(false)
    } finally {
      event.target.value = ""
    }
  }

  const handleSaveEditMaster = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingItem) return

    setEditSubmitting(true)
    setErrorMsg("")

    const pricePerUnit = Number(editPricePerUnit)
    if (!Number.isFinite(pricePerUnit) || pricePerUnit < 0) {
      setErrorMsg("Price per unit must be zero or greater.")
      setEditSubmitting(false)
      return
    }

    let imageUrl: string | null | undefined
    if (editPhotoFile) {
      const photoFormData = new FormData()
      photoFormData.append("photo", editPhotoFile)
      const uploadRes = await uploadMarketingItemPhotoAction(photoFormData)
      if (!uploadRes.success || !uploadRes.url) {
        setErrorMsg(uploadRes.error || "Failed to upload item image.")
        setEditSubmitting(false)
        return
      }
      imageUrl = uploadRes.url
    } else if (editPhotoRemoved) {
      imageUrl = null
    }

    const res = await editMarketingItemMaster(editingItem.id, {
      name: editName,
      brand: editBrand,
      category: editCategory,
      location: editLocation,
      unit: editUnit,
      pricePerUnit,
      ...(imageUrl !== undefined ? { imageUrl } : {}),
    })

    setEditSubmitting(false)

    if (res.success && res.data) {
      triggerMessage("success", `Item master updated: ${res.data.name}!`)
      setIsEditModalOpen(false)

      setItems(prev => prev.map(i => i.id === res.data!.id ? res.data! : i))
      setEditPhotoFile(null)
      setEditPhotoPreview(null)
      setEditPhotoRemoved(false)
    } else {
      setErrorMsg(res.error || "Failed to update item master.")
    }
  }

  // Handle Delete Item
  const handleDeleteItem = async (itemId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? All associated stock logs will be removed.`)) {
      return
    }

    const res = await deleteMarketingItem(itemId)
    if (res.success) {
      triggerMessage("success", `Item "${name}" deleted.`)
      setItems(prev => prev.filter(i => i.id !== itemId))
    } else {
      triggerMessage("error", res.error || "Failed to delete item.")
    }
  }

  // Fetch Report
  const handleGenerateReport = async () => {
    setLoadingReport(true)
    const res = await getMarketingStockReport({
      startDate: reportStartDate || undefined,
      endDate: reportEndDate || undefined,
    })
    setLoadingReport(false)

    if (res.success && res.data) {
      setReportLogs(res.data as any)
    } else {
      triggerMessage("error", res.error || "Failed to fetch report.")
    }
  }

  return (
    <div className="bg-slate-50 min-h-screen pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* Nav Header Tabs */}
        <div className="mb-8 border-b border-slate-200 overflow-x-auto">
          <div className="flex space-x-8 min-w-max px-2">

            <Link 
              href="/business-development/marketing/inventory"
              className="flex items-center pb-4 text-sm font-black uppercase tracking-wider border-b-4 border-blue-700 text-blue-700 transition-colors"
            >
              <PackageOpen className="w-5 h-5 mr-2" />
              Marketing Assets &amp; Inventory
            </Link>
          </div>
        </div>

        {/* Global Toast Alerts */}
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
              <PackageOpen className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg("")} className="p-1 hover:bg-emerald-100 rounded">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Header & Metric Cards */}
        <div className="space-y-6 mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Box className="h-8 w-8 text-blue-600" />
              MARKETING INVENTORY
            </h1>
            <p className="text-xs font-semibold text-slate-500 tracking-wide uppercase mt-1">
              LOG CHECK-INS, CHECK-OUTS, AND STOCK AUDITS FOR MARKETING ASSETS &amp; PROMO MATERIALS
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">UNIQUE ITEMS</span>
                <span className="text-3xl font-black text-slate-900 mt-1 block">{totalUniqueItems}</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Box className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">TOTAL STOCK QTY</span>
                <span className="text-3xl font-black text-slate-900 mt-1 block">{totalStockQty}</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <ArrowUpDown className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-extrabold text-emerald-600 uppercase tracking-wider block">INWARD (30 DAYS)</span>
                <span className="text-3xl font-black text-emerald-600 mt-1 block">+{recentInCount}</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">
                +
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-extrabold text-rose-600 uppercase tracking-wider block">OUTWARD (30 DAYS)</span>
                <span className="text-3xl font-black text-rose-600 mt-1 block">-{recentOutCount}</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-lg">
                -
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                setIsNewItem(false)
                setIsAddModalOpen(true)
              }}
              className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-2 uppercase tracking-wider"
            >
              <Plus className="h-4 w-4" />
              <span>ADD STOCK (IN)</span>
            </button>

            <button
              onClick={() => setIsWithdrawModalOpen(true)}
              className="px-5 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-2 uppercase tracking-wider"
            >
              <Minus className="h-4 w-4" />
              <span>WITHDRAW STOCK (OUT)</span>
            </button>

            <button
              onClick={() => {
                setIsReportSectionOpen(!isReportSectionOpen)
                if (!isReportSectionOpen) handleGenerateReport()
              }}
              className="px-5 py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-sm transition-all flex items-center gap-2"
            >
              <FileText className="h-4 w-4 text-slate-500" />
              <span>GENERATE STOCK REPORT</span>
            </button>
          </div>
        </div>

        {/* Report Section */}
        {isReportSectionOpen && (
          <div className="mb-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Printer className="h-4 w-4 text-blue-600" />
                Marketing Stock Audit Report &amp; History
              </h3>
              <button onClick={() => setIsReportSectionOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Start Date</label>
                <input
                  type="date"
                  value={reportStartDate}
                  onChange={(e) => setReportStartDate(e.target.value)}
                  className="w-full text-xs px-3 py-2 border rounded-xl"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">End Date</label>
                <input
                  type="date"
                  value={reportEndDate}
                  onChange={(e) => setReportEndDate(e.target.value)}
                  className="w-full text-xs px-3 py-2 border rounded-xl"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleGenerateReport}
                  disabled={loadingReport}
                  className="w-full py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                >
                  {loadingReport ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                  <span>Filter Report</span>
                </button>
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase sticky top-0">
                  <tr>
                    <th className="px-4 py-2.5">Date &amp; Time</th>
                    <th className="px-4 py-2.5">Type</th>
                    <th className="px-4 py-2.5">Item Name</th>
                    <th className="px-4 py-2.5">Quantity</th>
                    <th className="px-4 py-2.5">Total Value (RM)</th>
                    <th className="px-4 py-2.5">Handled By</th>
                    <th className="px-4 py-2.5">Remarks / Event</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        No logs matching date criteria.
                      </td>
                    </tr>
                  ) : (
                    reportLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2 text-slate-500">{new Date(log.createdAt).toLocaleString("en-GB")}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${log.type === "IN" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                            {log.type}
                          </span>
                        </td>
                        <td className="px-4 py-2 font-bold text-slate-800">{log.item.name}</td>
                        <td className="px-4 py-2 font-bold">{log.quantity} {log.item.unit}</td>
                        <td className="px-4 py-2">RM {log.totalPrice ? log.totalPrice.toFixed(2) : "0.00"}</td>
                        <td className="px-4 py-2 text-slate-600">{log.handledBy}</td>
                        <td className="px-4 py-2 text-slate-500 italic">{log.remarks || "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Active Inventory Table Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          
          {/* Header & Filter Pills */}
          <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">Active Marketing Inventory</h2>
              <p className="text-xs text-slate-500">Manage and track live quantities for promotional assets and merchandise</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Category Pills */}
              <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryFilter(cat.id)}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                      categoryFilter === cat.id
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-200/60"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search item name or brand..."
                  className="w-full text-xs pl-9 pr-3 py-2 border rounded-xl border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Item Name</th>
                  <th className="px-5 py-3.5">Brand</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Location</th>
                  <th className="px-5 py-3.5">Current Stock</th>
                  <th className="px-5 py-3.5">Unit</th>
                  <th className="px-5 py-3.5 text-right">Price / Unit</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                      <Box className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                      No marketing inventory items matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Name & Photo */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.name} className="h-9 w-9 rounded-lg object-cover border border-slate-200 shrink-0" />
                          ) : (
                            <div className="h-9 w-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                              <ImageIcon className="h-4 w-4" />
                            </div>
                          )}
                          <div>
                            <button
                              onClick={() => {
                                setSelectedDetailItem(item)
                                setIsDetailModalOpen(true)
                              }}
                              className="font-bold text-slate-900 hover:text-blue-600 text-left transition-colors"
                            >
                              {item.name}
                            </button>
                            <span className="block text-[10px] text-slate-400 font-mono">ID: {item.id.slice(0, 8)}</span>
                          </div>
                        </div>
                      </td>

                      {/* Brand */}
                      <td className="px-5 py-3.5 font-medium text-slate-600">
                        {item.brand || "—"}
                      </td>

                      {/* Category */}
                      <td className="px-5 py-3.5">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                          {item.category || "MERCHANDISE"}
                        </span>
                      </td>

                      {/* Location */}
                      <td className="px-5 py-3.5 text-slate-600 font-medium">
                        {item.location}
                      </td>

                      {/* Stock Qty */}
                      <td className="px-5 py-3.5">
                        <span className={`font-black text-sm ${item.quantity > 5 ? "text-slate-900" : item.quantity > 0 ? "text-amber-600" : "text-rose-600"}`}>
                          {item.quantity}
                        </span>
                      </td>

                      {/* Unit */}
                      <td className="px-5 py-3.5 text-slate-500 font-medium">
                        {item.unit}
                      </td>

                      {/* Price / Unit */}
                      <td className="px-5 py-3.5 text-right font-bold text-slate-800">
                        RM {item.pricePerUnit ? item.pricePerUnit.toFixed(2) : "0.00"}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedDetailItem(item)
                              setIsDetailModalOpen(true)
                            }}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors"
                            title="View Stock Movement History Ledger"
                          >
                            <FileText className="h-4 w-4" />
                          </button>
                          
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1.5 rounded-lg text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 transition-colors"
                            title="Edit Master Details"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => handleDeleteItem(item.id, item.name)}
                            className="p-1.5 rounded-lg text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 transition-colors"
                            title="Delete Item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Add Stock Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase">Add Marketing Stock (IN)</h3>
                <p className="text-xs text-slate-500">Restock existing item or register a new marketing asset</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddStock} className="space-y-4">
              {/* Type Toggle */}
              <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setIsNewItem(false)}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${!isNewItem ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}
                >
                  Restock Existing Item
                </button>
                <button
                  type="button"
                  onClick={() => setIsNewItem(true)}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${isNewItem ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}
                >
                  + New Marketing Item
                </button>
              </div>

              {!isNewItem ? (
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Choose Existing Item *</label>
                  <select
                    required
                    value={selectedAddItemId}
                    onChange={(e) => setSelectedAddItemId(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="">-- Select Marketing Item --</option>
                    {items.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name} ({i.category || "MERCHANDISE"}) - Current Stock: {i.quantity} {i.unit}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Item Name *</label>
                    <input
                      type="text"
                      required
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      placeholder="e.g. BUBBLESO2 BRANDED T-SHIRT (SIZE L)"
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Brand / Vendor</label>
                      <input
                        type="text"
                        value={addBrand}
                        onChange={(e) => setAddBrand(e.target.value)}
                        placeholder="e.g. Bubbles O2"
                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Category</label>
                      <select
                        value={addCategory}
                        onChange={(e) => setAddCategory(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white"
                      >
                        {CATEGORIES.filter(c => c.id !== "ALL").map(c => (
                          <option key={c.id} value={c.id}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Location</label>
                      <select
                        value={addLocation}
                        onChange={(e) => setAddLocation(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white"
                      >
                        {LOCATIONS.map(l => (
                          <option key={l} value={l}>{l}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Unit</label>
                      <input
                        type="text"
                        value={addUnit}
                        onChange={(e) => setAddUnit(e.target.value)}
                        placeholder="pcs, boxes, sets"
                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">Item Image (Optional)</label>
                <div className="rounded-2xl border border-dashed border-slate-300 p-3 bg-slate-50/50 space-y-2.5">
                  {addPhotoDisplayUrl && (
                    <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200">
                      <img src={addPhotoDisplayUrl} alt="Marketing item preview" className="h-14 w-14 rounded-lg border border-slate-200 object-cover shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 truncate">
                          {addPhotoFile?.name || (!isNewItem && selectedAddItem?.imageUrl ? "Current item image" : "Selected photo")}
                        </p>
                        <p className="text-[10px] text-emerald-600 font-semibold">
                          {addPhotoFile ? `${(addPhotoFile.size / 1024).toFixed(0)} KB • Ready to upload` : "Attached to item"}
                        </p>
                      </div>
                      {(addPhotoFile || (!isNewItem && selectedAddItem?.imageUrl)) && (
                        <button
                          type="button"
                          onClick={() => {
                            setAddPhotoFile(null)
                            setAddPhotoPreview(null)
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
                        onChange={handleAddPhotoChange}
                      />
                    </label>
                    <label className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-3 flex items-center justify-center gap-2 cursor-pointer bg-white hover:bg-blue-50/40 transition-all shadow-xs">
                      <ImageIcon className="h-4 w-4 text-slate-600 shrink-0" />
                      <span className="text-xs font-bold text-slate-700">Choose from Gallery</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAddPhotoChange}
                      />
                    </label>
                  </div>
                  <p className="text-[10px] text-slate-400 text-center">
                    Auto-compressed for mobile upload &bull; Supports direct camera or gallery selection
                  </p>
                </div>
              </div>

              {/* Quantity & Total Price */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Quantity (IN) *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={addQty}
                    onChange={(e) => setAddQty(Number(e.target.value))}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Total Cost (RM) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={addTotalPrice}
                    onChange={(e) => setAddTotalPrice(e.target.value)}
                    placeholder="e.g. 250.00"
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold"
                  />
                </div>
              </div>

              {/* Handled By & Remarks */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Handled By *</label>
                <input
                  type="text"
                  required
                  value={addHandledBy}
                  onChange={(e) => setAddHandledBy(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Remarks / Supplier Note</label>
                <input
                  type="text"
                  value={addRemarks}
                  onChange={(e) => setAddRemarks(e.target.value)}
                  placeholder="e.g. Received from vendor for Event Launching"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="w-1/2 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-1/2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md"
                >
                  {submitting ? "Logging Stock..." : "+ Confirm Stock In"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Withdraw Stock Modal */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h3 className="text-lg font-black text-rose-600 uppercase">Withdraw Marketing Stock (OUT)</h3>
                <p className="text-xs text-slate-500">Record asset usage, event checkout, or promotional distribution</p>
              </div>
              <button onClick={() => setIsWithdrawModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleWithdrawStock} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Select Marketing Item *</label>
                <select
                  required
                  value={selectedWithdrawItemId}
                  onChange={(e) => setSelectedWithdrawItemId(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white"
                >
                  <option value="">-- Choose Item --</option>
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.category || "MERCHANDISE"}) — Available: {i.quantity} {i.unit}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Withdraw Quantity *</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={withdrawQty}
                  onChange={(e) => setWithdrawQty(Number(e.target.value))}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Handled By *</label>
                <input
                  type="text"
                  required
                  value={withdrawHandledBy}
                  onChange={(e) => setWithdrawHandledBy(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Purpose / Event Name / Remarks</label>
                <textarea
                  rows={2}
                  value={withdrawRemarks}
                  onChange={(e) => setWithdrawRemarks(e.target.value)}
                  placeholder="e.g. Distributed at KL Marathon 2026 Booth"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsWithdrawModalOpen(false)}
                  className="w-1/2 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-1/2 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md"
                >
                  {submitting ? "Withdrawing..." : "— Confirm Withdrawal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Master Modal */}
      {isEditModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <h3 className="text-lg font-black text-slate-900 uppercase">Edit Item Master</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditMaster} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Item Name *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">Item Image</label>
                <div className="rounded-2xl border border-dashed border-slate-300 p-3 bg-slate-50/50 space-y-2.5">
                  {(editPhotoPreview || (!editPhotoRemoved && editingItem.imageUrl)) && (
                    <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200">
                      <img
                        src={editPhotoPreview || editingItem.imageUrl || ""}
                        alt={editingItem.name}
                        className="h-14 w-14 shrink-0 rounded-lg border border-slate-200 object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 truncate">
                          {editPhotoFile?.name || "Current item image"}
                        </p>
                        <p className="text-[10px] text-emerald-600 font-semibold">
                          {editPhotoFile ? `${(editPhotoFile.size / 1024).toFixed(0)} KB • Ready to upload` : "Current master image"}
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
                        onChange={handleEditPhotoChange}
                      />
                    </label>
                    <label className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-3 flex items-center justify-center gap-2 cursor-pointer bg-white hover:bg-blue-50/40 transition-all shadow-xs">
                      <ImageIcon className="h-4 w-4 text-slate-600 shrink-0" />
                      <span className="text-xs font-bold text-slate-700">Choose from Gallery</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleEditPhotoChange}
                      />
                    </label>
                  </div>
                  <p className="text-[10px] text-slate-400 text-center">
                    Auto-compressed for mobile upload &bull; Supports direct camera or gallery selection
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Brand</label>
                  <input
                    type="text"
                    value={editBrand}
                    onChange={(e) => setEditBrand(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white"
                  >
                    {CATEGORIES.filter(c => c.id !== "ALL").map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Location</label>
                  <select
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white"
                  >
                    {LOCATIONS.map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Unit</label>
                  <input
                    type="text"
                    value={editUnit}
                    onChange={(e) => setEditUnit(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Price / Unit (RM)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.0001"
                    required
                    value={editPricePerUnit}
                    onChange={(e) => setEditPricePerUnit(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="w-1/2 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="w-1/2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md"
                >
                  {editSubmitting ? "Saving..." : "Save Master Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Item Detail Ledger Modal */}
      {isDetailModalOpen && selectedDetailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-start justify-between border-b pb-4">
              <div className="flex min-w-0 items-center gap-4">
                {selectedDetailItem.imageUrl ? (
                  <img
                    src={selectedDetailItem.imageUrl}
                    alt={selectedDetailItem.name}
                    className="h-20 w-20 shrink-0 rounded-xl border border-slate-200 object-cover sm:h-24 sm:w-24"
                  />
                ) : (
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-400 sm:h-24 sm:w-24">
                    <ImageIcon className="h-8 w-8" aria-hidden="true" />
                  </div>
                )}
                <div className="min-w-0">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 uppercase">
                    {selectedDetailItem.category || "MERCHANDISE"}
                  </span>
                  <h3 className="mt-1 break-words text-xl font-black text-slate-900">{selectedDetailItem.name}</h3>
                  <p className="text-xs text-slate-500">Location: {selectedDetailItem.location} • Brand: {selectedDetailItem.brand || "N/A"}</p>
                </div>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center">
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Current Stock</span>
                <span className="text-xl font-black text-slate-900">{selectedDetailItem.quantity} {selectedDetailItem.unit}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Price / Unit</span>
                <span className="text-xl font-black text-slate-900">RM {selectedDetailItem.pricePerUnit ? selectedDetailItem.pricePerUnit.toFixed(2) : "0.00"}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Total Stock Value</span>
                <span className="text-xl font-black text-emerald-600">RM {(selectedDetailItem.quantity * (selectedDetailItem.pricePerUnit || 0)).toFixed(2)}</span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Stock Movement History</h4>
              <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase sticky top-0">
                    <tr>
                      <th className="px-4 py-2">Date</th>
                      <th className="px-4 py-2">Type</th>
                      <th className="px-4 py-2">Qty</th>
                      <th className="px-4 py-2">Handled By</th>
                      <th className="px-4 py-2">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {logs.filter(l => l.itemId === selectedDetailItem.id).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-slate-400">No stock logs for this item.</td>
                      </tr>
                    ) : (
                      logs.filter(l => l.itemId === selectedDetailItem.id).map(log => (
                        <tr key={log.id}>
                          <td className="px-4 py-2 text-slate-500">{new Date(log.createdAt).toLocaleDateString("en-GB")}</td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${log.type === "IN" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                              {log.type}
                            </span>
                          </td>
                          <td className="px-4 py-2 font-bold">{log.quantity}</td>
                          <td className="px-4 py-2 text-slate-700">{log.handledBy}</td>
                          <td className="px-4 py-2 text-slate-500 italic">{log.remarks || "-"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
