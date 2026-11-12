"use client"

import { useState, useEffect } from "react"
import { X, Building2, Phone, Mail, Clock, FileText, Loader2, Save, User, MapPin, Briefcase, Building } from "lucide-react"
import { ProcurementPaymentTerm } from "@prisma/client"
import { PAYMENT_TERMS_CONFIG, BRANCH_OPTIONS, DEPARTMENT_OPTIONS, COMPANY_OPTIONS } from "./procurement-constants"
import { createSupplier, updateSupplier } from "@/app/actions/procurement"

interface SupplierModalProps {
  isOpen: boolean
  onClose: () => void
  supplierToEdit?: any
  onSaved: () => void
}

export function SupplierModal({
  isOpen,
  onClose,
  supplierToEdit,
  onSaved,
}: SupplierModalProps) {
  const [name, setName] = useState("")
  const [contactPerson, setContactPerson] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [branch, setBranch] = useState("All Branches")
  const [department, setDepartment] = useState("")
  const [company, setCompany] = useState("All Companies")
  const [terms, setTerms] = useState<ProcurementPaymentTerm>(ProcurementPaymentTerm.TERM_30_DAYS)
  const [remark, setRemark] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (supplierToEdit) {
      setName(supplierToEdit.name || "")
      setContactPerson(supplierToEdit.contactPerson || "")
      setPhone(supplierToEdit.phone || "")
      setEmail(supplierToEdit.email || "")
      setBranch(supplierToEdit.branch || "All Branches")
      setDepartment(supplierToEdit.department || "")
      setCompany(supplierToEdit.company || "All Companies")
      setTerms(supplierToEdit.terms || ProcurementPaymentTerm.TERM_30_DAYS)
      setRemark(supplierToEdit.remark || "")
    } else {
      setName("")
      setContactPerson("")
      setPhone("")
      setEmail("")
      setBranch("All Branches")
      setDepartment("")
      setCompany("All Companies")
      setTerms(ProcurementPaymentTerm.TERM_30_DAYS)
      setRemark("")
    }
    setError(null)
  }, [supplierToEdit, isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError("Please enter the supplier name.")
      return
    }

    setLoading(true)
    setError(null)

    try {
      if (supplierToEdit) {
        const res = await updateSupplier(supplierToEdit.id, {
          name: name.trim(),
          contactPerson: contactPerson.trim() || undefined,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          branch: branch.trim() || undefined,
          department: department.trim() || undefined,
          company: company.trim() || undefined,
          terms,
          remark: remark.trim() || undefined,
        })
        if (!res.success) {
          setError(res.error || "Failed to update supplier.")
          setLoading(false)
          return
        }
      } else {
        const res = await createSupplier({
          name: name.trim(),
          contactPerson: contactPerson.trim() || undefined,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          branch: branch.trim() || undefined,
          department: department.trim() || undefined,
          company: company.trim() || undefined,
          terms,
          remark: remark.trim() || undefined,
        })
        if (!res.success) {
          setError(res.error || "Failed to create supplier.")
          setLoading(false)
          return
        }
      }

      onSaved()
      onClose()
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-sm">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                {supplierToEdit ? "Edit Supplier" : "Add New Supplier"}
              </h2>
              <p className="text-xs text-slate-500">
                {supplierToEdit
                  ? "Update vendor details and payment terms"
                  : "Register a new vendor into the Procurement system"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
              {error}
            </div>
          )}

          {/* Supplier Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Supplier Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Bunga Raya Petroleum Sdn Bhd"
                required
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 placeholder-slate-400"
              />
            </div>
          </div>

          {/* Contact Person */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Contact Person Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="e.g. Mr. Tan / Puan Siti"
                className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
              />
            </div>
          </div>

          {/* Company, Branch & Department */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Company
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Building className="w-4 h-4" />
                </div>
                <select
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
                >
                  <option value="All Companies">All Companies</option>
                  {COMPANY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Branch / Location
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <MapPin className="w-4 h-4" />
                </div>
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
                >
                  {BRANCH_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Department
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Briefcase className="w-4 h-4" />
              </div>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
              >
                <option value="">General / All Departments</option>
                {DEPARTMENT_OPTIONS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Phone & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phone Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 012-3456789"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address (Optional)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. finance@supplier.com"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Terms Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Payment Terms <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Clock className="w-4 h-4" />
              </div>
              <select
                value={terms}
                onChange={(e) => setTerms(e.target.value as ProcurementPaymentTerm)}
                required
                className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
              >
                {Object.entries(PAYMENT_TERMS_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Default terms will automatically determine due dates when raising invoices for this vendor.
            </p>
          </div>

          {/* Remark */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Remark / Notes
            </label>
            <div className="relative">
              <textarea
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                rows={3}
                placeholder="e.g. Lead time 50 days, no keep stock, main contact PIC: Mr. Tan"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 placeholder-slate-400 resize-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-98 rounded-xl shadow-sm shadow-blue-500/20 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {supplierToEdit ? "Update Supplier" : "Save Supplier"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
