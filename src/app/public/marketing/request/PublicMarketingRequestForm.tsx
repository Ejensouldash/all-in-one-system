"use client"

import { useState, useEffect } from "react"
import { 
  getAvailableMarketingItemsAndAssets, 
  submitMarketingRequisition,
  MarketingAvailableItem 
} from "@/app/actions/marketing-requests"
import { 
  Layers, 
  Plus, 
  Trash2, 
  Send, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Box, 
  Calendar, 
  User, 
  IdCard, 
  Phone, 
  Mail, 
  Building2, 
  FileText,
  Copy,
  Check,
  Package,
  Sparkles,
  ArrowRight,
  Info
} from "lucide-react"

// Exact department list specified by user
const DEPARTMENTS = [
  "HR",
  "Finance",
  "Corporate",
  "Legal",
  "Marketing",
  "Online Sales",
  "Sales Ordering",
  "Logistic & Warehouse",
  "Business Development & Sales",
  "Kilang Pedas",
  "Kilang Rantau",
  "Information Technology",
  "Project",
  "Maintenance & Facilities",
  "Personal Driver",
  "Security",
  "Health & Safety Environment",
  "Cari Gali",
]

interface RequestedItemRow {
  category: "ASSET" | "INVENTORY" | ""
  selectedItemId: string
  quantity: number | ""
  variantId?: string | null
  variantName?: string | null
  returnDate?: string
}

export function PublicMarketingRequestForm() {
  // Form input states
  const [name, setName] = useState("")
  const [staffId, setStaffId] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [department, setDepartment] = useState("")
  const [purpose, setPurpose] = useState("")
  const [pickupDate, setPickupDate] = useState("")

  // Dynamic items list from backend
  const [availableItems, setAvailableItems] = useState<MarketingAvailableItem[]>([])
  const [loadingItems, setLoadingItems] = useState(true)

  // Multiple item rows
  const [requestedRows, setRequestedRows] = useState<RequestedItemRow[]>([
    { category: "", selectedItemId: "", quantity: 1, returnDate: "" }
  ])

  // Submission states
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successData, setSuccessData] = useState<{
    batchCode: string
    itemCount: number
    requesterName: string
    pickupDate: string
  } | null>(null)
  const [copiedBatch, setCopiedBatch] = useState(false)

  // Today's date for datepicker min attribute
  const todayStr = new Date().toISOString().split("T")[0]

  // Fetch items from DB on mount
  useEffect(() => {
    async function loadCatalog() {
      setLoadingItems(true)
      const res = await getAvailableMarketingItemsAndAssets()
      if (res.success && res.data) {
        setAvailableItems(res.data)
      }
      setLoadingItems(false)
    }
    loadCatalog()
  }, [])

  // Handle adding another item row
  const handleAddRow = () => {
    setRequestedRows(prev => [...prev, { category: "", selectedItemId: "", quantity: 1, returnDate: "" }])
  }

  // Handle removing an item row
  const handleRemoveRow = (index: number) => {
    if (requestedRows.length === 1) {
      setRequestedRows([{ category: "", selectedItemId: "", quantity: 1, returnDate: "" }])
      return
    }
    setRequestedRows(prev => prev.filter((_, i) => i !== index))
  }

  // Update row category selection
  const handleRowCategoryChange = (index: number, category: "ASSET" | "INVENTORY" | "") => {
    setRequestedRows(prev => {
      const next = [...prev]
      next[index] = {
        ...next[index],
        category,
        selectedItemId: "",
        variantId: null,
        variantName: null,
        returnDate: "",
        quantity: 1,
      }
      return next
    })
  }

  // Update row item selection
  const handleRowItemChange = (index: number, itemId: string) => {
    const item = availableItems.find(i => i.id === itemId)
    const firstVariant = item?.hasVariants && item.variants && item.variants.length > 0 ? item.variants[0] : null

    setRequestedRows(prev => {
      const next = [...prev]
      next[index] = {
        ...next[index],
        selectedItemId: itemId,
        category: item ? item.type : next[index].category,
        quantity: 1,
        variantId: firstVariant?.id || null,
        variantName: firstVariant?.variantName || null,
        returnDate: item?.type === "ASSET" ? next[index].returnDate || "" : "",
      }
      return next
    })
  }

  // Update row variant selection
  const handleRowVariantChange = (index: number, variantId: string, variantName: string | null) => {
    setRequestedRows(prev => {
      const next = [...prev]
      next[index] = { ...next[index], variantId: variantId || null, variantName: variantName || null }
      return next
    })
  }

  // Update row return date (for assets)
  const handleRowReturnDateChange = (index: number, returnDate: string) => {
    setRequestedRows(prev => {
      const next = [...prev]
      next[index] = { ...next[index], returnDate }
      return next
    })
  }

  // Update row quantity
  const handleRowQtyChange = (index: number, qty: number | "") => {
    setRequestedRows(prev => {
      const next = [...prev]
      next[index] = { ...next[index], quantity: qty }
      return next
    })
  }

  // Helper to get selected item object
  const getItemDetails = (id: string) => availableItems.find(i => i.id === id)

  // Copy batch code to clipboard
  const handleCopyCode = () => {
    if (successData?.batchCode && typeof window !== "undefined") {
      navigator.clipboard.writeText(successData.batchCode)
      setCopiedBatch(true)
      setTimeout(() => setCopiedBatch(false), 2000)
    }
  }

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    // Validations
    if (!name.trim()) return setErrorMsg("Please provide your full name.")
    if (!staffId.trim()) return setErrorMsg("Please provide your Staff ID.")
    if (!phone.trim()) return setErrorMsg("Please provide your phone number.")
    if (!email.trim()) return setErrorMsg("Please provide your email address.")
    if (!department) return setErrorMsg("Please select your department.")
    if (!purpose.trim()) return setErrorMsg("Please provide the purpose of your request.")
    if (!pickupDate) return setErrorMsg("Please select a pickup date.")

    // Filter valid items
    const validItems = requestedRows.filter(r => r.selectedItemId)
    if (validItems.length === 0) {
      return setErrorMsg("Please select at least one item from the catalog.")
    }

    // Check category selection
    for (let i = 0; i < requestedRows.length; i++) {
      const row = requestedRows[i]
      if (row.selectedItemId && !row.category) {
        return setErrorMsg(`Please select a category for Item #${i + 1}.`)
      }
    }

    // Check return date for asset items
    for (let i = 0; i < requestedRows.length; i++) {
      const row = requestedRows[i]
      if (!row.selectedItemId) continue
      const item = getItemDetails(row.selectedItemId)
      if (row.category === "ASSET" || item?.type === "ASSET") {
        if (!row.returnDate) {
          return setErrorMsg(`Please specify a return date for "${item?.name || `Item #${i + 1}`}".`)
        }
        if (pickupDate && row.returnDate < pickupDate) {
          return setErrorMsg(`Return date for "${item?.name || `Item #${i + 1}`}" cannot be earlier than pickup date (${pickupDate}).`)
        }
      }
    }

    // Check for duplicate item selections
    const itemKeys = validItems.map(r => {
      const item = getItemDetails(r.selectedItemId)
      return item?.hasVariants ? `${r.selectedItemId}_${r.variantId || ""}` : r.selectedItemId
    })
    const hasDuplicates = new Set(itemKeys).size !== itemKeys.length
    if (hasDuplicates) {
      return setErrorMsg("You have selected the same item/variant multiple times. Please adjust the quantity on a single row.")
    }

    // Check stock quantities
    for (const row of validItems) {
      const item = getItemDetails(row.selectedItemId)
      if (!item) continue

      const qty = typeof row.quantity === "number" ? row.quantity : parseInt(String(row.quantity))
      if (!qty || isNaN(qty) || qty <= 0) {
        return setErrorMsg(`Please enter a valid quantity for "${item.name}".`)
      }

      if (item.hasVariants && item.variants && item.variants.length > 0) {
        if (!row.variantId) {
          return setErrorMsg(`Please select a specific size/variant for "${item.name}".`)
        }
        const v = item.variants.find(varItem => varItem.id === row.variantId)
        if (v && qty > v.quantity) {
          return setErrorMsg(
            `Requested quantity for "${item.name} (${v.variantName})" exceeds available stock (${v.quantity} ${item.unit}).`
          )
        }
      } else if (qty > item.availableQuantity) {
        return setErrorMsg(
          `Requested quantity for "${item.name}" exceeds available stock (${item.availableQuantity} ${item.unit}).`
        )
      }
    }

    // Prepare payload
    const formattedItems = validItems.map(r => {
      const item = getItemDetails(r.selectedItemId)!
      return {
        itemId: item.id,
        itemType: item.type,
        quantity: typeof r.quantity === "number" ? r.quantity : parseInt(String(r.quantity)) || 1,
        variantId: r.variantId || null,
        variantName: r.variantName || null,
        returnDate: item.type === "ASSET" ? r.returnDate || null : null,
      }
    })

    setSubmitting(true)

    try {
      const res = await submitMarketingRequisition({
        name: name.trim(),
        staffId: staffId.trim(),
        phone: phone.trim(),
        email: email.trim(),
        department,
        purpose: purpose.trim(),
        pickupDate,
        items: formattedItems,
      })

      if (res.success && res.batchCode) {
        setSuccessData({
          batchCode: res.batchCode,
          itemCount: res.itemCount,
          requesterName: res.requesterName,
          pickupDate: res.pickupDate,
        })
        // Reset form
        setName("")
        setStaffId("")
        setPhone("")
        setEmail("")
        setDepartment("")
        setPurpose("")
        setPickupDate("")
        setRequestedRows([{ category: "", selectedItemId: "", quantity: 1, returnDate: "" }])
      } else {
        setErrorMsg(res.error || "Failed to submit requisition.")
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.")
    } finally {
      setSubmitting(false)
    }
  }

  // SUCCESS VIEW
  if (successData) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-xs border border-white/30">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight">Requisition Submitted!</h2>
          <p className="text-blue-100 text-xs mt-1 font-medium">
            Your marketing request has been dispatched to the Marketing Department.
          </p>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {/* Reference badge */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-center">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Requisition Reference Number
            </span>
            <div className="flex items-center justify-center gap-3">
              <span className="text-2xl sm:text-3xl font-black font-mono text-blue-700 tracking-tight">
                {successData.batchCode}
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition"
                title="Copy Reference"
              >
                {copiedBatch ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Please save this reference number for pickup and tracking with the Marketing team.
            </p>
          </div>

          {/* Details summary */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 font-bold block mb-0.5">REQUESTER:</span>
              <span className="font-bold text-slate-800">{successData.requesterName}</span>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 font-bold block mb-0.5">SCHEDULED PICKUP:</span>
              <span className="font-bold text-slate-800">
                {new Date(successData.pickupDate).toLocaleDateString("en-MY", {
                  weekday: "short",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <Info className="w-4 h-4 text-blue-700 shrink-0" /> What happens next?
            </p>
            <p className="text-slate-600">
              The Marketing team will review your item availability and prepare your requested items. For assets, items must be signed off upon pickup at HQ Store.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setSuccessData(null)}
            className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-black text-white font-black text-xs uppercase tracking-wider transition shadow-md cursor-pointer"
          >
            Submit Another Requisition
          </button>
        </div>
      </div>
    )
  }

  // FORM VIEW
  return (
    <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
      {/* Brand Header */}
      <div className="bg-slate-900 p-6 sm:p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-blue-600/20 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-md bg-blue-600 text-white font-mono font-bold text-[10px] tracking-wide">
              SOP BOSB-MKT-850-002-QR01
            </span>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              Bubbles O2 Marketing
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
            Asset &amp; Merchandise Requisition
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Official departmental requisition form for borrowing marketing assets (furniture, displays, tech) and requesting promotional merchandise.
          </p>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="font-semibold">{errorMsg}</div>
          </div>
        )}

        {/* Section 1: Staff Details */}
        <div>
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600" />
            1. Requester Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Abdul"
                  className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none transition"
                />
              </div>
            </div>

            {/* Staff ID */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Staff ID <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value)}
                  placeholder="e.g. BOMSB001"
                  className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none transition uppercase"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Phone Number <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 012-3456789"
                  className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none transition"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. name@bubbleso2.com"
                  className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none transition"
                />
              </div>
            </div>

            {/* Department Dropdown */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Department <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none transition cursor-pointer"
              >
                <option value="">-- Select Your Department --</option>
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Requisition Schedule & Purpose */}
        <div className="pt-2 border-t border-slate-100">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            2. Schedule &amp; Purpose
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Pickup Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Pickup Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                min={todayStr}
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
                className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none transition"
              />
            </div>

            {/* Purpose */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Purpose / Event / Usage Details <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={2}
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="e.g. VIP Townhall meeting setup at Kilang Rantau / Promotional giveaway for branch visitors"
                className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none transition"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Items Requested & Quantities */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-600" />
              3. Items Requested &amp; Quantities
            </h2>
            <button
              type="button"
              onClick={handleAddRow}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Another Item</span>
            </button>
          </div>

          {loadingItems ? (
            <div className="py-8 flex flex-col items-center justify-center text-slate-400 text-xs">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600 mb-2" />
              <span>Loading available items and assets...</span>
            </div>
          ) : (
            <div className="space-y-3">
              {requestedRows.map((row, index) => {
                const selectedItem = getItemDetails(row.selectedItemId)
                const selectedVariant = selectedItem?.variants?.find((v) => v.id === row.variantId)
                const maxAvailable = selectedVariant ? selectedVariant.quantity : selectedItem ? selectedItem.availableQuantity : 999
                const isAsset = row.category === "ASSET" || selectedItem?.type === "ASSET"
                const isMerchandise = row.category === "INVENTORY" || selectedItem?.type === "INVENTORY"

                return (
                  <div
                    key={index}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                          Item #{index + 1}
                        </span>
                        {isAsset && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                            Asset (Loan)
                          </span>
                        )}
                        {isMerchandise && (
                          <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                            Merchandise
                          </span>
                        )}
                      </div>
                      {requestedRows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(index)}
                          className="text-slate-400 hover:text-rose-600 transition p-1 cursor-pointer"
                          title="Remove row"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      {/* Category Selection */}
                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Category <span className="text-rose-500">*</span>
                        </label>
                        <select
                          required
                          value={row.category || ""}
                          onChange={(e) => handleRowCategoryChange(index, e.target.value as "ASSET" | "INVENTORY" | "")}
                          className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none transition cursor-pointer"
                        >
                          <option value="">-- Category --</option>
                          <option value="ASSET">Asset</option>
                          <option value="INVENTORY">Merchandise</option>
                        </select>
                      </div>

                      {/* Select Item / Asset */}
                      <div
                        className={
                          !row.category
                            ? "sm:col-span-6"
                            : isAsset
                            ? "sm:col-span-4"
                            : selectedItem?.hasVariants
                            ? "sm:col-span-4"
                            : "sm:col-span-6"
                        }
                      >
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Select {row.category === "ASSET" ? "Asset" : row.category === "INVENTORY" ? "Merchandise" : "Item / Asset"}{" "}
                          <span className="text-rose-500">*</span>
                        </label>
                        {!row.category ? (
                          <select
                            disabled
                            className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                          >
                            <option value="">-- Select Category First --</option>
                          </select>
                        ) : (
                          <select
                            required
                            value={row.selectedItemId}
                            onChange={(e) => handleRowItemChange(index, e.target.value)}
                            className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none transition cursor-pointer"
                          >
                            <option value="">
                              {row.category === "ASSET" ? "-- Choose an Asset --" : "-- Choose Merchandise --"}
                            </option>
                            {availableItems
                              .filter((i) => i.type === row.category)
                              .map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.name}{" "}
                                  {item.hasVariants
                                    ? "(Multiple sizes/options)"
                                    : `(Available: ${item.availableQuantity} ${item.unit})`}
                                </option>
                              ))}
                          </select>
                        )}
                      </div>

                      {/* Return Date (Asset only) */}
                      {isAsset && (
                        <div className="sm:col-span-3">
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Return Date <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="date"
                            required
                            min={pickupDate || todayStr}
                            value={row.returnDate || ""}
                            onChange={(e) => handleRowReturnDateChange(index, e.target.value)}
                            className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none transition"
                          />
                        </div>
                      )}

                      {/* Variant Dropdown if merchandise has variants */}
                      {isMerchandise && selectedItem?.hasVariants && (
                        <div className="sm:col-span-3">
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Size / Variant <span className="text-rose-500">*</span>
                          </label>
                          <select
                            required
                            value={row.variantId || ""}
                            onChange={(e) => {
                              const vId = e.target.value
                              const found = selectedItem.variants?.find((v) => v.id === vId)
                              handleRowVariantChange(index, vId, found?.variantName || null)
                            }}
                            className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50/50 text-indigo-900 focus:ring-2 focus:ring-indigo-600 focus:outline-none transition cursor-pointer"
                          >
                            <option value="">-- Select Variant --</option>
                            {selectedItem.variants?.map((v) => (
                              <option key={v.id} value={v.id} disabled={v.quantity <= 0}>
                                {v.variantName} {v.quantity > 0 ? `(${v.quantity} in stock)` : "(Out of stock)"}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Quantity Input */}
                      <div
                        className={
                          !row.category
                            ? "sm:col-span-3"
                            : isAsset || selectedItem?.hasVariants
                            ? "sm:col-span-2"
                            : "sm:col-span-3"
                        }
                      >
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Quantity {selectedItem && `(${selectedItem.unit})`} <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="number"
                          required
                          min={1}
                          max={maxAvailable}
                          value={row.quantity}
                          onChange={(e) => {
                            const val = e.target.value
                            if (val === "") {
                              handleRowQtyChange(index, "")
                            } else {
                              const parsed = parseInt(val)
                              handleRowQtyChange(index, isNaN(parsed) ? "" : parsed)
                            }
                          }}
                          onBlur={() => {
                            if (row.quantity === "" || Number(row.quantity) < 1) {
                              handleRowQtyChange(index, 1)
                            }
                          }}
                          className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none transition"
                        />
                      </div>
                    </div>

                    {/* Stock status indicator pill */}
                    {selectedItem && (
                      <div className="flex flex-wrap items-center justify-between text-[11px] pt-1 gap-2">
                        <span className="inline-flex items-center gap-2 font-bold">
                          {selectedItem.type === "ASSET" ? (
                            <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 uppercase text-[10px]">
                              Reusable Asset Loan
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 uppercase text-[10px]">
                              Merchandise Stock Out
                            </span>
                          )}
                          <span className="text-slate-500 font-medium">
                            Location: {selectedItem.location}
                          </span>
                          {selectedItem.type === "ASSET" && row.returnDate && (
                            <span className="text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              Return by: {new Date(row.returnDate).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })}
                            </span>
                          )}
                        </span>
                        <span
                          className={`font-mono font-bold ${
                            maxAvailable > 0
                              ? "text-emerald-700"
                              : "text-rose-600"
                          }`}
                        >
                          {selectedVariant ? `${selectedVariant.quantity} ${selectedItem.unit} in store for this variant` : `${selectedItem.availableQuantity} ${selectedItem.unit} total in store`}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-4 border-t border-slate-100">
          <button
            type="submit"
            disabled={submitting || loadingItems}
            className="w-full py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-500/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Submitting Requisition...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Submit Requisition</span>
              </>
            )}
          </button>
          <p className="text-[11px] text-center text-slate-400 mt-2">
            By submitting, you agree to return borrowed assets in good condition according to SOP guidelines.
          </p>
        </div>
      </form>
    </div>
  )
}
