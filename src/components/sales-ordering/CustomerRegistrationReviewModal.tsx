"use client"

import { useState } from "react"
import { CheckCircle2, XCircle, FileText, ExternalLink, Eye, Building2, User, Landmark, ShieldAlert, X, Loader2 } from "lucide-react"

type DocumentItem = {
  docType?: string
  fileName?: string
  driveUrl?: string
  fileId?: string
}

type CustomerRegistrationData = {
  id: string
  registrationNo: string
  companyName: string
  companyRegNoNew?: string | null
  companyRegNoOld?: string | null
  tinNo?: string | null
  sstNo?: string | null
  businessType?: string | null
  natureOfBusiness?: string | null
  businessAddress?: string | null
  registeredAddress?: string | null
  businessCommencementDate?: string | null
  annualTurnover?: string | null
  paidUpCapital?: string | null
  contactOffice?: string | null
  contactFax?: string | null
  emailInvoice?: string | null
  msicCode?: string | null
  contacts?: any
  financial?: any
  tradeReferences?: any
  directors?: any
  supportingDocuments?: any
  guarantors?: any
  status: string
  rejectionReason?: string | null
  createdAt: string
  createdCustomer?: { id: string; customerCode: string; legalName: string } | null
}

export function CustomerRegistrationReviewModal({
  item,
  isOpen,
  onClose,
  onRefresh,
}: {
  item: CustomerRegistrationData | null
  isOpen: boolean
  onClose: () => void
  onRefresh: () => void
}) {
  const [activeDocUrl, setActiveDocUrl] = useState<string | null>(null)
  const [docTitle, setDocTitle] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  if (!isOpen || !item) return null

  const supportingDocs: DocumentItem[] = Array.isArray(item.supportingDocuments) ? item.supportingDocuments : []
  const contacts = Array.isArray(item.contacts) ? item.contacts : []
  const financial = item.financial || {}
  const tradeRefs = Array.isArray(item.tradeReferences) ? item.tradeReferences : []
  const directors = Array.isArray(item.directors) ? item.directors : []
  const guarantors = Array.isArray(item.guarantors) ? item.guarantors : []

  // Transform Google Drive URL to preview iframe URL
  const getEmbedUrl = (url?: string, fileId?: string) => {
    if (fileId) return `https://drive.google.com/file/d/${fileId}/preview`
    if (!url) return ""
    if (url.includes("drive.google.com")) {
      return url.replace(/\/view.*$/, "/preview").replace(/\/edit.*$/, "/preview")
    }
    return url
  }

  const handleApprove = async () => {
    if (!confirm(`Luluskan pendaftaran untuk "${item.companyName}" dan cipta rekod di Customer Master?`)) return
    setBusy(true)
    setError("")
    try {
      const res = await fetch(`/api/sales-ordering/customer-registrations/${item.id}/approve`, {
        method: "POST"
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Gagal meluluskan permohonan.")
      alert(data.message)
      onRefresh()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal meluluskan.")
    } finally {
      setBusy(false)
    }
  }

  const handleReject = async () => {
    const reason = prompt("Masukkan sebab penolakan permohonan ini:")
    if (reason === null) return
    setBusy(true)
    setError("")
    try {
      const res = await fetch(`/api/sales-ordering/customer-registrations/${item.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Gagal menolak permohonan.")
      onRefresh()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menolak.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md transition-all animate-in fade-in duration-200">
      <div className="relative flex h-[90vh] w-full max-w-5xl flex-col rounded-3xl border border-slate-700 bg-white shadow-2xl overflow-hidden text-slate-900">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-black text-lg text-white">{item.companyName}</h3>
              <p className="text-xs text-slate-400 font-mono">No. Permohonan: {item.registrationNo} · Tarikh: {item.createdAt.slice(0, 10)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${
              item.status === "APPROVED" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" :
              item.status === "REJECTED" ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" :
              "bg-amber-500/20 text-amber-300 border border-amber-500/30"
            }`}>
              {item.status}
            </span>
            <button onClick={onClose} className="rounded-xl bg-slate-800 p-2 text-slate-400 hover:text-white transition">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
          
          {error && <div className="rounded-2xl bg-rose-50 p-4 border border-rose-200 text-rose-700 font-bold text-sm">{error}</div>}

          {/* Section A: Company Details */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <h4 className="flex items-center gap-2 font-black text-slate-900 border-b border-slate-100 pb-3 text-sm">
              <Building2 className="h-4 w-4 text-cyan-600" /> A. Butiran Syarikat (Company Details)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div>
                <p className="font-bold text-slate-500 uppercase">Nama Syarikat</p>
                <p className="font-black text-slate-900 text-sm mt-0.5">{item.companyName}</p>
              </div>
              <div>
                <p className="font-bold text-slate-500 uppercase">No. Pendaftaran Syarikat</p>
                <p className="font-bold text-slate-900 mt-0.5">{item.companyRegNoNew || item.companyRegNoOld || "-"}</p>
              </div>
              <div>
                <p className="font-bold text-slate-500 uppercase">Jenis Perniagaan</p>
                <p className="font-bold text-slate-900 mt-0.5">{item.businessType || "-"}</p>
              </div>
              <div>
                <p className="font-bold text-slate-500 uppercase">No. TIN / SST</p>
                <p className="font-bold text-slate-900 mt-0.5">TIN: {item.tinNo || "-"} · SST: {item.sstNo || "-"}</p>
              </div>
              <div>
                <p className="font-bold text-slate-500 uppercase">Sektor / Nature of Business</p>
                <p className="font-bold text-slate-900 mt-0.5">{item.natureOfBusiness || "-"}</p>
              </div>
              <div>
                <p className="font-bold text-slate-500 uppercase">No. Pejabat / Email Invoice</p>
                <p className="font-bold text-slate-900 mt-0.5">{item.contactOffice || "-"} · {item.emailInvoice || "-"}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="font-bold text-slate-500 uppercase">Alamat Perniagaan (Business Address)</p>
                <p className="font-bold text-slate-800 mt-0.5">{item.businessAddress || "-"}</p>
              </div>
              <div>
                <p className="font-bold text-slate-500 uppercase">Turnover & Modal Berbayar</p>
                <p className="font-bold text-slate-900 mt-0.5">Turnover: {item.annualTurnover || "-"} · Capital: {item.paidUpCapital || "-"}</p>
              </div>
            </div>
          </section>

          {/* Section B: Contact Persons */}
          {contacts.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
              <h4 className="flex items-center gap-2 font-black text-slate-900 border-b border-slate-100 pb-3 text-sm">
                <User className="h-4 w-4 text-cyan-600" /> B. Pegawai Hubungan (Contact Persons)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {contacts.map((c: any, i: number) => (
                  <div key={i} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <p className="font-black text-cyan-900 uppercase text-[10px]">{c.department}</p>
                    <p className="font-bold text-slate-900 text-sm mt-0.5">{c.name || "Nama N/A"}</p>
                    <p className="text-slate-600 mt-1">Tel: {c.phone || "-"} · Email: {c.email || "-"}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Section C: Financial Information */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
            <h4 className="flex items-center gap-2 font-black text-slate-900 border-b border-slate-100 pb-3 text-sm">
              <Landmark className="h-4 w-4 text-cyan-600" /> C. Maklumat Perbankan (Bank Details)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <p className="font-bold text-slate-500 uppercase">Nama Bank</p>
                <p className="font-black text-slate-900 text-sm mt-0.5">{financial.bankName || "-"}</p>
              </div>
              <div>
                <p className="font-bold text-slate-500 uppercase">No. Akaun Bank</p>
                <p className="font-black text-slate-900 text-sm mt-0.5">{financial.accountNo || "-"}</p>
              </div>
              <div>
                <p className="font-bold text-slate-500 uppercase">Jenis Akaun / SWIFT</p>
                <p className="font-bold text-slate-900 mt-0.5">{financial.bankType || "-"} ({financial.swiftCode || "-"})</p>
              </div>
            </div>
          </section>

          {/* Section D: Supporting Documents (Google Drive PDFs) */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <h4 className="flex items-center gap-2 font-black text-slate-900 border-b border-slate-100 pb-3 text-sm">
              <FileText className="h-4 w-4 text-cyan-600" /> D. Dokumen Sokongan (Supporting Documents)
            </h4>
            {supportingDocs.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {supportingDocs.map((doc, idx) => {
                  const embedUrl = getEmbedUrl(doc.driveUrl, doc.fileId)
                  return (
                    <div key={idx} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 hover:border-cyan-300 transition">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="truncate">
                          <p className="font-bold text-xs text-slate-900 truncate">{doc.docType || doc.fileName || `Dokumen ${idx + 1}`}</p>
                          <p className="text-[10px] text-slate-500 truncate">{doc.fileName || "Fail Google Drive"}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {embedUrl ? (
                          <button
                            onClick={() => {
                              setActiveDocUrl(embedUrl)
                              setDocTitle(doc.docType || doc.fileName || "Pratinjau Dokumen")
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-cyan-300 bg-cyan-50 px-2.5 py-1.5 text-xs font-black text-cyan-800 hover:bg-cyan-100 transition shadow-sm"
                          >
                            <Eye className="h-3.5 w-3.5" /> Preview
                          </button>
                        ) : null}

                        {doc.driveUrl && (
                          <a
                            href={doc.driveUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg bg-slate-200 p-1.5 text-slate-700 hover:bg-slate-300 transition"
                            title="Buka di Google Drive"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Tiada dokumen sokongan dilampirkan semasa pendaftaran.</p>
            )}
          </section>

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-4">
          <button onClick={onClose} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-black text-slate-700 hover:bg-slate-50 transition">
            Tutup Modal
          </button>

          {item.status === "PENDING" && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleReject}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-black text-rose-700 hover:bg-rose-100 transition disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" /> Tolak Permohonan
              </button>

              <button
                onClick={handleApprove}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-xs font-black text-white hover:bg-cyan-500 transition shadow-md disabled:bg-slate-300"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Luluskan & Daftar Pelanggan
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Embedded Document Preview Sub-Modal */}
      {activeDocUrl && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative flex h-[92vh] w-full max-w-5xl flex-col rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden text-white">
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-6 py-3.5">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-cyan-400" />
                <h4 className="font-black text-base text-white">{docTitle}</h4>
              </div>
              <button onClick={() => setActiveDocUrl(null)} className="rounded-xl bg-slate-800 p-2 text-slate-400 hover:text-white transition">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 bg-slate-950 p-2">
              <iframe
                src={activeDocUrl}
                className="h-full w-full rounded-2xl border border-slate-800 bg-white"
                title={docTitle}
                allow="autoplay"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
