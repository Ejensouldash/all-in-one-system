"use client"

import { useState, useEffect } from "react"
import {
  X,
  FileText,
  Upload,
  Calendar,
  Building,
  DollarSign,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldAlert,
  Save,
  Send,
  Trash2,
  Paperclip,
  ExternalLink,
  Tag,
  Plus,
} from "lucide-react"
import {
  ProcurementPaymentTerm,
  ProcurementInvoiceCategory,
  ProcurementInvoiceStatus,
} from "@prisma/client"
import {
  COMPANY_OPTIONS,
  DEPARTMENT_OPTIONS,
  PAYMENT_TERMS_CONFIG,
  INVOICE_CATEGORY_CONFIG,
  ATTACHMENT_TAG_OPTIONS,
} from "./procurement-constants"
import {
  createInvoice,
  updateInvoice,
  uploadProcurementDocuments,
  getSuppliers,
} from "@/app/actions/procurement"

interface AttachmentItem {
  url: string
  name: string
  size?: number
  tag?: string
}

export interface DepositPaymentStage {
  id: string
  stage: string
  amount: string
  date: string
  note?: string
}

interface NewInvoiceModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
  invoiceToEdit?: any
  defaultCategory?: ProcurementInvoiceCategory
}

export function NewInvoiceModal({
  isOpen,
  onClose,
  onSaved,
  invoiceToEdit,
  defaultCategory = ProcurementInvoiceCategory.STANDARD_TERMS,
}: NewInvoiceModalProps) {
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loadingSuppliers, setLoadingSuppliers] = useState(false)

  // Form State
  const [supplierId, setSupplierId] = useState("")
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [poNumber, setPoNumber] = useState("")
  const [company, setCompany] = useState(COMPANY_OPTIONS[0])
  const [department, setDepartment] = useState(DEPARTMENT_OPTIONS[0])
  const [category, setCategory] = useState<ProcurementInvoiceCategory>(defaultCategory)
  const [amount, setAmount] = useState("")
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0])

  // Deposit Payment Specific States
  const [totalContractPrice, setTotalContractPrice] = useState("")
  const [depositStages, setDepositStages] = useState<DepositPaymentStage[]>([
    { id: "1", stage: "1st Payment", amount: "", date: new Date().toISOString().split("T")[0], note: "" },
    { id: "2", stage: "2nd Payment", amount: "", date: "", note: "" },
    { id: "3", stage: "3rd Payment", amount: "", date: "", note: "" },
  ])
  
  // Document Receive Status (4 Options)
  const [doReceived, setDoReceived] = useState(false)
  const [originalInvoiceReceived, setOriginalInvoiceReceived] = useState(false)
  const [proformaInvoiceReceived, setProformaInvoiceReceived] = useState(false)
  const [pdfReceived, setPdfReceived] = useState(false)
  
  const [notes, setNotes] = useState("")

  // File Upload State: Existing attachments (when editing) & newly added files
  const [existingAttachments, setExistingAttachments] = useState<AttachmentItem[]>([])
  const [newFiles, setNewFiles] = useState<Array<{ file: File; tag: string }>>([])
  const [uploadingFiles, setUploadingFiles] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setLoadingSuppliers(true)
      getSuppliers({ activeOnly: true })
        .then((data) => {
          setSuppliers(data)
          if (data.length > 0 && !supplierId && !invoiceToEdit) {
            setSupplierId(data[0].id)
          }
        })
        .catch((err) => console.error("Error loading suppliers:", err))
        .finally(() => setLoadingSuppliers(false))

      if (invoiceToEdit) {
        setSupplierId(invoiceToEdit.supplierId || "")
        setInvoiceNumber(invoiceToEdit.invoiceNumber || "")
        setPoNumber(invoiceToEdit.poNumber || "")
        setCompany(invoiceToEdit.company || COMPANY_OPTIONS[0])
        setDepartment(invoiceToEdit.department || DEPARTMENT_OPTIONS[0])
        setCategory(invoiceToEdit.category || defaultCategory)
        setAmount(invoiceToEdit.amount !== undefined ? String(invoiceToEdit.amount) : "")
        setInvoiceDate(
          invoiceToEdit.invoiceDate
            ? new Date(invoiceToEdit.invoiceDate).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0]
        )
        setDoReceived(!!invoiceToEdit.doReceived)
        setOriginalInvoiceReceived(!!invoiceToEdit.originalInvoiceReceived)
        setProformaInvoiceReceived(!!invoiceToEdit.proformaInvoiceReceived)
        setPdfReceived(!!invoiceToEdit.pdfReceived)
        setNotes(invoiceToEdit.notes || "")

        // Populate deposit details if present
        if (invoiceToEdit.depositDetails) {
          setTotalContractPrice(
            invoiceToEdit.depositDetails.totalPrice !== undefined
              ? String(invoiceToEdit.depositDetails.totalPrice)
              : invoiceToEdit.totalPrice !== undefined
              ? String(invoiceToEdit.totalPrice)
              : ""
          )
          if (Array.isArray(invoiceToEdit.depositDetails.stages) && invoiceToEdit.depositDetails.stages.length > 0) {
            setDepositStages(
              invoiceToEdit.depositDetails.stages.map((st: any, i: number) => ({
                id: st.id || String(i + 1),
                stage: st.stage || `${i + 1}${i === 0 ? "st" : i === 1 ? "2nd" : i === 2 ? "3rd" : "th"} Payment`,
                amount: st.amount !== undefined ? String(st.amount) : "",
                date: st.date ? new Date(st.date).toISOString().split("T")[0] : "",
                note: st.note || "",
              }))
            )
          } else {
            setDepositStages([
              { id: "1", stage: "1st Payment", amount: String(invoiceToEdit.amount || ""), date: new Date().toISOString().split("T")[0], note: "" },
              { id: "2", stage: "2nd Payment", amount: "", date: "", note: "" },
              { id: "3", stage: "3rd Payment", amount: "", date: "", note: "" },
            ])
          }
        } else if (invoiceToEdit.totalPrice) {
          setTotalContractPrice(String(invoiceToEdit.totalPrice))
          setDepositStages([
            { id: "1", stage: "1st Payment", amount: String(invoiceToEdit.amount || ""), date: new Date().toISOString().split("T")[0], note: "" },
            { id: "2", stage: "2nd Payment", amount: "", date: "", note: "" },
            { id: "3", stage: "3rd Payment", amount: "", date: "", note: "" },
          ])
        } else {
          setTotalContractPrice("")
          setDepositStages([
            { id: "1", stage: "1st Payment", amount: String(invoiceToEdit.amount || ""), date: new Date().toISOString().split("T")[0], note: "" },
            { id: "2", stage: "2nd Payment", amount: "", date: "", note: "" },
            { id: "3", stage: "3rd Payment", amount: "", date: "", note: "" },
          ])
        }

        // Populate existing attachments
        let parsedAttachments: AttachmentItem[] = []
        if (Array.isArray(invoiceToEdit.attachments) && invoiceToEdit.attachments.length > 0) {
          parsedAttachments = invoiceToEdit.attachments.map((a: any) => ({
            url: a.url,
            name: a.name || "Document",
            size: a.size || 0,
            tag: a.tag || "Invoice / DO",
          }))
        } else if (invoiceToEdit.attachmentUrl) {
          parsedAttachments = [
            {
              url: invoiceToEdit.attachmentUrl,
              name: invoiceToEdit.attachmentName || "Document",
              size: 0,
              tag: "Invoice / DO",
            },
          ]
        }
        setExistingAttachments(parsedAttachments)
        setNewFiles([])
      } else {
        setInvoiceNumber("")
        setPoNumber("")
        setCompany(COMPANY_OPTIONS[0])
        setDepartment(DEPARTMENT_OPTIONS[0])
        setCategory(defaultCategory)
        setAmount("")
        setInvoiceDate(new Date().toISOString().split("T")[0])
        setDoReceived(false)
        setOriginalInvoiceReceived(false)
        setProformaInvoiceReceived(false)
        setPdfReceived(false)
        setNotes("")
        setTotalContractPrice("")
        setDepositStages([
          { id: "1", stage: "1st Payment", amount: "", date: new Date().toISOString().split("T")[0], note: "" },
          { id: "2", stage: "2nd Payment", amount: "", date: "", note: "" },
          { id: "3", stage: "3rd Payment", amount: "", date: "", note: "" },
        ])
        setExistingAttachments([])
        setNewFiles([])
      }
      setError(null)
    }
  }, [isOpen, invoiceToEdit, defaultCategory])

  const totalFilesCount = existingAttachments.length + newFiles.length

  const handleSupplierChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sId = e.target.value
    setSupplierId(sId)
    const found = suppliers.find((s) => s.id === sId)
    if (found && !invoiceToEdit) {
      if (found.terms === "CASH_BEFORE_DELIVERY" || found.terms === "CASH") {
        setCategory(ProcurementInvoiceCategory.CASH_PREPAYMENT)
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const selected = Array.from(e.target.files)
    if (selected.length === 0) return

    const remainingSlots = 5 - totalFilesCount
    if (remainingSlots <= 0) {
      setError("Maximum 5 files allowed. You have already reached the limit.")
      return
    }

    const filesToAdd = selected.slice(0, remainingSlots).map((file) => ({
      file,
      tag: "Invoice / DO",
    }))

    if (selected.length > remainingSlots) {
      setError(`Maximum 5 files allowed. Only ${remainingSlots} additional file(s) were added.`)
    } else {
      setError(null)
    }

    setNewFiles((prev) => [...prev, ...filesToAdd])
    e.target.value = ""
  }

  const isDepositPayment =
    category === "DEPOSIT_PAYMENT" ||
    category === ProcurementInvoiceCategory.MONTHLY_SUBSCRIPTION

  const totalPaidAmount = depositStages.reduce(
    (sum, st) => sum + (parseFloat(st.amount) || 0),
    0
  )
  const remainingBalance =
    (parseFloat(totalContractPrice) || 0) - totalPaidAmount

  const handleUpdateStage = (
    index: number,
    field: keyof DepositPaymentStage,
    value: string
  ) => {
    setDepositStages((prev) =>
      prev.map((st, i) => (i === index ? { ...st, [field]: value } : st))
    )
  }

  const handleAddStage = () => {
    const nextIdx = depositStages.length + 1
    const ordinal =
      nextIdx === 1 ? "1st" : nextIdx === 2 ? "2nd" : nextIdx === 3 ? "3rd" : `${nextIdx}th`
    setDepositStages((prev) => [
      ...prev,
      {
        id: String(nextIdx),
        stage: `${ordinal} Payment`,
        amount: "",
        date: "",
        note: "",
      },
    ])
  }

  const handleRemoveStage = (indexToRemove: number) => {
    setDepositStages((prev) => prev.filter((_, i) => i !== indexToRemove))
  }

  const handleRemoveExistingAttachment = (indexToRemove: number) => {
    setExistingAttachments((prev) => prev.filter((_, i) => i !== indexToRemove))
    setError(null)
  }

  const handleUpdateExistingTag = (index: number, newTag: string) => {
    setExistingAttachments((prev) =>
      prev.map((item, i) => (i === index ? { ...item, tag: newTag } : item))
    )
  }

  const handleRemoveNewFile = (indexToRemove: number) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== indexToRemove))
    setError(null)
  }

  const handleUpdateNewFileTag = (index: number, newTag: string) => {
    setNewFiles((prev) =>
      prev.map((item, i) => (i === index ? { ...item, tag: newTag } : item))
    )
  }

  if (!isOpen) return null

  const handleSubmit = async (targetStatus?: ProcurementInvoiceStatus) => {
    if (!invoiceNumber.trim()) {
      setError("Please provide an invoice / document number.")
      return
    }
    if (!supplierId) {
      setError("Please select a supplier.")
      return
    }

    let finalAmount = 0
    let finalTotalPrice: number | null = null
    let finalDepositDetails: any = null

    if (isDepositPayment) {
      const parsedTotal = parseFloat(totalContractPrice)
      if (isNaN(parsedTotal) || parsedTotal <= 0) {
        setError("Please enter a valid Total Contract Price.")
        return
      }
      finalTotalPrice = parsedTotal
      finalAmount = totalPaidAmount > 0 ? totalPaidAmount : parsedTotal
      finalDepositDetails = {
        totalPrice: parsedTotal,
        stages: depositStages
          .filter((st) => st.amount && parseFloat(st.amount) > 0)
          .map((st) => ({
            id: st.id,
            stage: st.stage,
            amount: parseFloat(st.amount),
            date: st.date || invoiceDate,
            note: st.note || "",
          })),
        totalPaid: totalPaidAmount,
        remainingBalance,
      }
    } else {
      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        setError("Please enter a valid amount.")
        return
      }
      finalAmount = Number(amount)
    }

    setSubmitting(true)
    setError(null)

    try {
      let finalAttachments: AttachmentItem[] = [...existingAttachments]

      // Upload newly added files if any
      if (newFiles.length > 0) {
        setUploadingFiles(true)
        const fd = new FormData()
        newFiles.forEach((nf) => fd.append("files", nf.file))
        fd.append("folder", "invoices")
        const uploadRes = await uploadProcurementDocuments(fd)
        setUploadingFiles(false)

        if (!uploadRes.success || !uploadRes.files) {
          setError(uploadRes.error || "Failed to upload invoice attachment(s).")
          setSubmitting(false)
          return
        }

        const uploadedWithTags = uploadRes.files.map((resFile, idx) => ({
          url: resFile.url,
          name: resFile.name,
          size: resFile.size,
          tag: newFiles[idx]?.tag || "Invoice / DO",
        }))

        finalAttachments = [...finalAttachments, ...uploadedWithTags]
      }

      if (invoiceToEdit) {
        // EDIT MODE
        const res = await updateInvoice(invoiceToEdit.id, {
          invoiceNumber: invoiceNumber.trim(),
          poNumber: poNumber.trim() || undefined,
          company,
          department,
          supplierId,
          category,
          amount: finalAmount,
          totalPrice: finalTotalPrice,
          depositDetails: finalDepositDetails,
          invoiceDate,
          doReceived,
          originalInvoiceReceived,
          proformaInvoiceReceived,
          pdfReceived,
          attachments: finalAttachments,
          notes: notes.trim() || undefined,
        })

        if (!res.success) {
          setError(res.error || "Failed to update submission.")
          setSubmitting(false)
          return
        }
      } else {
        // CREATE MODE
        const res = await createInvoice({
          invoiceNumber: invoiceNumber.trim(),
          poNumber: poNumber.trim() || undefined,
          company,
          department,
          supplierId,
          category,
          status: targetStatus || ProcurementInvoiceStatus.PENDING_FINANCE,
          invoiceDate,
          amount: finalAmount,
          totalPrice: finalTotalPrice,
          depositDetails: finalDepositDetails,
          doReceived,
          originalInvoiceReceived,
          proformaInvoiceReceived,
          pdfReceived,
          attachments: finalAttachments,
          notes: notes.trim() || undefined,
        })

        if (!res.success) {
          setError(res.error || "Failed to create submission.")
          setSubmitting(false)
          return
        }
      }

      onSaved()
      onClose()
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.")
    } finally {
      setSubmitting(false)
      setUploadingFiles(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-sm">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                {invoiceToEdit ? "Edit Document Submission" : "New Document Submission"}
              </h2>
              <p className="text-xs text-slate-500">
                {invoiceToEdit
                  ? "Update document details, payment stage, and verification status"
                  : "Record invoice, attach bill/DO, and dispatch to Finance for settlement"}
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
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Payment Category Selection Pills */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Payment Category <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                {
                  key: ProcurementInvoiceCategory.STANDARD_TERMS,
                  title: "Standard Terms",
                  desc: "Document for payment with 7/30/60 days credit",
                },
                {
                  key: "DEPOSIT_PAYMENT",
                  title: "Deposit Payment",
                  desc: "Partial payment / 1st payment / advance deposit",
                },
                {
                  key: ProcurementInvoiceCategory.CASH_PREPAYMENT,
                  title: "Cash (Pay Before Delivery)",
                  desc: "Goods dispatched only after payment",
                },
              ].map((item) => {
                const isSelected =
                  category === item.key ||
                  (item.key === "DEPOSIT_PAYMENT" && category === ProcurementInvoiceCategory.MONTHLY_SUBSCRIPTION)
                const isCash = item.key === ProcurementInvoiceCategory.CASH_PREPAYMENT

                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setCategory(item.key as ProcurementInvoiceCategory)}
                    className={`p-3 text-left rounded-xl border transition-all ${
                      isSelected
                        ? isCash
                          ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                          : "bg-blue-600 text-white border-blue-700 shadow-sm"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold">{item.title}</span>
                    </div>
                    <p
                      className={`text-[10px] leading-tight ${
                        isSelected ? "text-white/80" : "text-slate-500"
                      }`}
                    >
                      {item.desc}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Supplier Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Supplier <span className="text-rose-500">*</span>
            </label>
            {loadingSuppliers ? (
              <div className="py-2 text-xs text-slate-400 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Loading vendors...
              </div>
            ) : (
              <select
                value={supplierId}
                onChange={handleSupplierChange}
                required
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({PAYMENT_TERMS_CONFIG[s.terms]?.label || s.terms})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Invoice Number & PO / PI Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Invoice / Reference Number (INV NO) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="e.g. INV-2611/0054"
                required
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 placeholder-slate-400 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                PO / PI Number (Optional)
              </label>
              <input
                type="text"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                placeholder="e.g. PO001996 or PI002721"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 placeholder-slate-400 font-mono"
              />
            </div>
          </div>

          {/* Company & Department */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Company <span className="text-rose-500">*</span>
              </label>
              <select
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 font-semibold"
              >
                {COMPANY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Department / Cost Center <span className="text-rose-500">*</span>
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
              >
                {DEPARTMENT_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Amount & Invoice Date OR Deposit Payment Schedule */}
          {isDepositPayment ? (
            <div className="p-4 bg-purple-50/60 rounded-2xl border border-purple-200/80 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-purple-600" />
                  Deposit Payment & Milestone Schedule
                </span>
                <span className="text-[11px] font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                  Installment Breakdown
                </span>
              </div>

              {/* Total Contract Price & Invoice Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Total Contract / Agreement Price (RM) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-xs font-bold text-slate-400">
                      RM
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={totalContractPrice}
                      onChange={(e) => setTotalContractPrice(e.target.value)}
                      placeholder="e.g. 50000.00"
                      required
                      className="w-full pl-10 pr-3 py-2 text-sm bg-white border border-purple-300 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-slate-900 font-extrabold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Invoice / Agreement Date
                  </label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
                  />
                </div>
              </div>

              {/* Payment Stages List */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Payment Stages (1st, 2nd, 3rd Payment)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddStage}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 hover:text-purple-800 bg-purple-100 hover:bg-purple-200 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Payment Stage</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {depositStages.map((stage, idx) => (
                    <div
                      key={stage.id || idx}
                      className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 bg-white border border-purple-100 rounded-xl shadow-2xs"
                    >
                      <span className="w-28 text-xs font-bold text-slate-700 shrink-0">
                        {stage.stage}
                      </span>

                      {/* Amount */}
                      <div className="relative flex-1">
                        <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-[11px] font-bold text-slate-400">
                          RM
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={stage.amount}
                          onChange={(e) => handleUpdateStage(idx, "amount", e.target.value)}
                          className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-bold focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                        />
                      </div>

                      {/* Payment Date */}
                      <div className="w-full sm:w-40">
                        <input
                          type="date"
                          value={stage.date}
                          onChange={(e) => handleUpdateStage(idx, "date", e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                        />
                      </div>

                      {/* Notes / Ref */}
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder="Notes / Ref (optional)"
                          value={stage.note || ""}
                          onChange={(e) => handleUpdateStage(idx, "note", e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                        />
                      </div>

                      {/* Delete Stage (if more than 1) */}
                      {depositStages.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveStage(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors self-end sm:self-center"
                          title="Remove stage"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Summary & Balance Tracker */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-white rounded-xl border border-purple-200/90 text-xs shadow-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total Contract</span>
                  <p className="font-extrabold text-slate-900 text-sm mt-0.5">
                    RM {Number(totalContractPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-600">Total Paid So Far</span>
                  <p className="font-extrabold text-emerald-700 text-sm mt-0.5">
                    RM {totalPaidAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-700">Remaining Balance (Baki)</span>
                  <p className={`font-extrabold text-sm mt-0.5 ${remainingBalance < 0 ? "text-rose-600" : "text-amber-800"}`}>
                    RM {remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Standard Amount & Invoice Date */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Amount (RM) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-xs font-bold text-slate-400">
                    RM
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    required
                    className="w-full pl-10 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Invoice Date
                </label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
                />
              </div>
            </div>
          )}

          {/* Document Receive Status Checks (4 checkboxes: DO, ORI INV, PROFORMA INV, PDF) */}
          <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-xl space-y-2">
            <p className="text-xs font-bold text-slate-700">Document Receive Status</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={doReceived}
                  onChange={(e) => setDoReceived(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span>DO Received</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={originalInvoiceReceived}
                  onChange={(e) => setOriginalInvoiceReceived(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span>ORI INV Received</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={proformaInvoiceReceived}
                  onChange={(e) => setProformaInvoiceReceived(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span>PROFORMA INV</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pdfReceived}
                  onChange={(e) => setPdfReceived(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span>PDF Copy</span>
              </label>
            </div>
          </div>

          {/* File Attachment (Max 5 files with 1st Payment / 2nd Payment / Balance tagging) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Upload Invoice / DO / Payment Proof (PDF / Image)
              </label>
              <span className="text-[11px] font-medium text-slate-500">
                {totalFilesCount} / 5 files
              </span>
            </div>

            {totalFilesCount < 5 && (
              <div className="relative border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-xl p-4 transition-colors text-center bg-slate-50/50 mb-2">
                <input
                  type="file"
                  multiple
                  accept=".pdf,image/png,image/jpeg,image/webp"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center gap-1.5 pointer-events-none">
                  <Upload className="w-5 h-5 text-slate-400" />
                  <p className="text-xs font-medium text-slate-600">
                    Click or drag and drop files (Max 5 files total)
                  </p>
                  <p className="text-[10px] text-slate-400">
                    PDF, PNG, JPG • Tag as 1st Payment, 2nd Payment, Balance, or Invoice
                  </p>
                </div>
              </div>
            )}

            {/* List of Files (Existing + Newly added) */}
            {totalFilesCount > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-xl">
                {/* Existing attachments */}
                {existingAttachments.map((att, idx) => (
                  <div
                    key={`existing-${att.url}-${idx}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 bg-white rounded-lg border border-slate-200/80 text-xs shadow-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <div className="w-6 h-6 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-blue-600 hover:underline truncate max-w-xs block"
                        >
                          {att.name}
                        </a>
                        <span className="text-[10px] text-slate-400">Uploaded file</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Tag selector */}
                      <select
                        value={att.tag || "Invoice / DO"}
                        onChange={(e) => handleUpdateExistingTag(idx, e.target.value)}
                        className="px-2 py-1 text-[11px] font-semibold bg-slate-100 border border-slate-200 rounded-lg text-slate-700 focus:bg-white"
                      >
                        {ATTACHMENT_TAG_OPTIONS.map((tag) => (
                          <option key={tag} value={tag}>
                            {tag}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => handleRemoveExistingAttachment(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        title="Delete file"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Newly selected files */}
                {newFiles.map((nf, idx) => (
                  <div
                    key={`new-${nf.file.name}-${idx}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 bg-white rounded-lg border border-blue-200 text-xs shadow-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <div className="w-6 h-6 rounded bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <Upload className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800 truncate max-w-xs">
                          {nf.file.name}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {(nf.file.size / 1024).toFixed(0)} KB • Ready to upload
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Tag selector */}
                      <select
                        value={nf.tag}
                        onChange={(e) => handleUpdateNewFileTag(idx, e.target.value)}
                        className="px-2 py-1 text-[11px] font-semibold bg-blue-50 border border-blue-200 rounded-lg text-blue-700 focus:bg-white"
                      >
                        {ATTACHMENT_TAG_OPTIONS.map((tag) => (
                          <option key={tag} value={tag}>
                            {tag}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => handleRemoveNewFile(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        title="Remove file"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes / Remark */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Remark / Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Payment details, special delivery instructions, etc..."
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 placeholder-slate-400 resize-none"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/50 rounded-xl transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {!invoiceToEdit && (
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSubmit(ProcurementInvoiceStatus.DRAFT)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition-all disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                Save as Draft
              </button>
            )}

            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSubmit(invoiceToEdit ? undefined : ProcurementInvoiceStatus.PENDING_FINANCE)}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-98 rounded-xl shadow-sm shadow-blue-500/20 transition-all disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {uploadingFiles ? "Uploading files..." : "Saving..."}
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  {invoiceToEdit ? "Update Submission" : "Submit to Finance"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
