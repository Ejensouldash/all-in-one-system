"use client"

import React, { useState } from "react"
import { MaintenanceNavTabs } from "@/components/forms/MaintenanceNavTabs"
import { 
  Plus, Minus, FileText, Search, PackageOpen, AlertCircle, 
  Trash2, ArrowUpDown, RefreshCw, X, Calendar, Printer, User, MessageSquare
} from "lucide-react"
import { 
  addMaintenanceStock, 
  withdrawMaintenanceStock, 
  deleteMaintenanceItem, 
  getMaintenanceStockReport 
} from "@/app/actions/maintenance-inventory"

type Item = {
  id: string
  name: string
  location: string
  quantity: number
  unit: string
  createdAt: Date
  updatedAt: Date
}

type StockLog = {
  id: string
  itemId: string
  type: string
  quantity: number
  handledBy: string
  remarks: string | null
  createdAt: Date
  item: {
    name: string
    unit: string
    location: string
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
  const [items, setItems] = useState<Item[]>(initialItems)
  const [logs, setLogs] = useState<StockLog[]>(initialLogs as any)
  const [searchTerm, setSearchTerm] = useState("")
  
  // Add Stock Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isNewItem, setIsNewItem] = useState(false)
  const [selectedAddItemId, setSelectedAddItemId] = useState("")
  const [newItemName, setNewItemName] = useState("")
  const [addQty, setAddQty] = useState(1)
  const [addUnit, setAddUnit] = useState("pcs")
  const [addLocation, setAddLocation] = useState("Pedas")
  const [addHandledBy, setAddHandledBy] = useState(userName)
  const [addRemarks, setAddRemarks] = useState("")
  
  // Withdraw Stock Modal State
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false)
  const [selectedWithdrawItemId, setSelectedWithdrawItemId] = useState("")
  const [withdrawQty, setWithdrawQty] = useState(1)
  const [withdrawHandledBy, setWithdrawHandledBy] = useState(userName)
  const [withdrawRemarks, setWithdrawRemarks] = useState("")
  
  // Report State
  const [isReportSectionOpen, setIsReportSectionOpen] = useState(false)
  const [reportStartDate, setReportStartDate] = useState("")
  const [reportEndDate, setReportEndDate] = useState("")
  const [reportLogs, setReportLogs] = useState<StockLog[]>([])
  const [loadingReport, setLoadingReport] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [successMsg, setSuccessMsg] = useState("")

  // Sort & filter items
  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

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

    const payload = {
      itemId: isNewItem ? null : selectedAddItemId,
      name: isNewItem ? newItemName : "",
      quantity: Number(addQty),
      unit: isNewItem ? addUnit : "",
      handledBy: addHandledBy,
      remarks: addRemarks,
      location: isNewItem ? addLocation : undefined
    }

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
      remarks: withdrawRemarks
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
      endDate: reportEndDate || undefined
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
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
                setAddRemarks("")
              }}
              className="flex items-center px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-sm font-black uppercase tracking-wider transition-colors shadow-md hover:shadow-lg"
            >
              <Plus className="w-4 h-4 mr-2" /> Add Stock (Masuk)
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
              <Minus className="w-4 h-4 mr-2" /> Withdraw Stock (Keluar)
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
            <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Active Inventory Items</h2>
                <p className="text-gray-500 text-sm font-medium mt-0.5">Manage and track live quantities</p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search item name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-sm font-semibold bg-white outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-700">
                <thead className="bg-gray-50 border-b border-gray-100 text-xs font-black uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-6 py-3.5">Item Name</th>
                    <th className="px-6 py-3.5">Location</th>
                    <th className="px-6 py-3.5 text-right">Current Stock</th>
                    <th className="px-6 py-3.5">Unit</th>
                    <th className="px-6 py-3.5">Last Updated</th>
                    <th className="px-6 py-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-gray-500 font-medium bg-gray-50/20">
                        No inventory items found. Add stock to register items.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50/20">
                        <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-900">
                          {item.name}
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
                        <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-xs">
                          {new Date(item.updatedAt).toLocaleString("en-GB")}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <button
                            onClick={() => handleDeleteItem(item.id, item.name)}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                            title="Delete Item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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
          <div className="fixed inset-0 bg-black/55 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 print:hidden">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
              <div className="bg-blue-700 px-6 py-4 flex items-center justify-between text-white">
                <h3 className="font-black uppercase tracking-wider text-sm flex items-center gap-2">
                  <Plus className="w-5 h-5" /> Add Stock (Masuk)
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
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Item Name</label>
                      <input
                        type="text"
                        placeholder="e.g. LED Light Bulb 12W"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-bold outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
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
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Select Item</label>
                    <select
                      value={selectedAddItemId}
                      onChange={(e) => setSelectedAddItemId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-bold outline-none focus:border-blue-500"
                    >
                      <option value="">-- Choose Item --</option>
                      {items.map(item => (
                        <option key={item.id} value={item.id}>
                          {item.name} ({item.location}) ({item.quantity} {item.unit} available)
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
                  <Minus className="w-5 h-5" /> Withdraw Stock (Keluar)
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

      </div>
    </div>
  )
}
