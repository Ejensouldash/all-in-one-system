"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createComplaintCase, CreateComplaintInput } from "@/app/actions/customer-care"
import { ComplaintCategory } from "@prisma/client"
import {
  Save,
  Loader2,
  ArrowLeft,
  AlertCircle,
  Building,
  MapPin,
  Phone,
  User,
  Package,
  CheckCircle2,
  Info,
} from "lucide-react"
import Link from "next/link"

const MALAYSIA_STATES = [
  "Johor",
  "Kedah",
  "Kelantan",
  "Melaka",
  "Negeri Sembilan",
  "Pahang",
  "Perak",
  "Perlis",
  "Pulau Pinang",
  "Sabah",
  "Sarawak",
  "Selangor",
  "Terengganu",
  "Wilayah Persekutuan Kuala Lumpur",
  "Wilayah Persekutuan Labuan",
  "Wilayah Persekutuan Putrajaya",
]

const PIC_DEPARTMENTS = [
  "Customer Care",
  "BD Department",
  "Marketing Department / Social Media",
  "Ordering Department",
  "Online Sales Department",
  "Corporate Department",
]

export function ComplaintIntakeForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [companyName, setCompanyName] = useState("")
  const [outletName, setOutletName] = useState("")
  const [contactName, setContactName] = useState("")
  const [contactPhone, setContactPhone] = useState("")
  const [state, setState] = useState("Negeri Sembilan")
  const [goodsLocationAddress, setGoodsLocationAddress] = useState("")

  const [categories, setCategories] = useState<ComplaintCategory[]>([ComplaintCategory.BOTTLE])
  const [otherIssueDescription, setOtherIssueDescription] = useState("")

  const [affectedQty425ml, setAffectedQty425ml] = useState<string>("")
  const [batchNo425ml, setBatchNo425ml] = useState("")

  const [affectedQty800ml, setAffectedQty800ml] = useState<string>("")
  const [batchNo800ml, setBatchNo800ml] = useState("")

  const [picDepartment, setPicDepartment] = useState("Customer Care")
  const [internalNotes, setInternalNotes] = useState("")

  const toggleCategory = (cat: ComplaintCategory) => {
    if (categories.includes(cat)) {
      setCategories(categories.filter((c) => c !== cat))
    } else {
      setCategories([...categories, cat])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!companyName.trim() || !contactName.trim() || !contactPhone.trim()) {
      setErrorMessage("Company name, contact person, and phone number are required.")
      return
    }

    if (categories.length === 0) {
      setErrorMessage("Please select at least one defect category.")
      return
    }

    setIsSubmitting(true)

    const payload: CreateComplaintInput = {
      companyName,
      outletName,
      contactName,
      contactPhone,
      state,
      goodsLocationAddress,
      categories,
      otherIssueDescription,
      picDepartment,
      internalNotes,
      affectedQty425ml: affectedQty425ml ? Number(affectedQty425ml) : 0,
      batchNo425ml: batchNo425ml.trim() || undefined,
      affectedQty800ml: affectedQty800ml ? Number(affectedQty800ml) : 0,
      batchNo800ml: batchNo800ml.trim() || undefined,
    }

    const res = await createComplaintCase(payload)
    setIsSubmitting(false)

    if (res.success && res.data) {
      router.push(`/business-development/customer-care/${res.data.id}`)
    } else {
      setErrorMessage(res.error || "Failed to submit complaint case.")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 1. Customer & Location Info */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-sm font-black uppercase text-slate-800 tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
          <Building className="w-4 h-4 text-indigo-600" />
          1. Customer & Goods Location Information
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Company Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Petronas Station / Giant Supermarket"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Outlet / Station ID (if applicable)
            </label>
            <input
              type="text"
              placeholder="e.g. Station #4029 / Subang Jaya Outlet"
              value={outletName}
              onChange={(e) => setOutletName(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Contact Person Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Encik Ahmad Razali"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Telephone Number <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 012-3456789"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              State <span className="text-rose-500">*</span>
            </label>
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {MALAYSIA_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              PIC Department <span className="text-rose-500">*</span>
            </label>
            <select
              value={picDepartment}
              onChange={(e) => setPicDepartment(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {PIC_DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Full Address Where Goods Are Located <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={2}
              placeholder="Full physical address where the affected stock is currently held..."
              value={goodsLocationAddress}
              onChange={(e) => setGoodsLocationAddress(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            <p className="text-[11px] text-amber-700 bg-amber-50/80 border border-amber-200 p-2 rounded-lg mt-1 flex items-center gap-1.5 font-medium">
              <Info className="w-3.5 h-3.5 shrink-0 text-amber-600" />
              Note: This address is a customer-reported location of goods. It does not establish the original delivery route.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Defect Categories & Issue Description */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-sm font-black uppercase text-slate-800 tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          2. Defect Categories & Issue Description
        </h2>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-2">
            Complaint Categories (select all that apply) <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { id: ComplaintCategory.BOTTLE, label: "Bottle Body" },
              { id: ComplaintCategory.BOTTLE_CAP, label: "Bottle Cap" },
              { id: ComplaintCategory.WATER, label: "Water Quality" },
              { id: ComplaintCategory.OTHER, label: "Other" },
            ].map((cat) => (
              <label
                key={cat.id}
                className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                  categories.includes(cat.id)
                    ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <input
                  type="checkbox"
                  checked={categories.includes(cat.id)}
                  onChange={() => toggleCategory(cat.id)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>{cat.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Description of Issue / Other Details
          </label>
          <textarea
            rows={3}
            placeholder="Detailed description of physical appearance, leakage, discoloration, smell, or customer statement..."
            value={otherIssueDescription}
            onChange={(e) => setOtherIssueDescription(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
      </div>

      {/* 3. Product Batches & Affected Quantities */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-sm font-black uppercase text-slate-800 tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
          <Package className="w-4 h-4 text-emerald-600" />
          3. Reported Product Sizes & Bottle Batch Numbers
        </h2>
        <p className="text-xs text-slate-500">
          Enter the batch numbers printed on the customer&apos;s bottles. Enter &quot;0&quot; or leave blank if an item size is unaffected.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 425ml Section */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
            <div className="text-xs font-black text-indigo-700 uppercase tracking-wider flex items-center justify-between">
              <span>Bubbles O2 — 425ml</span>
              <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-mono">Line 2</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Affected Bottles Quantity (pcs)
              </label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 12"
                value={affectedQty425ml}
                onChange={(e) => setAffectedQty425ml(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Batch Number (425ml)
              </label>
              <input
                type="text"
                placeholder="e.g. 043926-01 (or N/A if none)"
                value={batchNo425ml}
                onChange={(e) => setBatchNo425ml(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {/* 800ml Section */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
            <div className="text-xs font-black text-indigo-700 uppercase tracking-wider flex items-center justify-between">
              <span>Bubbles O2 — 800ml</span>
              <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-mono">Line 1</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Affected Bottles Quantity (pcs)
              </label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 0"
                value={affectedQty800ml}
                onChange={(e) => setAffectedQty800ml(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Batch Number (800ml)
              </label>
              <input
                type="text"
                placeholder="e.g. 081226-01 (or N/A if none)"
                value={batchNo800ml}
                onChange={(e) => setBatchNo800ml(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Internal Case Notes */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <h2 className="text-sm font-black uppercase text-slate-800 tracking-wider">
          4. Internal Staff Notes (Optional)
        </h2>
        <textarea
          rows={2}
          placeholder="Any initial notes regarding sample handling, customer disposition, or priority..."
          value={internalNotes}
          onChange={(e) => setInternalNotes(e.target.value)}
          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
        />
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-between pt-2">
        <Link
          href="/business-development/customer-care"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Cancel
        </Link>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-sm shadow-indigo-200 transition-all hover:shadow cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Verifying Batches & Creating Case...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Register Complaint & Match Batch
            </>
          )}
        </button>
      </div>
    </form>
  )
}
