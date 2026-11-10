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
  const [itemDescription, setItemDescription] = useState("")
  const [supplierMode, setSupplierMode] = useState<"EXISTING" | "CUSTOM">("EXISTING")
  const [selectedSupplierId, setSelectedSupplierId] = useState("")
  const [supplierName, setSupplierName] = useState("")
  const [quantity, setQuantity] = useState<string>("1")
  const [uom, setUom] = useState<string>("PCS")
  const [customUom, setCustomUom] = useState<string>("")
  const [unitPrice, setUnitPrice] = useState<string>("0.00")
  const [total, setTotal] = useState<string>("0.00")
  const [isManualTotal, setIsManualTotal] = useState(false)
  const [company, setCompany] = useState<string>(COMPANY_OPTIONS[0] || "BOSB")
  const [department, setDepartment] = useState<string>(DEPARTMENT_OPTIONS[0] || "")
  const [remarks, setRemarks] = useState("")

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
      setItemDescription(purchase.itemDescription || "")

      if (purchase.supplierId && suppliers.some((s) => s.id === purchase.supplierId)) {
        setSupplierMode("EXISTING")
        setSelectedSupplierId(purchase.supplierId)
        setSupplierName(purchase.supplierName || "")
      } else {
        setSupplierMode("CUSTOM")
        setSelectedSupplierId("")
        setSupplierName(purchase.supplierName || "")
      }

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

      const comp = (purchase.company || COMPANY_OPTIONS[0] || "BOSB").toUpperCase()
      setCompany(comp)
      setDepartment(purchase.department || DEPARTMENT_OPTIONS[0] || "")
      setRemarks(purchase.remarks || "")
    } else {
      setPurchaseDate(new Date().toISOString().split("T")[0])
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

  // Recalculate total whenever quantity or unitPrice changes (unless manual override is toggled)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!itemDescription.trim()) {
      setError("Please enter the description of the item.")
      return
    }

    const finalSupplierName = supplierName.trim()
    if (!finalSupplierName) {
      setError("Please select or enter a supplier name.")
      return
    }

    const finalQuantity = parseFloat(quantity)
    if (isNaN(finalQuantity) || finalQuantity <= 0) {
      setError("Quantity must be greater than zero.")
      return
    }

    const finalUom = uom === "OTHER" ? customUom.trim().toUpperCase() : uom.trim().toUpperCase()
    if (!finalUom) {
      setError("Please specify the Unit of Material (UOM).")
      return
    }

    const finalUnitPrice = parseFloat(unitPrice)
    if (isNaN(finalUnitPrice) || finalUnitPrice < 0) {
      setError("Unit price must be a valid number.")
      return
    }

    const finalTotal = parseFloat(total)
    if (isNaN(finalTotal) || finalTotal < 0) {
      setError("Total must be a valid number.")
      return
    }

    if (!company.trim()) {
      setError("Please select a company.")
      return
    }

    setLoading(true)

    try {
      const payload = {
        purchaseDate,
        itemDescription: itemDescription.trim(),
        supplierName: finalSupplierName,
        supplierId: supplierMode === "EXISTING" && selectedSupplierId ? selectedSupplierId : null,
        quantity: finalQuantity,
        uom: finalUom,
        unitPrice: finalUnitPrice,
        total: finalTotal,
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

          {/* Row 1: Date of Purchase & Company */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <Building className="w-3.5 h-3.5 text-slate-400" />
                Company <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {COMPANY_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCompany(c)}
                    className={`py-2 text-xs font-bold rounded-xl border text-center transition-all ${
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

          {/* Row 2: Department */}
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

          {/* Row 3: Description of the Item */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-slate-400" />
              Description of the Item <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 5 Gallon Preform Blue 680g, Stretch Film, Motor 3HP 1400RPM"
              value={itemDescription}
              onChange={(e) => setItemDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
            />
          </div>

          {/* Row 4: Supplier */}
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

          {/* Row 5: Quantity, UOM, Unit Price, Total */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80">
            {/* Quantity */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Quantity <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                min="0.001"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="1"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* UOM */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                UOM <span className="text-rose-500">*</span>
              </label>
              <select
                value={uom}
                onChange={(e) => setUom(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                {COMMON_UOMS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
                <option value="OTHER">Other / Custom...</option>
              </select>
              {uom === "OTHER" && (
                <input
                  type="text"
                  placeholder="Specify UOM (e.g. TIN, KG, BBL)"
                  value={customUom}
                  onChange={(e) => setCustomUom(e.target.value.toUpperCase())}
                  className="mt-1.5 w-full px-2.5 py-1.5 text-xs bg-white border border-blue-200 rounded-lg text-slate-800 uppercase font-bold"
                />
              )}
            </div>

            {/* Unit Price */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Unit Price (RM) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">
                  RM
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Total */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-slate-700">
                  Total (RM)
                </label>
                <button
                  type="button"
                  onClick={() => setIsManualTotal(!isManualTotal)}
                  className="text-[10px] text-blue-600 hover:underline"
                  title="Toggle manual total override"
                >
                  {isManualTotal ? "Auto-calculate" : "Manual edit"}
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">
                  RM
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  disabled={!isManualTotal}
                  value={total}
                  onChange={(e) => setTotal(e.target.value)}
                  className={`w-full pl-9 pr-3 py-2 text-xs border rounded-xl font-bold transition-colors ${
                    isManualTotal
                      ? "bg-amber-50/70 border-amber-300 text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      : "bg-blue-50/70 border-blue-200 text-blue-900"
                  }`}
                />
              </div>
            </div>
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
