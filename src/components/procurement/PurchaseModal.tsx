"use client"

import { useState, useEffect } from "react"
import {
  X,
  ShoppingBag,
  Building,
  Calendar,
  Layers,
  DollarSign,
  Package,
  FileText,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Briefcase,
  Plus,
  Trash2,
  Hash,
} from "lucide-react"
import { createPurchase, updatePurchase } from "@/app/actions/procurement"
import {
  COMPANY_OPTIONS,
  DEPARTMENT_OPTIONS,
} from "@/components/procurement/procurement-constants"

interface SupplierOption {
  id: string
  name: string
}

export interface PurchaseItemRow {
  id?: string
  description: string
  quantity: number
  uom: string
  unitPrice: number
  total: number
}

interface PurchaseModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  purchase?: any | null
  suppliers: SupplierOption[]
}

const COMMON_UOMS = [
  "PCS",
  "BOX",
  "KG",
  "LITER",
  "ROLL",
  "UNIT",
  "SET",
  "PACK",
  "METER",
  "CAN",
  "PAIR",
  "DRUM",
  "PALLET",
  "BAG",
  "CARTON",
]

export function PurchaseModal({
  isOpen,
  onClose,
  onSuccess,
  purchase,
  suppliers,
}: PurchaseModalProps) {
  const isEditing = Boolean(purchase?.id)

  const [purchaseDate, setPurchaseDate] = useState(
    new Date().toISOString().split("T")[0]
  )
  const [poNumber, setPoNumber] = useState("")
  const [supplierMode, setSupplierMode] = useState<"EXISTING" | "CUSTOM">("EXISTING")
  const [selectedSupplierId, setSelectedSupplierId] = useState("")
  const [supplierName, setSupplierName] = useState("")
  const [company, setCompany] = useState<string>(COMPANY_OPTIONS[0] || "BOSB")
  const [department, setDepartment] = useState<string>(DEPARTMENT_OPTIONS[0] || "")
  const [remarks, setRemarks] = useState("")

  // Item List State (Multi-Item)
  const [itemsList, setItemsList] = useState<PurchaseItemRow[]>([])

  // Draft Item Inputs (for adding to list)
  const [itemDescription, setItemDescription] = useState("")
  const [quantity, setQuantity] = useState<string>("1")
  const [uom, setUom] = useState<string>("PCS")
  const [customUom, setCustomUom] = useState<string>("")
  const [unitPrice, setUnitPrice] = useState<string>("0.00")
  const [total, setTotal] = useState<string>("0.00")
  const [isManualTotal, setIsManualTotal] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize or reset form state
  useEffect(() => {
    if (!isOpen) {
      setError(null)
      return
    }

    if (purchase) {
      const pDate = purchase.purchaseDate
        ? new Date(purchase.purchaseDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0]
      setPurchaseDate(pDate)
      setPoNumber(purchase.poNumber || "")

      if (purchase.supplierId && suppliers.some((s) => s.id === purchase.supplierId)) {
        setSupplierMode("EXISTING")
        setSelectedSupplierId(purchase.supplierId)
        setSupplierName(purchase.supplierName || "")
      } else {
        setSupplierMode("CUSTOM")
        setSelectedSupplierId("")
        setSupplierName(purchase.supplierName || "")
      }

      const comp = (purchase.company || COMPANY_OPTIONS[0] || "BOSB").toUpperCase()
      setCompany(comp)
      setDepartment(purchase.department || DEPARTMENT_OPTIONS[0] || "")
      setRemarks(purchase.remarks || "")

      // Populate multi-item rows
      if (Array.isArray(purchase.items) && purchase.items.length > 0) {
        setItemsList(
          purchase.items.map((it: any, idx: number) => ({
            id: it.id || String(idx + 1),
            description: it.description || "",
            quantity: Number(it.quantity) || 1,
            uom: it.uom || "PCS",
            unitPrice: Number(it.unitPrice) || 0,
            total: Number(it.total) || 0,
          }))
        )
        setItemDescription("")
      } else {
        setItemsList([])
        setItemDescription(purchase.itemDescription || "")
        setQuantity(String(purchase.quantity ?? 1))
        const upperUom = (purchase.uom || "PCS").toUpperCase()
        if (COMMON_UOMS.includes(upperUom)) {
          setUom(upperUom)
          setCustomUom("")
        } else {
          setUom("OTHER")
          setCustomUom(purchase.uom || "")
        }
        const uPrice = Number(purchase.unitPrice || 0)
        const tVal = Number(purchase.total || 0)
        setUnitPrice(uPrice.toFixed(2))
        setTotal(tVal.toFixed(2))
        setIsManualTotal(Math.abs(Number(purchase.quantity) * uPrice - tVal) > 0.01)
      }
    } else {
      setPurchaseDate(new Date().toISOString().split("T")[0])
      setPoNumber("")
      setItemDescription("")
      if (suppliers.length > 0) {
        setSupplierMode("EXISTING")
        setSelectedSupplierId(suppliers[0].id)
        setSupplierName(suppliers[0].name)
      } else {
        setSupplierMode("CUSTOM")
        setSelectedSupplierId("")
        setSupplierName("")
      }
      setItemsList([])
      setQuantity("1")
      setUom("PCS")
      setCustomUom("")
      setUnitPrice("0.00")
      setTotal("0.00")
      setIsManualTotal(false)
      setCompany(COMPANY_OPTIONS[0] || "BOSB")
      setDepartment(DEPARTMENT_OPTIONS[0] || "")
      setRemarks("")
    }
    setError(null)
  }, [isOpen, purchase, suppliers])

  // Recalculate draft total whenever quantity or unitPrice changes (unless manual override is toggled)
  useEffect(() => {
    if (!isManualTotal) {
      const q = parseFloat(quantity) || 0
      const up = parseFloat(unitPrice) || 0
      const computed = (q * up).toFixed(2)
      setTotal(computed)
    }
  }, [quantity, unitPrice, isManualTotal])

  const handleSupplierSelect = (id: string) => {
    setSelectedSupplierId(id)
    const match = suppliers.find((s) => s.id === id)
    if (match) {
      setSupplierName(match.name)
    }
  }

  // Handle adding an item row to itemsList
  const handleAddItem = () => {
    if (!itemDescription.trim()) {
      setError("Please enter the description of the item before adding.")
      return
    }
    const q = parseFloat(quantity)
    if (isNaN(q) || q <= 0) {
      setError("Item quantity must be greater than zero.")
      return
    }
    const finalUom = uom === "OTHER" ? customUom.trim().toUpperCase() : uom.trim().toUpperCase()
    if (!finalUom) {
      setError("Please specify the Unit of Material (UOM).")
      return
    }
    const up = parseFloat(unitPrice)
    if (isNaN(up) || up < 0) {
      setError("Unit price must be a valid number.")
      return
    }
    const tot = parseFloat(total)

    const newItem: PurchaseItemRow = {
      id: Math.random().toString(36).substring(2, 9),
      description: itemDescription.trim(),
      quantity: q,
      uom: finalUom,
      unitPrice: up,
      total: !isNaN(tot) && tot > 0 ? tot : q * up,
    }

    setItemsList((prev) => [...prev, newItem])
    setItemDescription("")
    setQuantity("1")
    setUnitPrice("0.00")
    setTotal("0.00")
    setIsManualTotal(false)
    setError(null)
  }

  const handleRemoveItem = (idToRemove?: string, indexToRemove?: number) => {
    setItemsList((prev) => prev.filter((it, idx) => (idToRemove ? it.id !== idToRemove : idx !== indexToRemove)))
  }

  // Calculate live grand total
  const grandTotal = itemsList.reduce((sum, it) => sum + (Number(it.total) || 0), 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const finalSupplierName = supplierName.trim()
    if (!finalSupplierName) {
      setError("Please select or enter a supplier name.")
      return
    }

    if (!company.trim()) {
      setError("Please select a company.")
      return
    }

    let finalItems: PurchaseItemRow[] = [...itemsList]

    // If no items were added via "+ Add Item", but user filled the draft input, use that
    if (finalItems.length === 0) {
      if (!itemDescription.trim()) {
        setError("Please add at least one item row or enter item description.")
        return
      }
      const q = parseFloat(quantity)
      if (isNaN(q) || q <= 0) {
        setError("Quantity must be greater than zero.")
        return
      }
      const finalUom = uom === "OTHER" ? customUom.trim().toUpperCase() : uom.trim().toUpperCase()
      if (!finalUom) {
        setError("Please specify the Unit of Material (UOM).")
        return
      }
      const up = parseFloat(unitPrice)
      if (isNaN(up) || up < 0) {
        setError("Unit price must be a valid number.")
        return
      }
      const tot = parseFloat(total)
      finalItems = [
        {
          description: itemDescription.trim(),
          quantity: q,
          uom: finalUom,
          unitPrice: up,
          total: !isNaN(tot) && tot > 0 ? tot : q * up,
        },
      ]
    }

    const calculatedTotal = finalItems.reduce((acc, it) => acc + it.total, 0)
    const primaryDescription =
      finalItems.length === 1
        ? finalItems[0].description
        : `${finalItems[0].description} (+${finalItems.length - 1} items)`

    setLoading(true)

    try {
      const payload = {
        purchaseDate,
        poNumber: poNumber.trim() || undefined,
        itemDescription: primaryDescription,
        items: finalItems,
        supplierName: finalSupplierName,
        supplierId: supplierMode === "EXISTING" && selectedSupplierId ? selectedSupplierId : null,
        quantity: finalItems.reduce((acc, it) => acc + it.quantity, 0),
        uom: finalItems[0]?.uom || "PCS",
        unitPrice: finalItems[0]?.unitPrice || 0,
        total: calculatedTotal,
        company: company.trim().toUpperCase(),
        department: department.trim() || undefined,
        remarks: remarks.trim() || undefined,
      }

      let res: any
      if (isEditing) {
        res = await updatePurchase(purchase.id, payload)
      } else {
        res = await createPurchase(payload)
      }

      if (res.success) {
        onSuccess()
        onClose()
      } else {
        setError(res.error || "Failed to save purchase record.")
      }
    } catch (err: any) {
      console.error("Error submitting purchase:", err)
      setError(err.message || "An unexpected error occurred.")
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-xs">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {isEditing ? "Edit Purchase Record" : "Add New Purchase"}
              </h2>
              <p className="text-xs text-slate-500">
                Record purchases across companies (BOSB, BOMSB, NRHO, BODG) and departments
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2.5 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Row 1: Date of Purchase, PO Number & Company */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Date of Purchase <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-slate-400" />
                PO Number <span className="text-[10px] font-normal text-slate-400">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. PO002144"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                Company <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-4 gap-1">
                {COMPANY_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCompany(c)}
                    className={`py-2 text-[11px] font-bold rounded-xl border text-center transition-all ${
                      company === c
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Row 2: Department & Supplier */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
              >
                {DEPARTMENT_OPTIONS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  Supplier <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      setSupplierMode("EXISTING")
                      if (suppliers.length > 0 && !selectedSupplierId) {
                        handleSupplierSelect(suppliers[0].id)
                      }
                    }}
                    className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                      supplierMode === "EXISTING"
                        ? "bg-blue-100 text-blue-700 font-bold"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Existing Supplier
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSupplierMode("CUSTOM")
                      setSelectedSupplierId("")
                    }}
                    className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                      supplierMode === "CUSTOM"
                        ? "bg-blue-100 text-blue-700 font-bold"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Custom / New Supplier
                  </button>
                </div>
              </div>

              {supplierMode === "EXISTING" && suppliers.length > 0 ? (
                <select
                  value={selectedSupplierId}
                  onChange={(e) => handleSupplierSelect(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                >
                  <option value="" disabled>
                    -- Select a registered supplier --
                  </option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  required
                  placeholder="Enter supplier / vendor name..."
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                />
              )}
            </div>
          </div>

          {/* Row 3: Add Items / Products Entry */}
          <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/90 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-blue-600" />
                Description of the Item & Items List
              </label>
              {itemsList.length > 0 && (
                <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  {itemsList.length} {itemsList.length === 1 ? "Item" : "Items"} in List
                </span>
              )}
            </div>

            {/* Description input */}
            <div>
              <input
                type="text"
                placeholder="Description of the item (e.g. 5 Gallon Preform Blue 680g, Stretch Film, Motor 3HP)..."
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
              />
            </div>

            {/* Qty, UOM, Unit Price, Total & Add Item Button */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 items-end">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">Quantity</label>
                <input
                  type="number"
                  step="any"
                  min="0.001"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="1"
                  className="w-full px-2.5 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">UOM</label>
                <select
                  value={uom}
                  onChange={(e) => setUom(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {COMMON_UOMS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                  <option value="OTHER">Other...</option>
                </select>
                {uom === "OTHER" && (
                  <input
                    type="text"
                    placeholder="UOM"
                    value={customUom}
                    onChange={(e) => setCustomUom(e.target.value.toUpperCase())}
                    className="mt-1 w-full px-2 py-1 text-[11px] bg-white border border-blue-200 rounded-lg uppercase font-bold"
                  />
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">Unit Price (RM)</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">RM</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-2 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-bold text-slate-600">Total (RM)</label>
                  <button
                    type="button"
                    onClick={() => setIsManualTotal(!isManualTotal)}
                    className="text-[9px] text-blue-600 hover:underline"
                  >
                    {isManualTotal ? "Auto" : "Edit"}
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">RM</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    disabled={!isManualTotal}
                    value={total}
                    onChange={(e) => setTotal(e.target.value)}
                    className={`w-full pl-8 pr-2 py-2 text-xs rounded-xl font-bold ${
                      isManualTotal ? "bg-amber-50 border border-amber-300 text-amber-900" : "bg-slate-100 border border-slate-200 text-slate-900"
                    }`}
                  />
                </div>
              </div>

              <div className="col-span-2 sm:col-span-1">
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-98 rounded-xl shadow-sm transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Item</span>
                </button>
              </div>
            </div>

            {/* Added Items Table Grid */}
            {itemsList.length > 0 && (
              <div className="mt-3 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/80 text-[10px] uppercase font-bold text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3 text-center w-8">#</th>
                      <th className="py-2 px-3">Description</th>
                      <th className="py-2 px-3 text-center">Qty & UOM</th>
                      <th className="py-2 px-3 text-right">Unit Price</th>
                      <th className="py-2 px-3 text-right">Total (RM)</th>
                      <th className="py-2 px-2 text-center w-10">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {itemsList.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-slate-50/70">
                        <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                        <td className="py-2 px-3 font-semibold text-slate-800">{item.description}</td>
                        <td className="py-2 px-3 text-center text-slate-700 font-mono">{item.quantity} {item.uom}</td>
                        <td className="py-2 px-3 text-right text-slate-700 font-mono">RM {Number(item.unitPrice).toFixed(2)}</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900 font-mono">RM {Number(item.total).toFixed(2)}</td>
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id, idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                            title="Remove row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-blue-50/60 border-t border-blue-100">
                    <tr>
                      <td colSpan={4} className="py-2 px-3 text-right font-bold text-slate-700 text-xs">
                        Grand Total ({itemsList.length} {itemsList.length === 1 ? "Item" : "Items"}):
                      </td>
                      <td className="py-2 px-3 text-right font-extrabold text-blue-700 font-mono text-sm">
                        RM {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Row 6: Remarks */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Remarks / Notes <span className="text-[10px] font-normal text-slate-400">(Optional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="e.g. PO No. PO002144, Urgent maintenance spare, Delivered to store..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isEditing ? "Update Purchase" : "Save Purchase"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
