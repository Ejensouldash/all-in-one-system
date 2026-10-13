"use client"

import React, { useState } from "react"
import { MaintenanceNavTabs } from "@/components/forms/MaintenanceNavTabs"
import { 
  Plus, Minus, FileText, Search, PackageOpen, AlertCircle, 
  Trash2, ArrowUpDown, RefreshCw, X, Calendar, Printer, User, MessageSquare,
  Image as ImageIcon, Upload, Tag, Pencil, ChevronLeft, ChevronRight
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

function getPaginationItems(currentPage: number, totalPages: number): (number | string)[] {
  const items: (number | string)[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) items.push(i)
  } else {
    if (currentPage <= 4) {
      items.push(1, 2, 3, 4, 5, "...", totalPages)
    } else if (currentPage >= totalPages - 3) {
      items.push(1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
    } else {
      items.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages)
    }
  }
  return items
}

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

export function MaintenanceDashboardClient({ 
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
  const [departmentFilter, setDepartmentFilter] = useState("ALL")
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(10)
  
  // Add Stock Modal State
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
  const [addDepartment, setAddDepartment] = useState("BOS")
  const [addHandledBy, setAddHandledBy] = useState(userName)
  const [addRemarks, setAddRemarks] = useState("")

  // Edit Item Master Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [editName, setEditName] = useState("")
  const [editBrand, setEditBrand] = useState("")
  const [editLocation, setEditLocation] = useState("Pedas")
  const [editUnit, setEditUnit] = useState("pcs")
  const [editDepartment, setEditDepartment] = useState("BOS")
  const [editSubmitting, setEditSubmitting] = useState(false)
  
  // Withdraw Stock Modal State
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

  // Sort & filter items by name and department
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDept = departmentFilter === "ALL" || (item.department || "BOS") === departmentFilter
    return matchesSearch && matchesDept
  })

  // Pagination calculations
  const totalFiltered = filteredItems.length
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize))
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages)
  const startIndex = (safeCurrentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalFiltered)
  const paginatedItems = filteredItems.slice(startIndex, endIndex)

  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1)
  }

  const handleDepartmentFilterChange = (dept: string) => {
    setDepartmentFilter(dept)
    setCurrentPage(1)
  }

  const handlePageSizeChange = (size: number) => {
    setPageSize(size)
    setCurrentPage(1)
  }

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
      setErrorMsg("Please enter a name for the new item.")
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
      brand: isNewItem ? (addBrand.trim().toUpperCase() || null) : undefined,
      quantity: qtyNum,
      totalPrice: priceNum,
      unit: isNewItem ? addUnit : "",
      handledBy: addHandledBy,
      remarks: addRemarks.trim().toUpperCase(),
      location: isNewItem ? addLocation : undefined,
      department: addDepartment,
      imageUrl: uploadedImageUrl
    }

    const res = await addMaintenanceStock(payload)
    if (res.success && res.data) {
      triggerMessage("success", `Stock successfully added!`)
      // Refresh local list
      window.location.reload()
    } else {
      setErrorMsg(res.error || "Failed to add stock.")
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
    setEditDepartment(item.department || "BOS")
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
      department: editDepartment.toUpperCase(),
    })

    if (res.success && res.data) {
      triggerMessage("success", `Item master details updated successfully!`)
      setItems((prev) =>
        prev.map((i) =>
          i.id === editingItem.id
            ? {
                ...i,
                name: res.data!.name,
                brand: res.data!.brand,
                location: res.data!.location,
                unit: res.data!.unit,
                department: res.data!.department,
              }
            : i
        )
      )
      setIsEditModalOpen(false)
      setEditingItem(null)
    } else {
      setErrorMsg(res.error || "Failed to update item master details.")
    }
    setEditSubmitting(false)
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
      triggerMessage("success", `Stock successfully withdrawn!`)
      window.location.reload()
    } else {
      setErrorMsg(res.error || "Failed to withdraw stock.")
    }
    setSubmitting(false)
  }

  // Handle Delete Item
  const handleDeleteItem = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}" from the inventory list? All stock logs relating to this item will be removed.`)) {
      return
    }
    const res = await deleteMaintenanceItem(id)
    if (res.success) {
      setItems(prev => prev.filter(item => item.id !== id))
      triggerMessage("success", `Item successfully deleted.`)
    } else {
      triggerMessage("error", res.error || "Failed to delete item.")
    }
  }

  // Generate Report
  const handleGenerateReport = async () => {
    setLoadingReport(true)
    setErrorMsg("")
    const res = await getMaintenanceStockReport({
      startDate: reportStartDate || undefined,
      endDate: reportEndDate || undefined,
      departments: ["BOS", "BOM"]
    })

    if (res.success && res.data) {
      setReportLogs(res.data as any)
    } else {
      setErrorMsg(res.error || "Failed to generate report.")
    }
    setLoadingReport(false)
  }

  // Print Report
  const handlePrintReport = () => {
    const originalTitle = document.title
    document.title = `Maintenance_Stock_Report_${new Date().toISOString().split('T')[0]}`
    window.print()
    document.title = originalTitle
  }

  return (
    <div className="bg-gray-50 pb-12 min-h-screen print:bg-white print:min-h-0 print:pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 print:p-0 print:max-w-none">
        
        {/* Header - Hidden in Print */}
        <div className="mb-6 print:hidden">
          <div className="flex items-center space-x-4 mb-2">
            <PackageOpen className="h-10 w-10 text-blue-700" />
            <div>
              <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter text-gray-900">
                FMS Inventory
              </h1>
              <p className="font-bold text-gray-500 uppercase tracking-widest text-xs mt-1">
                Log check-ins, check-outs, and stock audits
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs - Hidden in Print */}
        <div className="print:hidden">
          <MaintenanceNavTabs userModules={userModules} isSuperAdmin={isSuperAdmin} />
        </div>

        {/* Global Notifications */}
        {successMsg && (
          <div className="mb-6 p-4 rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-800 text-sm font-semibold flex items-center gap-2 print:hidden shadow-sm animate-in fade-in duration-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl border border-red-100 bg-red-50 text-red-800 text-sm font-semibold flex items-center gap-2 print:hidden shadow-sm animate-in fade-in duration-300">
            <AlertCircle className="w-5 h-5 text-red-500" />
            {errorMsg}
          </div>
        )}

        {/* Printable Report View (Visible only during printing) */}
        <div className="hidden print:block font-sans text-black">
          <div className="w-full bg-white mb-6">
            <table className="w-full border-collapse border-2 border-black text-[11px] text-black font-sans bg-white">
              <tbody>
                <tr>
                  <td className="border-2 border-black p-2 text-center w-[20%] align-middle" rowSpan={2}>
                    <img src="/assets/BubblesO2_Logo.png" alt="BubblesO2 Logo" className="h-10 mx-auto object-contain" />
                    <div className="text-[9px] mt-2 font-medium text-gray-700">
                      Co. No. 201601013208<br />(1184139-H)
                    </div>
                  </td>
                  <td className="border-2 border-black p-2 text-center font-bold w-[30%]">
                    Document Type: Level 4<br />SUPPORTING DOCUMENTATION
                  </td>
                  <td className="border-2 border-black p-2 text-center font-bold w-[25%] uppercase">
                    Document Title:<br />SPARE PART INVENTORY
                  </td>
                  <td className="border-2 border-black p-2 text-center font-bold w-[25%]">
                    Document Number:<br />BOSB-MNT-P-850-001-QR02
                  </td>
                </tr>
                <tr>
                  <td colSpan={2} className="border-2 border-black p-2 text-center font-bold uppercase align-middle">
                    HEAD OF MAINTENANCE DEPARTMENT<br />
                    BUBBLES O2 SDN BHD (BOSB)
                  </td>
                  <td className="border-2 border-black p-0 align-top">
                    <table className="w-full h-full border-collapse">
                      <tbody>
                        <tr>
                          <td className="p-1 pl-2 font-bold border-b border-black">Page: <span className="font-normal ml-1">1 of 1</span></td>
                        </tr>
                        <tr>
                          <td className="p-1 pl-2 font-bold border-b border-black">Issue: <span className="font-normal ml-1">03</span></td>
                        </tr>
                        <tr>
                          <td className="p-1 pl-2 font-bold">Date: <span className="font-normal ml-1">16/07/2026</span></td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Period info if filtered */}
          {(reportStartDate || reportEndDate) && (
            <div className="mb-4 text-xs font-bold text-gray-700">
              Report Period: {reportStartDate ? new Date(reportStartDate).toLocaleDateString("en-GB") : "Beginning"} - {reportEndDate ? new Date(reportEndDate).toLocaleDateString("en-GB") : "Today"}
            </div>
          )}
          <table className="w-full border-collapse border border-gray-400 text-xs table-fixed">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-400 p-2 text-left font-bold uppercase w-[15%]">Date & Time</th>
                <th className="border border-gray-400 p-2 text-left font-bold uppercase w-[18%]">Item Name</th>
                <th className="border border-gray-400 p-2 text-left font-bold uppercase w-[12%]">Location</th>
                <th className="border border-gray-400 p-2 text-center font-bold uppercase w-[7%]">Type</th>
                <th className="border border-gray-400 p-2 text-right font-bold uppercase w-[10%]">Quantity</th>
                <th className="border border-gray-400 p-2 text-left font-bold uppercase w-[8%]">Unit</th>
                <th className="border border-gray-400 p-2 text-left font-bold uppercase w-[18%]">Handled By</th>
                <th className="border border-gray-400 p-2 text-left font-bold uppercase w-[12%]">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {reportLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="border border-gray-400 p-4 text-center font-medium text-gray-500">
                    No stock logs recorded for the selected period.
                  </td>
                </tr>
              ) : (
                reportLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50">
                    <td className="border border-gray-400 p-2 break-words whitespace-normal">{new Date(log.createdAt).toLocaleString("en-GB")}</td>
                    <td className="border border-gray-400 p-2 font-semibold break-words whitespace-normal">{log.item?.name}</td>
                    <td className="border border-gray-400 p-2 font-semibold break-words whitespace-normal">{log.item?.location}</td>
                    <td className="border border-gray-400 p-2 text-center break-words whitespace-normal">
                      <span className={`px-2 py-0.5 rounded font-black ${
                        log.type === "IN" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                      }`}>
                        {log.type}
                      </span>
                    </td>
                    <td className="border border-gray-400 p-2 text-right font-semibold break-words whitespace-normal">{log.quantity}</td>
                    <td className="border border-gray-400 p-2 break-words whitespace-normal">{log.item?.unit}</td>
                    <td className="border border-gray-400 p-2 font-medium break-words whitespace-normal">{log.handledBy}</td>
                    <td className="border border-gray-400 p-2 break-words whitespace-normal">{log.remarks || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Dashboard Panels - Hidden in Print */}
        <div className="print:hidden space-y-6">
          
          {/* KPI Summary Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200/60 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Unique Items</p>
                  <p className="text-2xl font-black text-gray-800 mt-1">{totalUniqueItems}</p>
                </div>
                <div className="bg-blue-50 p-2.5 rounded-lg border border-blue-100 text-blue-600">
                  <PackageOpen className="w-5 h-5" />
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200/60 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Stock Qty</p>
                  <p className="text-2xl font-black text-gray-800 mt-1">{totalStockQty}</p>
                </div>
                <div className="bg-purple-50 p-2.5 rounded-lg border border-purple-100 text-purple-600">
                  <ArrowUpDown className="w-5 h-5" />
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200/60 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Inward (30 Days)</p>
                  <p className="text-2xl font-black text-emerald-700 mt-1">+{recentInCount}</p>
                </div>
                <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-100 text-emerald-600">
                  <Plus className="w-5 h-5" />
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200/60 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Outward (30 Days)</p>
                  <p className="text-2xl font-black text-red-700 mt-1">-{recentOutCount}</p>
                </div>
                <div className="bg-red-50 p-2.5 rounded-lg border border-red-100 text-red-600">
                  <Minus className="w-5 h-5" />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons Row */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                setIsAddModalOpen(true)
                setIsNewItem(false)
                setSelectedAddItemId("")
                setNewItemName("")
                setAddQty(1)
                setAddLocation("Pedas")
                setAddDepartment("BOS")
                setAddRemarks("")
              }}
              className="flex items-center px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-sm font-black uppercase tracking-wider transition-colors shadow-md hover:shadow-lg"
            >
              <Plus className="w-4 h-4 mr-2" /> Add Stock (IN)
            </button>
            
            <button
              onClick={() => {
                setIsWithdrawModalOpen(true)
                setSelectedWithdrawItemId("")
                setWithdrawQty(1)
                setWithdrawRemarks("")
              }}
              className="flex items-center px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-black uppercase tracking-wider transition-colors shadow-md hover:shadow-lg"
            >
              <Minus className="w-4 h-4 mr-2" /> Withdraw Stock (OUT)
            </button>

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
              {isReportSectionOpen ? "Close Stock Report" : "Generate Stock Report"}
            </button>
          </div>

          {/* Report Generation Section */}
          {isReportSectionOpen && (
            <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200/60 animate-in slide-in-from-top-4 duration-300">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                Generate Stock Movement Report
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
                        <th className="px-6 py-3">Item Name</th>
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

          {/* Current Items Inventory Card List */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-200/60 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Active Inventory Items</h2>
                <p className="text-gray-500 text-sm font-medium mt-0.5">Manage and track live quantities</p>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                {/* Department filter tabs */}
                <div className="flex items-center bg-gray-100 p-1 rounded-xl text-xs font-black uppercase self-start sm:self-auto">
                  {["ALL", "BOS", "BOM"].map((dept) => (
                    <button
                      key={dept}
                      type="button"
                      onClick={() => handleDepartmentFilterChange(dept)}
                      className={`px-3 py-1.5 rounded-lg transition-all ${
                        departmentFilter === dept
                          ? "bg-white text-gray-900 shadow-xs font-black"
                          : "text-gray-500 hover:text-gray-900"
                      }`}
                    >
                      {dept}
                    </button>
                  ))}
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search item name..."
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-sm font-semibold bg-white outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Results summary and Page size */}
            <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/50 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
              <span>
                Showing <strong className="text-slate-800">{totalFiltered === 0 ? 0 : startIndex + 1}</strong> to{" "}
                <strong className="text-slate-800">{endIndex}</strong> of{" "}
                <strong className="text-slate-800">{totalFiltered}</strong> items
              </span>

              <div className="flex items-center gap-2">
                <span className="text-xs">Per page:</span>
                {[10, 25, 50].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => handlePageSizeChange(size)}
                    className={`px-2 py-0.5 rounded text-xs font-bold transition-colors ${
                      pageSize === size
                        ? "bg-slate-800 text-white"
                        : "text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm text-left text-gray-700">
                <thead className="bg-gray-50 border-b border-gray-100 text-xs font-black uppercase tracking-wider text-gray-500 sticky top-0 z-10 shadow-xs">
                  <tr>
                    <th className="px-6 py-3.5 w-64 max-w-[260px]">Item Name</th>
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
                  {totalFiltered === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-10 text-center text-gray-500 font-medium bg-gray-50/20">
                        No inventory items found. Add stock to register items.
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.map((item) => (
                      <tr 
                        key={item.id} 
                        onClick={() => {
                          setSelectedDetailItem(item)
                          setIsDetailModalOpen(true)
                        }}
                        className="hover:bg-blue-50/40 cursor-pointer transition-colors group"
                      >
                        <td className="px-6 py-4 w-64 max-w-[260px]">
                          <div className="flex items-center gap-3 min-w-0">
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
                            <span className="truncate group-hover:text-blue-700 transition-colors font-bold text-gray-900" title={item.name}>
                              {item.name}
                            </span>
                          </div>
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
                                title="Edit Item Master Details"
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
                              title="Delete Item"
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

            {/* Pagination Controls */}
            {totalFiltered > 0 && (
              <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-slate-500">
                  Page {safeCurrentPage} of {totalPages}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(Math.max(1, safeCurrentPage - 1))}
                    disabled={safeCurrentPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  {getPaginationItems(safeCurrentPage, totalPages).map((item, idx) =>
                    item === "..." ? (
                      <span key={idx} className="px-2 text-xs text-slate-400">...</span>
                    ) : (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCurrentPage(item as number)}
                        className={`min-w-[32px] h-8 rounded-lg text-xs font-bold transition-all ${
                          safeCurrentPage === item
                            ? "bg-slate-900 text-white shadow-sm"
                            : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {item}
                      </button>
                    )
                  )}

                  <button
                    type="button"
                    onClick={() => setCurrentPage(Math.min(totalPages, safeCurrentPage + 1))}
                    disabled={safeCurrentPage === totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Add Stock Modal */}
        {isAddModalOpen && (
          <div className="fixed inset-0 bg-black/55 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 print:hidden">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
              <div className="bg-blue-700 px-6 py-4 flex items-center justify-between text-white">
                <h3 className="font-black uppercase tracking-wider text-sm flex items-center gap-2">
                  <Plus className="w-5 h-5" /> Add Stock (IN)
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
                    Register New Item
                  </label>
                </div>

                {isNewItem ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Item Name *</label>
                        <input
                          type="text"
                          placeholder="e.g. LED LIGHT BULB 12W"
                          value={newItemName}
                          onChange={(e) => setNewItemName(e.target.value.toUpperCase())}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-bold uppercase outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Brand / Manufacturer</label>
                        <input
                          type="text"
                          placeholder="e.g. PHILIPS, SCHNEIDER"
                          value={addBrand}
                          onChange={(e) => setAddBrand(e.target.value.toUpperCase())}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-bold uppercase outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
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
                          <option value="bottle">bottle</option>
                          <option value="kg">kg</option>
                          <option value="litre">litre</option>
                          <option value="roll">roll</option>
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
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Department</label>
                        <select
                          value={addDepartment}
                          onChange={(e) => setAddDepartment(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-bold outline-none focus:border-blue-500"
                        >
                          <option value="BOS">BOS</option>
                          <option value="BOM">BOM</option>
                        </select>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Select Item</label>
                      <select
                        value={selectedAddItemId}
                        onChange={(e) => {
                          const chosenId = e.target.value
                          setSelectedAddItemId(chosenId)
                          const found = items.find(i => i.id === chosenId)
                          if (found?.department) {
                            setAddDepartment(found.department)
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-bold outline-none focus:border-blue-500"
                      >
                        <option value="">-- Choose Item --</option>
                        {items.map(item => (
                          <option key={item.id} value={item.id}>
                            {item.name} [{item.department || "BOS"}] ({item.location}) ({item.quantity} {item.unit} available)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Department</label>
                      <select
                        value={addDepartment}
                        onChange={(e) => setAddDepartment(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-bold outline-none focus:border-blue-500"
                      >
                        <option value="BOS">BOS</option>
                        <option value="BOM">BOM</option>
                      </select>
                    </div>
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
                      placeholder="e.g. 150.00"
                      value={addTotalPrice}
                      onChange={(e) => setAddTotalPrice(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-bold outline-none focus:border-blue-500"
                      required
                    />
                    {parseFloat(addTotalPrice) > 0 && addQty > 0 && (
                      <div className="mt-1.5 space-y-1">
                        <p className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                          <Tag className="w-3.5 h-3.5" />
                          Batch Unit Price: RM {(parseFloat(addTotalPrice) / addQty).toFixed(2)} / {isNewItem ? addUnit : (items.find(i => i.id === selectedAddItemId)?.unit || "unit")}
                        </p>
                        {!isNewItem && selectedAddItemId && (() => {
                          const existing = items.find(i => i.id === selectedAddItemId);
                          if (existing && existing.quantity > 0 && existing.pricePerUnit && existing.pricePerUnit > 0) {
                            const newTotalVal = (existing.quantity * existing.pricePerUnit) + parseFloat(addTotalPrice);
                            const newTotalQty = existing.quantity + addQty;
                            const avgPrice = newTotalVal / newTotalQty;
                            return (
                              <p className="text-[11px] font-semibold text-blue-700 bg-blue-50/80 px-2 py-0.5 rounded border border-blue-200 inline-block">
                                Est. Weighted Avg: RM {avgPrice.toFixed(2)} / {existing.unit || "unit"} (Curr: RM {existing.pricePerUnit.toFixed(2)})
                              </p>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Item Photo (optional)</label>
                    <div className="flex flex-col gap-1">
                      <label className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg cursor-pointer border border-blue-200 transition-colors w-full text-center">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Choose File</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0] ?? null;
                            setAddPhotoFile(file);
                            if (file) {
                              setAddPhotoPreview(URL.createObjectURL(file));
                            } else {
                              setAddPhotoPreview(null);
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
                      placeholder="Enter supplier, purchase invoice details etc."
                      value={addRemarks}
                      onChange={(e) => setAddRemarks(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-bold outline-none focus:border-blue-500 h-20 resize-none"
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
                    Add Stock
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Withdraw Stock Modal */}
        {isWithdrawModalOpen && (
          <div className="fixed inset-0 bg-black/55 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 print:hidden">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
              <div className="bg-rose-600 px-6 py-4 flex items-center justify-between text-white">
                <h3 className="font-black uppercase tracking-wider text-sm flex items-center gap-2">
                  <Minus className="w-5 h-5" /> Withdraw Stock (OUT)
                </h3>
                <button onClick={() => setIsWithdrawModalOpen(false)} className="text-white/80 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleWithdrawStock} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Select Item</label>
                  <select
                    value={selectedWithdrawItemId}
                    onChange={(e) => setSelectedWithdrawItemId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-bold outline-none focus:border-rose-500"
                  >
                    <option value="">-- Choose Item --</option>
                    {items.map(item => (
                      <option key={item.id} value={item.id} disabled={item.quantity === 0}>
                        {item.name} ({item.location}) ({item.quantity} {item.unit} available) {item.quantity === 0 ? "(OUT OF STOCK)" : ""}
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
                      placeholder="Who took the item / for which machine/area?"
                      value={withdrawRemarks}
                      onChange={(e) => setWithdrawRemarks(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-bold outline-none focus:border-rose-500 h-20 resize-none"
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
                    Withdraw Stock
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Item Detail & Ledger History Modal */}
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
            setAddDepartment(item.department || "BOS")
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
                      department: updated.department,
                      location: updated.location,
                      unit: updated.unit,
                    }
                  : i
              )
            )
            setSelectedDetailItem((prev) => (prev ? { ...prev, ...updated } : null))
          }}
        />

        {/* Edit Item Master Details Modal */}
        {isEditModalOpen && editingItem && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
              <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-blue-400" />
                  <h3 className="font-black uppercase tracking-wider text-sm">
                    Edit Master Item Details
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
                    Item Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-bold uppercase outline-none focus:border-blue-500"
                    placeholder="e.g. MOTOR BEARING 6204-2Z"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Standardized in capital letters. Rename carefully as it affects inventory records.
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
                    placeholder="e.g. SKF, NSK, SCHNEIDER, MITSUBISHI"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Dedicated brand slot for spare parts specification.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3">
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
                      <option value="bottle">bottle</option>
                      <option value="kg">kg</option>
                      <option value="litre">litre</option>
                      <option value="roll">roll</option>
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

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                      Department
                    </label>
                    <select
                      value={editDepartment}
                      onChange={(e) => setEditDepartment(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-bold outline-none focus:border-blue-500"
                    >
                      <option value="BOS">BOS</option>
                      <option value="BOM">BOM</option>
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
