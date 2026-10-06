"use client"

import React, { useState } from "react"
import { MaintenanceNavTabs } from "@/components/forms/MaintenanceNavTabs"
import { 
  Plus, Minus, FileText, Search, Boxes, AlertCircle, 
  Trash2, RefreshCw, X, Printer, User, MessageSquare,
  Image as ImageIcon, Upload, Tag, Pencil, CheckCircle2
} from "lucide-react"
import { 
  addMaintenanceStock, 
  withdrawMaintenanceStock, 
  deleteMaintenanceItem, 
  getMaintenanceStockReport,
  uploadMaintenanceItemPhotoAction,
  editMaintenanceItemMaster
} from "@/app/actions/maintenance-inventory"
import { MaintenanceItemDetailModal, InventoryItem } from "@/components/forms/maintenance/MaintenanceItemDetailModal"

type Item = {
  id: string
  name: string
  brand?: string | null
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
    department?: string | null
  }
}

type Props = {
  initialItems: Item[]
  initialLogs: any[]
  userName: string
  userModules?: string[]
  isSuperAdmin?: boolean
}

export function MaintenanceAssetClient({ 
  initialItems, 
  initialLogs, 
  userName,
  userModules = [],
  isSuperAdmin = false,
}: Props) {
  const canEditItem = isSuperAdmin || userModules.includes("MAINTENANCE_INVENTORY_EDIT")
  const [items, setItems] = useState<Item[]>(initialItems)
  const [logs, setLogs] = useState<StockLog[]>(initialLogs as any)
  const [searchTerm, setSearchTerm] = useState("")
  const [locationFilter, setLocationFilter] = useState("ALL")
  
  // Add Asset Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isNewItem, setIsNewItem] = useState(false)
  const [selectedAddItemId, setSelectedAddItemId] = useState("")
  const [newItemName, setNewItemName] = useState("")
  const [addBrand, setAddBrand] = useState("")
  const [addQty, setAddQty] = useState(1)
  const [addTotalPrice, setAddTotalPrice] = useState("")
  const [addPhotoFile, setAddPhotoFile] = useState<File | null>(null)
  const [addPhotoPreview, setAddPhotoPreview] = useState<string | null>(null)
  const [addUnit, setAddUnit] = useState("pcs")
  const [addLocation, setAddLocation] = useState("Pedas")
  const [addHandledBy, setAddHandledBy] = useState(userName)
  const [addRemarks, setAddRemarks] = useState("")

  // Edit Asset Master Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [editName, setEditName] = useState("")
  const [editBrand, setEditBrand] = useState("")
  const [editLocation, setEditLocation] = useState("Pedas")
  const [editUnit, setEditUnit] = useState("pcs")
  const [editSubmitting, setEditSubmitting] = useState(false)
  
  // Withdraw Asset Modal State
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false)
  const [selectedWithdrawItemId, setSelectedWithdrawItemId] = useState("")
  const [withdrawQty, setWithdrawQty] = useState(1)
  const [withdrawHandledBy, setWithdrawHandledBy] = useState(userName)
  const [withdrawRemarks, setWithdrawRemarks] = useState("")

  // Detail & Ledger Modal State
  const [selectedDetailItem, setSelectedDetailItem] = useState<InventoryItem | null>(null)
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

  // Filter items by search term and location
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.brand && item.brand.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesLoc = locationFilter === "ALL" || item.location.toLowerCase() === locationFilter.toLowerCase()
    return matchesSearch && matchesLoc
  })

  const totalUniqueItems = items.length
  const totalStockQty = items.reduce((sum, item) => sum + item.quantity, 0)
  const recentInCount = logs.filter(l => l.type === "IN").reduce((sum, l) => sum + l.quantity, 0)
  const recentOutCount = logs.filter(l => l.type === "OUT").reduce((sum, l) => sum + l.quantity, 0)

  // Reset messages after 4 seconds
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

  // Handle Add Asset (IN)
  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setErrorMsg("")

    if (!isNewItem && !selectedAddItemId) {
      setErrorMsg("Please select an asset to restock.")
      setSubmitting(false)
      return
    }

    if (isNewItem && !newItemName.trim()) {
      setErrorMsg("Please enter a name for the new asset.")
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

    // Upload photo if selected
    let uploadedImageUrl: string | null = null
    if (addPhotoFile) {
      const photoFormData = new FormData()
      photoFormData.append("photo", addPhotoFile)
      const uploadRes = await uploadMaintenanceItemPhotoAction(photoFormData)
      if (uploadRes.success && uploadRes.url) {
        uploadedImageUrl = uploadRes.url
      } else if (!uploadRes.success) {
        console.warn("Photo upload warning:", uploadRes.error)
      }
    }

    const payload = {
      itemId: isNewItem ? null : selectedAddItemId,
      name: isNewItem ? newItemName.trim().toUpperCase() : "",
      brand: isNewItem ? (addBrand.trim().toUpperCase() || undefined) : undefined,
      quantity: qtyNum,
      totalPrice: priceNum,
      unit: isNewItem ? addUnit : "",
      handledBy: addHandledBy,
      remarks: addRemarks.trim().toUpperCase(),
      location: isNewItem ? addLocation : undefined,
      department: "NRHO", // Strictly locked to NRHO
      imageUrl: uploadedImageUrl
    }

    const res = await addMaintenanceStock(payload)
    if (res.success && res.data) {
      triggerMessage("success", `Asset successfully registered / checked in!`)
      window.location.reload()
    } else {
      setErrorMsg(res.error || "Failed to add asset.")
    }
    setSubmitting(false)
  }

  // Handle Edit Master Details
  const handleOpenEditModal = (item: Item) => {
    setEditingItem(item)
    setEditName(item.name)
    setEditBrand(item.brand || "")
    setEditLocation(item.location || "Pedas")
    setEditUnit(item.unit || "pcs")
    setIsEditModalOpen(true)
  }

  const handleSaveEditMaster = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingItem) return
    setEditSubmitting(true)
    setErrorMsg("")

    const res = await editMaintenanceItemMaster(editingItem.id, {
      name: editName.trim().toUpperCase(),
      brand: editBrand.trim().toUpperCase() || null,
      location: editLocation,
      unit: editUnit.toLowerCase(),
      department: "NRHO", // Strictly locked to NRHO
    })

    if (res.success && res.data) {
      triggerMessage("success", `Asset master details updated successfully!`)
      setItems((prev) =>
        prev.map((i) =>
          i.id === editingItem.id
            ? {
                ...i,
                name: res.data!.name,
                brand: res.data!.brand,
                location: res.data!.location,
                unit: res.data!.unit,
                department: "NRHO",
              }
            : i
        )
      )
      setIsEditModalOpen(false)
      setEditingItem(null)
    } else {
      setErrorMsg(res.error || "Failed to update asset master details.")
    }
    setEditSubmitting(false)
  }

  // Handle Withdraw Asset (OUT)
  const handleWithdrawStock = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setErrorMsg("")

    if (!selectedWithdrawItemId) {
      setErrorMsg("Please select an asset to withdraw.")
      setSubmitting(false)
      return
    }

    const selectedItem = items.find(i => i.id === selectedWithdrawItemId)
    if (selectedItem && selectedItem.quantity < withdrawQty) {
      setErrorMsg(`Insufficient stock. Available: ${selectedItem.quantity} ${selectedItem.unit}`)
      setSubmitting(false)
      return
    }

    const res = await withdrawMaintenanceStock({
      itemId: selectedWithdrawItemId,
      quantity: Number(withdrawQty),
      handledBy: withdrawHandledBy,
      remarks: withdrawRemarks.trim().toUpperCase()
    })

    if (res.success) {
      triggerMessage("success", `Asset successfully checked out!`)
      window.location.reload()
    } else {
      setErrorMsg(res.error || "Failed to withdraw asset.")
    }
    setSubmitting(false)
  }

  // Handle Delete Asset
  const handleDeleteItem = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}" from the asset ledger? All logs relating to this asset will be removed.`)) {
      return
    }
    const res = await deleteMaintenanceItem(id)
    if (res.success) {
      setItems(prev => prev.filter(item => item.id !== id))
      triggerMessage("success", `Asset successfully deleted.`)
    } else {
      triggerMessage("error", res.error || "Failed to delete asset.")
    }
  }

  // Generate Asset Report
  const handleGenerateReport = async () => {
    setLoadingReport(true)
    setErrorMsg("")
    const res = await getMaintenanceStockReport({
      startDate: reportStartDate || undefined,
      endDate: reportEndDate || undefined,
      department: "NRHO" // Strictly scoped to NRHO
    })

    if (res.success && res.data) {
      setReportLogs(res.data as any)
    } else {
      setErrorMsg(res.error || "Failed to generate asset report.")
    }
    setLoadingReport(false)
  }

  // Print Report
  const handlePrintReport = () => {
    const originalTitle = document.title
    document.title = `FMS_Asset_Movement_Report_${new Date().toISOString().split('T')[0]}`
    window.print()
    document.title = originalTitle
  }

  return (
    <div className="bg-gray-50 pb-12 min-h-screen print:bg-white print:min-h-0 print:pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 print:p-0 print:max-w-none">
        
        {/* Header - Hidden in Print */}
        <div className="mb-6 print:hidden">
          <div className="flex items-center space-x-4 mb-2">
            <div className="p-2.5 bg-blue-700 rounded-2xl text-white shadow-md">
              <Boxes className="h-8 w-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter text-gray-900">
                  FMS Asset
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wide bg-purple-100 text-purple-800 border border-purple-200">
                  NRHO
                </span>
              </div>
              <p className="font-bold text-gray-500 uppercase tracking-widest text-xs mt-1">
                Log check-ins, check-outs, and asset audits
              </p>
            </div>
          </div>
        </div>

        {/* Global Navigation Tabs */}
        <div className="print:hidden">
          <MaintenanceNavTabs userModules={userModules} isSuperAdmin={isSuperAdmin} />
        </div>

        {/* Feedback Alerts */}
        {errorMsg && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-xl flex items-center justify-between shadow-xs print:hidden">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
              <p className="text-sm font-bold text-red-700">{errorMsg}</p>
            </div>
            <button onClick={() => setErrorMsg("")} className="text-red-400 hover:text-red-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-xl flex items-center justify-between shadow-xs print:hidden">
            <div className="flex items-center">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 mr-3" />
              <p className="text-sm font-bold text-emerald-700">{successMsg}</p>
            </div>
            <button onClick={() => setSuccessMsg("")} className="text-emerald-400 hover:text-emerald-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Main Interface Content */}
        <div className="space-y-6">
          
          {/* Top KPI Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Unique Assets</p>
                <p className="text-2xl font-black text-gray-900 mt-1">{totalUniqueItems}</p>
              </div>
              <div className="p-3 bg-blue-50 text-blue-700 rounded-xl">
                <Boxes className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Asset Qty</p>
                <p className="text-2xl font-black text-gray-900 mt-1">{totalStockQty}</p>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl">
                <Tag className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Inward (30 Days)</p>
                <p className="text-2xl font-black text-emerald-600 mt-1">+{recentInCount}</p>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <Plus className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Outward (30 Days)</p>
                <p className="text-2xl font-black text-rose-600 mt-1">-{recentOutCount}</p>
              </div>
              <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                <Minus className="h-5 w-5" />
              </div>
            </div>
          </div>

          {/* Quick Actions Row */}
          <div className="flex flex-wrap gap-3 items-center justify-between print:hidden">
            <div className="flex flex-wrap gap-2.5">
              <button
                onClick={() => {
                  setIsNewItem(false)
                  setSelectedAddItemId("")
                  setNewItemName("")
                  setAddBrand("")
                  setAddQty(1)
                  setAddTotalPrice("")
                  setAddPhotoFile(null)
                  setAddPhotoPreview(null)
                  setAddRemarks("")
                  setIsAddModalOpen(true)
                }}
                className="flex items-center px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-sm font-black uppercase tracking-wider transition-all shadow-md active:scale-95"
              >
                <Plus className="w-4 h-4 mr-1.5" /> Add Asset (IN)
              </button>

              <button
                onClick={() => {
                  setSelectedWithdrawItemId("")
                  setWithdrawQty(1)
                  setWithdrawRemarks("")
                  setIsWithdrawModalOpen(true)
                }}
                className="flex items-center px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-black uppercase tracking-wider transition-all shadow-md active:scale-95"
              >
                <Minus className="w-4 h-4 mr-1.5" /> Withdraw Asset (OUT)
              </button>
            </div>

            <button
              onClick={() => {
                setIsReportSectionOpen(!isReportSectionOpen)
                setReportLogs([])
              }}
              className={`flex items-center px-4 py-2.5 rounded-xl text-sm font-black uppercase tracking-wider transition-all shadow-md ${
                isReportSectionOpen 
                  ? "bg-slate-700 hover:bg-slate-800 text-white" 
                  : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              <FileText className="w-4 h-4 mr-2" /> 
              {isReportSectionOpen ? "Close Asset Report" : "Generate Asset Report"}
            </button>
          </div>

          {/* Report Generation Section */}
          {isReportSectionOpen && (
            <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200/60 animate-in slide-in-from-top-4 duration-300">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                Generate NRHO Asset Movement Report
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end mb-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Start Date</label>
                  <input
                    type="date"
                    value={reportStartDate}
                    onChange={(e) => setReportStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-bold outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">End Date</label>
                  <input
                    type="date"
                    value={reportEndDate}
                    onChange={(e) => setReportEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-bold outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleGenerateReport}
                    disabled={loadingReport}
                    className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-black uppercase tracking-wider transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    {loadingReport ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      "Filter Logs"
                    )}
                  </button>
                  {reportLogs.length > 0 && (
                    <button
                      onClick={handlePrintReport}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-black uppercase tracking-wider transition-colors shadow-sm flex items-center gap-1.5"
                    >
                      <Printer className="w-4 h-4" /> Print
                    </button>
                  )}
                </div>
              </div>

              {/* Report Preview Table */}
              {reportLogs.length > 0 && (
                <div className="overflow-x-auto border border-gray-200 rounded-xl">
                  <table className="w-full text-sm text-left text-gray-700">
                    <thead className="bg-gray-50 border-b border-gray-200 text-xs font-black uppercase tracking-wider text-gray-500">
                      <tr>
                        <th className="px-6 py-3">Date & Time</th>
                        <th className="px-6 py-3">Asset Name</th>
                        <th className="px-6 py-3">Location</th>
                        <th className="px-6 py-3 text-center">Type</th>
                        <th className="px-6 py-3 text-right">Quantity</th>
                        <th className="px-6 py-3">Unit</th>
                        <th className="px-6 py-3">Handled By</th>
                        <th className="px-6 py-3">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 font-medium">
                      {reportLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50/50">
                          <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                            {new Date(log.createdAt).toLocaleString("en-GB")}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-900">
                            {log.item?.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-700">
                            {log.item?.location}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-black tracking-wide uppercase ${
                              log.type === "IN" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                            }`}>
                              {log.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right font-black text-gray-900">
                            {log.quantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                            {log.item?.unit}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-semibold">
                            {log.handledBy}
                          </td>
                          <td className="px-6 py-4 text-gray-500 max-w-[200px] truncate">
                            {log.remarks || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Active Assets Table Card */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-200/60 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Active FMS Assets</h2>
                <p className="text-gray-500 text-sm font-medium mt-0.5">Manage and track live NRHO asset quantities</p>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                {/* Location Filter Pills (Aligned in /grill-me) */}
                <div className="flex items-center bg-gray-100 p-1 rounded-xl text-xs font-black uppercase self-start sm:self-auto">
                  {["ALL", "Pedas", "Rantau", "Gambang"].map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => setLocationFilter(loc)}
                      className={`px-3 py-1.5 rounded-lg transition-all ${
                        locationFilter === loc
                          ? "bg-white text-gray-900 shadow-xs font-black"
                          : "text-gray-500 hover:text-gray-900"
                      }`}
                    >
                      {loc}
                    </button>
                  ))}
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search asset or brand..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-sm font-semibold bg-white outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[580px] overflow-y-auto">
              <table className="w-full text-sm text-left text-gray-700">
                <thead className="bg-gray-50 border-b border-gray-100 text-xs font-black uppercase tracking-wider text-gray-500 sticky top-0 z-10 shadow-xs">
                  <tr>
                    <th className="px-6 py-3.5">Asset Name</th>
                    <th className="px-6 py-3.5 text-center">Brand</th>
                    <th className="px-6 py-3.5">Location</th>
                    <th className="px-6 py-3.5 text-right">Current Stock</th>
                    <th className="px-6 py-3.5">Unit</th>
                    <th className="px-6 py-3.5 text-right">Price / Unit</th>
                    <th className="px-6 py-3.5">Last Updated</th>
                    <th className="px-6 py-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-10 text-center text-gray-500 font-medium bg-gray-50/20">
                        No NRHO assets found. Click "Add Asset (IN)" to register new assets.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => (
                      <tr 
                        key={item.id} 
                        onClick={() => {
                          setSelectedDetailItem(item)
                          setIsDetailModalOpen(true)
                        }}
                        className="hover:bg-blue-50/40 cursor-pointer transition-colors group"
                      >
                        <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-900 flex items-center gap-3">
                          {item.imageUrl ? (
                            <img 
                              src={item.imageUrl} 
                              alt={item.name} 
                              className="w-9 h-9 object-cover rounded-lg border border-gray-200 shadow-xs flex-shrink-0 group-hover:scale-105 transition-transform" 
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-gray-100 border border-dashed border-gray-300 flex items-center justify-center flex-shrink-0 text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                              <ImageIcon className="w-4 h-4" />
                            </div>
                          )}
                          <span className="group-hover:text-blue-700 transition-colors">{item.name}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {item.brand ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                              {item.brand}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs font-bold">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-700 font-semibold">
                          {item.location}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right font-black text-gray-900">
                          <span className={`${item.quantity === 0 ? 'text-red-600 bg-red-50 px-2 py-1 rounded' : ''}`}>
                            {item.quantity}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                          {item.unit}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-emerald-700">
                          RM {(item.pricePerUnit || 0).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-xs">
                          {new Date(item.updatedAt).toLocaleString("en-GB")}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-1">
                            {canEditItem && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleOpenEditModal(item)
                                }}
                                className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                                title="Edit Asset Master Details"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteItem(item.id, item.name)
                              }}
                              className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                              title="Delete Asset"
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
          </div>
        </div>

        {/* Add Asset Modal */}
        {isAddModalOpen && (
          <div className="fixed inset-0 bg-black/55 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 print:hidden">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
              <div className="bg-blue-700 px-6 py-4 flex items-center justify-between text-white">
                <h3 className="font-black uppercase tracking-wider text-sm flex items-center gap-2">
                  <Plus className="w-5 h-5" /> Add Asset (IN) — NRHO
                </h3>
                <button onClick={() => setIsAddModalOpen(false)} className="text-white/80 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddStock} className="p-6 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    id="new-item-check"
                    checked={isNewItem}
                    onChange={(e) => setIsNewItem(e.target.checked)}
                    className="h-4 w-4 rounded text-blue-600 border-gray-300"
                  />
                  <label htmlFor="new-item-check" className="text-xs font-black uppercase text-gray-600 cursor-pointer">
                    Register New Asset
                  </label>
                </div>

                {isNewItem ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Asset Name *</label>
                        <input
                          type="text"
                          placeholder="e.g. DESK FAN 16 INCH"
                          value={newItemName}
                          onChange={(e) => setNewItemName(e.target.value.toUpperCase())}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-bold uppercase outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Brand / Manufacturer</label>
                        <input
                          type="text"
                          placeholder="e.g. PANASONIC, KHIND"
                          value={addBrand}
                          onChange={(e) => setAddBrand(e.target.value.toUpperCase())}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-bold uppercase outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Unit</label>
                        <select
                          value={addUnit}
                          onChange={(e) => setAddUnit(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-bold outline-none focus:border-blue-500"
                        >
                          <option value="pcs">pcs</option>
                          <option value="set">set</option>
                          <option value="pack">pack</option>
                          <option value="unit">unit</option>
                          <option value="box">box</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Location</label>
                        <select
                          value={addLocation}
                          onChange={(e) => setAddLocation(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-bold outline-none focus:border-blue-500"
                        >
                          <option value="Pedas">Pedas</option>
                          <option value="Rantau">Rantau</option>
                          <option value="Gambang">Gambang</option>
                        </select>
                      </div>
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Select Asset</label>
                    <select
                      value={selectedAddItemId}
                      onChange={(e) => setSelectedAddItemId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-bold outline-none focus:border-blue-500"
                    >
                      <option value="">-- Choose Existing Asset --</option>
                      {items.map(item => (
                        <option key={item.id} value={item.id}>
                          {item.name} {item.brand ? `[${item.brand}]` : ""} ({item.location}) ({item.quantity} {item.unit} available)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Quantity</label>
                    <input
                      type="number"
                      min={1}
                      value={addQty}
                      onChange={(e) => setAddQty(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-bold outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Handled By</label>
                    <div className="relative">
                      <User className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={addHandledBy}
                        onChange={(e) => setAddHandledBy(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-bold outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 items-start">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Total Price (RM)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="e.g. 250.00"
                      value={addTotalPrice}
                      onChange={(e) => setAddTotalPrice(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-bold outline-none focus:border-blue-500"
                      required
                    />
                    {parseFloat(addTotalPrice) > 0 && addQty > 0 && (
                      <p className="mt-1 text-xs font-bold text-emerald-600 flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5" />
                        Calc: RM {(parseFloat(addTotalPrice) / addQty).toFixed(2)} / {isNewItem ? addUnit : (items.find(i => i.id === selectedAddItemId)?.unit || "unit")}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Asset Photo (optional)</label>
                    <div className="flex flex-col gap-1">
                      <label className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg cursor-pointer border border-blue-200 transition-colors w-full text-center">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Choose File</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0] ?? null
                            setAddPhotoFile(file)
                            if (file) {
                              setAddPhotoPreview(URL.createObjectURL(file))
                            } else {
                              setAddPhotoPreview(null)
                            }
                          }}
                          className="sr-only"
                        />
                      </label>
                      <p className="text-[11px] text-gray-500 truncate" title={addPhotoFile ? addPhotoFile.name : "No file chosen"}>
                        {addPhotoFile ? addPhotoFile.name : "No file chosen"}
                      </p>
                    </div>
                    {addPhotoPreview && (
                      <img src={addPhotoPreview} alt="Preview" className="mt-2 h-16 w-16 object-cover rounded-lg border border-gray-200" />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Remarks</label>
                  <div className="relative">
                    <MessageSquare className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
                    <textarea
                      placeholder="Enter asset serial number, invoice details, supplier etc."
                      value={addRemarks}
                      onChange={(e) => setAddRemarks(e.target.value.toUpperCase())}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-bold uppercase outline-none focus:border-blue-500 h-20 resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-black uppercase tracking-wider"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-sm font-black uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                    Add Asset
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Withdraw Asset Modal */}
        {isWithdrawModalOpen && (
          <div className="fixed inset-0 bg-black/55 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 print:hidden">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
              <div className="bg-rose-600 px-6 py-4 flex items-center justify-between text-white">
                <h3 className="font-black uppercase tracking-wider text-sm flex items-center gap-2">
                  <Minus className="w-5 h-5" /> Withdraw Asset (OUT) — NRHO
                </h3>
                <button onClick={() => setIsWithdrawModalOpen(false)} className="text-white/80 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleWithdrawStock} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Select Asset</label>
                  <select
                    value={selectedWithdrawItemId}
                    onChange={(e) => setSelectedWithdrawItemId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-bold outline-none focus:border-rose-500"
                  >
                    <option value="">-- Choose Asset --</option>
                    {items.map(item => (
                      <option key={item.id} value={item.id} disabled={item.quantity === 0}>
                        {item.name} {item.brand ? `[${item.brand}]` : ""} ({item.location}) ({item.quantity} {item.unit} available) {item.quantity === 0 ? "(OUT OF STOCK)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Quantity</label>
                    <input
                      type="number"
                      min={1}
                      value={withdrawQty}
                      onChange={(e) => setWithdrawQty(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-bold outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Handled By</label>
                    <div className="relative">
                      <User className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={withdrawHandledBy}
                        onChange={(e) => setWithdrawHandledBy(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-bold outline-none focus:border-rose-500"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Remarks</label>
                  <div className="relative">
                    <MessageSquare className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
                    <textarea
                      placeholder="Who took the asset / destination area?"
                      value={withdrawRemarks}
                      onChange={(e) => setWithdrawRemarks(e.target.value.toUpperCase())}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-bold uppercase outline-none focus:border-rose-500 h-20 resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsWithdrawModalOpen(false)}
                    className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-black uppercase tracking-wider"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-black uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                    Withdraw Asset
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Asset Detail & Ledger History Modal */}
        <MaintenanceItemDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false)
            setSelectedDetailItem(null)
          }}
          item={selectedDetailItem}
          canEditMaster={canEditItem}
          onOpenEditMaster={(item) => {
            setIsDetailModalOpen(false)
            handleOpenEditModal(item as any)
          }}
          onOpenAddStock={(item) => {
            setIsDetailModalOpen(false)
            setIsNewItem(false)
            setSelectedAddItemId(item.id)
            setAddQty(1)
            setAddTotalPrice(item.pricePerUnit ? (item.pricePerUnit * 1).toFixed(2) : "")
            setIsAddModalOpen(true)
          }}
          onOpenWithdrawStock={(item) => {
            setIsDetailModalOpen(false)
            setSelectedWithdrawItemId(item.id)
            setWithdrawQty(1)
            setIsWithdrawModalOpen(true)
          }}
          onItemUpdated={(updated) => {
            setItems((prev) =>
              prev.map((i) =>
                i.id === updated.id
                  ? {
                      ...i,
                      name: updated.name,
                      brand: updated.brand,
                      imageUrl: updated.imageUrl,
                      pricePerUnit: updated.pricePerUnit,
                      department: "NRHO",
                      location: updated.location,
                      unit: updated.unit,
                    }
                  : i
              )
            )
            setSelectedDetailItem((prev) => (prev ? { ...prev, ...updated } : null))
          }}
        />

        {/* Edit Asset Master Details Modal */}
        {isEditModalOpen && editingItem && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
              <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-blue-400" />
                  <h3 className="font-black uppercase tracking-wider text-sm">
                    Edit Asset Master Details — NRHO
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setIsEditModalOpen(false)
                    setEditingItem(null)
                  }}
                  className="text-white/70 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEditMaster} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Asset Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-bold uppercase outline-none focus:border-blue-500"
                    placeholder="e.g. DESK FAN 16 INCH"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Standardized in capital letters. Rename carefully as it affects asset logs.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Brand / Manufacturer
                  </label>
                  <input
                    type="text"
                    value={editBrand}
                    onChange={(e) => setEditBrand(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-bold uppercase outline-none focus:border-blue-500"
                    placeholder="e.g. PANASONIC, KHIND"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                      Unit
                    </label>
                    <select
                      value={editUnit}
                      onChange={(e) => setEditUnit(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-bold outline-none focus:border-blue-500"
                    >
                      <option value="pcs">pcs</option>
                      <option value="set">set</option>
                      <option value="pack">pack</option>
                      <option value="unit">unit</option>
                      <option value="box">box</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                      Location
                    </label>
                    <select
                      value={editLocation}
                      onChange={(e) => setEditLocation(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-bold outline-none focus:border-blue-500"
                    >
                      <option value="Pedas">Pedas</option>
                      <option value="Rantau">Rantau</option>
                      <option value="Gambang">Gambang</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditModalOpen(false)
                      setEditingItem(null)
                    }}
                    className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-xs font-black uppercase tracking-wider transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editSubmitting}
                    className="flex-1 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    {editSubmitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
