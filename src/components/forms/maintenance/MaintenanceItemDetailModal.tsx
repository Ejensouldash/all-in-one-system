"use client"

import React, { useState, useEffect, useRef } from "react"
import {
  X, Upload, Image as ImageIcon, ZoomIn, Package,
  ArrowDownRight, ArrowUpRight, Calendar, User,
  Clock, FileText, AlertCircle, RefreshCw, Plus, Minus, Tag,
  CheckCircle2, DollarSign
} from "lucide-react"
import { getMaintenanceItemHistory, updateMaintenanceItemImage } from "@/app/actions/maintenance-inventory"

export type InventoryItem = {
  id: string
  name: string
  location: string
  department?: string | null
  quantity: number
  unit: string
  pricePerUnit: number
  imageUrl?: string | null
  createdAt: Date | string
  updatedAt: Date | string
}

type Props = {
  isOpen: boolean
  onClose: () => void
  item: InventoryItem | null
  onOpenAddStock?: (item: InventoryItem) => void
  onOpenWithdrawStock?: (item: InventoryItem) => void
  onItemUpdated?: (updated: InventoryItem) => void
}

export function MaintenanceItemDetailModal({
  isOpen,
  onClose,
  item,
  onOpenAddStock,
  onOpenWithdrawStock,
  onItemUpdated,
}: Props) {
  const [logs, setLogs] = useState<any[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [activeLogTab, setActiveLogTab] = useState<"ALL" | "IN" | "OUT">("ALL")
  
  // Image state
  const [currentImage, setCurrentImage] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [isZoomOpen, setIsZoomOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Sync state when item changes
  useEffect(() => {
    if (!item || !isOpen) return

    setCurrentImage(item.imageUrl || null)
    setUploadMsg(null)
    setLogs([])
    setLoadingLogs(true)

    getMaintenanceItemHistory(item.id).then((res) => {
      if (res.success && res.data) {
        setLogs(res.data.logs || [])
        if (res.data.imageUrl) {
          setCurrentImage(res.data.imageUrl)
        }
      }
      setLoadingLogs(false)
    }).catch(() => {
      setLoadingLogs(false)
    })
  }, [item?.id, isOpen])

  if (!isOpen || !item) return null

  // Handle image upload directly in popup
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setUploadMsg(null)

    const formData = new FormData()
    formData.append("photo", file)

    const res = await updateMaintenanceItemImage(item.id, formData)
    if (res.success && res.data) {
      setCurrentImage(res.data.imageUrl || null)
      setUploadMsg({ type: "success", text: "Photo uploaded successfully!" })
      if (onItemUpdated) {
        onItemUpdated({
          ...item,
          imageUrl: res.data.imageUrl,
        })
      }
    } else {
      setUploadMsg({ type: "error", text: res.error || "Failed to upload photo." })
    }
    setIsUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const filteredLogs = logs.filter((log) => {
    if (activeLogTab === "ALL") return true
    return log.type === activeLogTab
  })

  const totalValue = (item.quantity * (item.pricePerUnit || 0)).toFixed(2)

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 px-6 py-5 flex items-center justify-between text-white border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-blue-600/30 p-2.5 rounded-2xl border border-blue-400/20 text-blue-300 shrink-0">
              <Package className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight truncate">
                  {item.name}
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wide border ${
                  (item.department || "BOS") === "NRHO"
                    ? "bg-purple-500/20 border-purple-400/30 text-purple-200"
                    : (item.department || "BOS") === "BOM"
                    ? "bg-teal-500/20 border-teal-400/30 text-teal-200"
                    : "bg-amber-500/20 border-amber-400/30 text-amber-200"
                }`}>
                  {item.department || "BOS"}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wide bg-blue-500/20 border border-blue-400/30 text-blue-200">
                  {item.location}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wide ${
                  item.quantity > 0 
                    ? "bg-emerald-500/20 border border-emerald-400/30 text-emerald-300"
                    : "bg-red-500/20 border border-red-400/30 text-red-300"
                }`}>
                  {item.quantity > 0 ? `${item.quantity} ${item.unit} in stock` : "Out of stock"}
                </span>
              </div>
              <p className="text-xs text-gray-300 font-medium mt-0.5 flex items-center gap-2">
                <span>ID: {item.id.slice(0, 8)}...</span>
                <span>•</span>
                <span>Last updated: {new Date(item.updatedAt).toLocaleString("en-GB")}</span>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors shrink-0 ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          
          {/* Top Section: Photo & Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
            
            {/* Left: Image Card (4 cols) */}
            <div className="md:col-span-5 flex flex-col">
              <div className="relative group bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden flex-1 min-h-[220px] flex items-center justify-center">
                {currentImage ? (
                  <>
                    <img
                      src={currentImage}
                      alt={item.name}
                      className="w-full h-full max-h-[260px] object-cover cursor-pointer transition-transform duration-300 group-hover:scale-105"
                      onClick={() => setIsZoomOpen(true)}
                    />
                    <div 
                      onClick={() => setIsZoomOpen(true)}
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white cursor-pointer"
                    >
                      <ZoomIn className="w-5 h-5" />
                      <span className="text-xs font-bold uppercase tracking-wider">Click to Zoom</span>
                    </div>
                  </>
                ) : (
                  <div className="p-8 text-center flex flex-col items-center justify-center text-gray-400">
                    <div className="p-3 bg-gray-100 rounded-full mb-2">
                      <ImageIcon className="w-8 h-8 text-gray-400" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      No Photo Uploaded
                    </span>
                    <span className="text-[11px] text-gray-400 mt-1">
                      Upload an image for visual verification
                    </span>
                  </div>
                )}

                {/* Upload Spinner overlay */}
                {isUploading && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white z-10">
                    <RefreshCw className="w-6 h-6 animate-spin mb-1 text-blue-400" />
                    <span className="text-xs font-bold uppercase">Uploading...</span>
                  </div>
                )}
              </div>

              {/* Direct Photo Action Button */}
              <div className="mt-2.5 flex items-center justify-between gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider rounded-xl transition-colors border border-slate-200 disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {currentImage ? "Change Photo" : "+ Upload Photo"}
                </button>
              </div>

              {/* Upload Notification Msg */}
              {uploadMsg && (
                <div className={`mt-2 p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                  uploadMsg.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                }`}>
                  {uploadMsg.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  )}
                  <span>{uploadMsg.text}</span>
                </div>
              )}
            </div>

            {/* Right: Key Details & Metrics (7 cols) */}
            <div className="md:col-span-7 flex flex-col justify-between gap-3">
              <div className="grid grid-cols-2 gap-3">
                
                {/* Metric: Current Stock */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                    Current Balance
                  </span>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-gray-900">{item.quantity}</span>
                    <span className="text-xs font-bold text-gray-500 uppercase">{item.unit}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1">
                    <span>Location: <strong className="text-gray-700">{item.location}</strong></span>
                    <span>Dept: <strong className="text-amber-700 font-black">{item.department || "BOS"}</strong></span>
                  </div>
                </div>

                {/* Metric: Price Per Unit */}
                <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-100">
                  <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block flex items-center gap-1">
                    <Tag className="w-3 h-3" /> Unit Price
                  </span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xs font-bold text-blue-700">RM</span>
                    <span className="text-2xl font-black text-blue-900">
                      {(item.pricePerUnit || 0).toFixed(2)}
                    </span>
                    <span className="text-[11px] text-blue-500 font-semibold">/{item.unit}</span>
                  </div>
                  <span className="text-[10px] text-blue-600/70 mt-1 block font-medium">
                    Latest restock unit cost
                  </span>
                </div>

                {/* Metric: Total Stock Value */}
                <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100">
                  <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block flex items-center gap-1">
                    <DollarSign className="w-3 h-3" /> Total Stock Value
                  </span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xs font-bold text-emerald-700">RM</span>
                    <span className="text-2xl font-black text-emerald-900">
                      {totalValue}
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-600 mt-1 block font-medium">
                    {item.quantity} {item.unit} × RM {(item.pricePerUnit || 0).toFixed(2)}
                  </span>
                </div>

                {/* Metric: Registered Info */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Last Active
                  </span>
                  <div className="mt-1">
                    <p className="text-xs font-black text-gray-800">
                      {new Date(item.updatedAt).toLocaleDateString("en-GB")}
                    </p>
                    <p className="text-[11px] font-medium text-gray-500">
                      {new Date(item.updatedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1 block">
                    Created: {new Date(item.createdAt).toLocaleDateString("en-GB")}
                  </span>
                </div>

              </div>

              {/* Quick Restock / Withdraw Buttons */}
              <div className="pt-2 flex flex-wrap gap-2.5">
                {onOpenAddStock && (
                  <button
                    onClick={() => {
                      onClose()
                      onOpenAddStock(item)
                    }}
                    className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-sm"
                  >
                    <Plus className="w-4 h-4" /> Add Stock (IN)
                  </button>
                )}

                {onOpenWithdrawStock && (
                  <button
                    onClick={() => {
                      onClose()
                      onOpenWithdrawStock(item)
                    }}
                    disabled={item.quantity === 0}
                    className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-sm disabled:opacity-50"
                  >
                    <Minus className="w-4 h-4" /> Withdraw (OUT)
                  </button>
                )}
              </div>

            </div>
          </div>

          {/* Bottom Section: Records of Ins and Outs (Audit History) */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
            <div className="p-4 bg-gray-50/80 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <h4 className="text-sm font-black uppercase tracking-wider text-gray-900">
                  Records of Ins & Outs
                </h4>
                <span className="px-2 py-0.5 rounded-full text-xs font-black bg-gray-200 text-gray-700">
                  {logs.length}
                </span>
              </div>

              {/* Tabs for All / IN / OUT */}
              <div className="flex items-center bg-gray-200/70 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setActiveLogTab("ALL")}
                  className={`px-3 py-1 rounded-lg transition-colors uppercase ${
                    activeLogTab === "ALL" ? "bg-white text-gray-900 shadow-xs" : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  All ({logs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLogTab("IN")}
                  className={`px-3 py-1 rounded-lg transition-colors uppercase flex items-center gap-1 ${
                    activeLogTab === "IN" ? "bg-emerald-600 text-white shadow-xs" : "text-gray-600 hover:text-emerald-700"
                  }`}
                >
                  <ArrowDownRight className="w-3 h-3" />
                  IN ({logs.filter(l => l.type === "IN").length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLogTab("OUT")}
                  className={`px-3 py-1 rounded-lg transition-colors uppercase flex items-center gap-1 ${
                    activeLogTab === "OUT" ? "bg-red-600 text-white shadow-xs" : "text-gray-600 hover:text-red-700"
                  }`}
                >
                  <ArrowUpRight className="w-3 h-3" />
                  OUT ({logs.filter(l => l.type === "OUT").length})
                </button>
              </div>
            </div>

            {/* Logs Table */}
            <div className="overflow-x-auto max-h-[300px]">
              {loadingLogs ? (
                <div className="p-8 text-center text-gray-500 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                  <span className="text-xs font-bold uppercase">Loading stock movement ledger...</span>
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-xs font-semibold">
                  No stock records found for this filter.
                </div>
              ) : (
                <table className="w-full text-xs text-left text-gray-700">
                  <thead className="bg-gray-100/70 border-b border-gray-200 uppercase font-black text-gray-500 tracking-wider sticky top-0">
                    <tr>
                      <th className="px-4 py-2.5">Date & Time</th>
                      <th className="px-3 py-2.5 text-center">Type</th>
                      <th className="px-3 py-2.5 text-right">Quantity</th>
                      <th className="px-3 py-2.5 text-right">Unit Price</th>
                      <th className="px-3 py-2.5 text-right">Total Price</th>
                      <th className="px-4 py-2.5">Handled By</th>
                      <th className="px-4 py-2.5">Remarks / Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {filteredLogs.map((log) => {
                      const isIn = log.type === "IN"
                      return (
                        <tr key={log.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap text-gray-600 font-semibold">
                            {new Date(log.createdAt).toLocaleString("en-GB")}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide uppercase ${
                              isIn 
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200" 
                                : "bg-red-100 text-red-800 border border-red-200"
                            }`}>
                              {isIn ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                              {log.type}
                            </span>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-right font-black text-gray-900">
                            <span className={isIn ? "text-emerald-700" : "text-red-700"}>
                              {isIn ? `+${log.quantity}` : `-${log.quantity}`} {item.unit}
                            </span>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-right font-semibold text-gray-700">
                            {log.pricePerUnit !== null && log.pricePerUnit !== undefined ? (
                              <span>RM {Number(log.pricePerUnit).toFixed(2)}</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-right font-black text-gray-900">
                            {log.totalPrice !== null && log.totalPrice !== undefined ? (
                              <span>RM {Number(log.totalPrice).toFixed(2)}</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-800">
                            <span className="inline-flex items-center gap-1">
                              <User className="w-3 h-3 text-gray-400" />
                              {log.handledBy}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600 max-w-[220px] truncate" title={log.remarks || ""}>
                            {log.remarks || "-"}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-3.5 border-t border-gray-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-xs"
          >
            Close
          </button>
        </div>

      </div>

      {/* Lightbox / Zoom modal */}
      {isZoomOpen && currentImage && (
        <div 
          onClick={() => setIsZoomOpen(false)}
          className="fixed inset-0 bg-black/85 z-60 flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={currentImage}
              alt={item.name}
              className="max-h-[85vh] max-w-full rounded-2xl shadow-2xl object-contain"
            />
            <button
              onClick={() => setIsZoomOpen(false)}
              className="absolute top-3 right-3 p-2 bg-black/70 hover:bg-black text-white rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="absolute bottom-3 left-3 bg-black/70 text-white px-3 py-1.5 rounded-lg text-xs font-bold">
              {item.name} ({item.location})
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
