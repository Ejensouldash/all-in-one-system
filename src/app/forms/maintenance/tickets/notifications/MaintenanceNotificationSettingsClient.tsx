"use client"

import { useState } from "react"
import { 
  Bell, 
  Mail, 
  Plus, 
  Trash2, 
  Pencil, 
  CheckCircle2, 
  X, 
  Loader2, 
  AlertCircle, 
  Zap, 
  Building, 
  Cog, 
  HelpCircle,
  Layers,
  ArrowLeft
} from "lucide-react"
import Link from "next/link"
import { 
  createMaintenanceNotificationRecipient, 
  updateMaintenanceNotificationRecipient, 
  toggleMaintenanceNotificationRecipient, 
  deleteMaintenanceNotificationRecipient 
} from "@/app/actions/maintenance-notifications"

type Recipient = {
  id: string
  name: string
  email: string
  ticketType: string | null
  isEnabled: boolean
  createdAt: Date
  updatedAt: Date
}

export function MaintenanceNotificationSettingsClient({
  initialRecipients,
}: {
  initialRecipients: Recipient[]
}) {
  const [recipients, setRecipients] = useState<Recipient[]>(initialRecipients)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRecipient, setEditingRecipient] = useState<Recipient | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    ticketType: "ALL",
    isEnabled: true,
  })

  const openAddModal = () => {
    setEditingRecipient(null)
    setFormData({
      name: "",
      email: "",
      ticketType: "ALL",
      isEnabled: true,
    })
    setError("")
    setIsModalOpen(true)
  }

  const openEditModal = (rec: Recipient) => {
    setEditingRecipient(rec)
    setFormData({
      name: rec.name,
      email: rec.email,
      ticketType: rec.ticketType || "ALL",
      isEnabled: rec.isEnabled,
    })
    setError("")
    setIsModalOpen(true)
  }

  const handleToggle = async (id: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus
    // Optimistic update
    setRecipients((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isEnabled: nextStatus } : r))
    )

    const res = await toggleMaintenanceNotificationRecipient(id, nextStatus)
    if (!res.success) {
      // Revert on error
      setRecipients((prev) =>
        prev.map((r) => (r.id === id ? { ...r, isEnabled: currentStatus } : r))
      )
      setError(res.error || "Gagal mengubah status penerima.")
    } else {
      setSuccess(`Status emel berjaya dikemaskini.`)
      setTimeout(() => setSuccess(""), 2000)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Adakah anda pasti ingin memadam ${name} daripada senarai notifikasi emel?`)) {
      return
    }

    const res = await deleteMaintenanceNotificationRecipient(id)
    if (res.success) {
      setRecipients((prev) => prev.filter((r) => r.id !== id))
      setSuccess(`${name} berjaya dipadam.`)
      setTimeout(() => setSuccess(""), 2500)
    } else {
      setError(res.error || "Gagal memadam penerima.")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError("")

    const f = new FormData()
    f.set("name", formData.name.trim())
    f.set("email", formData.email.trim().toLowerCase())
    f.set("ticketType", formData.ticketType)
    f.set("isEnabled", formData.isEnabled ? "true" : "false")

    if (editingRecipient) {
      const res = await updateMaintenanceNotificationRecipient(editingRecipient.id, f)
      setIsSubmitting(false)
      if (res.success && res.recipient) {
        setRecipients((prev) =>
          prev.map((r) => (r.id === editingRecipient.id ? (res.recipient as any) : r))
        )
        setIsModalOpen(false)
        setSuccess("Penerima emel berjaya dikemaskini.")
        setTimeout(() => setSuccess(""), 2500)
      } else {
        setError(res.error || "Ralat mengemaskini penerima.")
      }
    } else {
      const res = await createMaintenanceNotificationRecipient(f)
      setIsSubmitting(false)
      if (res.success && res.recipient) {
        setRecipients((prev) => [...prev, res.recipient as any])
        setIsModalOpen(false)
        setSuccess("Penerima baru berjaya didaftarkan.")
        setTimeout(() => setSuccess(""), 2500)
      } else {
        setError(res.error || "Ralat mencipta penerima baru.")
      }
    }
  }

  const totalCount = recipients.length
  const activeCount = recipients.filter((r) => r.isEnabled).length

  return (
    <div className="space-y-6">
      {/* Notifications Header & Controls */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link
              href="/forms/maintenance/tickets"
              className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-slate-900 mb-2 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Kembali ke Work Requests
            </Link>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Bell className="h-5 w-5 text-blue-600" />
              Tetapan Notifikasi Emel Maintenance
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Setiap kali laporan kerosakan baru dihantar (melalui Imbasan QR atau borang dalaman), sistem akan menghantar emel amaran secara automatik mengikut kategori tiket yang ditetapkan.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 shrink-0 cursor-pointer self-start sm:self-center"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Penerima</span>
          </button>
        </div>

        {/* Status Alerts */}
        {success && (
          <div className="mt-4 p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
        )}
        {error && (
          <div className="mt-4 p-3 rounded-xl border border-red-200 bg-red-50 text-red-800 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Quick Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-6">
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 text-blue-700 rounded-lg">
              <Mail className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase">Jumlah Penerima</p>
              <p className="text-lg font-black text-slate-900">{totalCount}</p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-lg">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase">Status Aktif</p>
              <p className="text-lg font-black text-emerald-700">{activeCount} Penerima</p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex items-center gap-3">
            <div className="p-2.5 bg-purple-100 text-purple-700 rounded-lg">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase">Penyedia Emel</p>
              <p className="text-xs font-black text-slate-800">Resend API (maintenance-noreply@)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recipients Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-left">
              <tr>
                <th className="px-5 py-3.5">Nama &amp; Peranan</th>
                <th className="px-5 py-3.5">Alamat Emel</th>
                <th className="px-5 py-3.5">Kategori Tiket Diterima</th>
                <th className="px-5 py-3.5 text-center">Status Notifikasi</th>
                <th className="px-5 py-3.5 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {recipients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-slate-400 bg-slate-50/50">
                    Tiada penerima emel berdaftar. Tekan &quot;Tambah Penerima&quot; untuk mula menambah.
                  </td>
                </tr>
              ) : (
                recipients.map((rec) => {
                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Name */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900">{rec.name}</div>
                        <div className="text-[10px] text-slate-400">
                          Ditambah: {new Date(rec.createdAt).toLocaleDateString("en-GB")}
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-700 font-mono">
                          <Mail className="h-3.5 w-3.5 text-slate-400" />
                          <span>{rec.email}</span>
                        </div>
                      </td>

                      {/* Ticket Type */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        {!rec.ticketType || rec.ticketType === "ALL" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            <Layers className="h-3 w-3 text-slate-500" />
                            Semua Kategori (Universal)
                          </span>
                        ) : rec.ticketType === "ELECTRICAL" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            <Zap className="h-3 w-3 text-blue-600" />
                            Electrical Sahaja
                          </span>
                        ) : rec.ticketType === "MECHANICAL" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Cog className="h-3 w-3 text-amber-600" />
                            Mechanical Sahaja
                          </span>
                        ) : rec.ticketType === "CIVIL" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Building className="h-3 w-3 text-emerald-600" />
                            Civil &amp; Facility Sahaja
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            <HelpCircle className="h-3 w-3 text-purple-600" />
                            Others Sahaja
                          </span>
                        )}
                      </td>

                      {/* Enable/Disable Toggle */}
                      <td className="px-5 py-4 whitespace-nowrap text-center">
                        <button
                          type="button"
                          onClick={() => handleToggle(rec.id, rec.isEnabled)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                            rec.isEnabled
                              ? "bg-emerald-500 text-white border-emerald-600 shadow-sm"
                              : "bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200"
                          }`}
                          title={rec.isEnabled ? "Klik untuk Nyahaktifkan" : "Klik untuk Aktifkan"}
                        >
                          <span className={`w-2 h-2 rounded-full ${rec.isEnabled ? "bg-white animate-pulse" : "bg-slate-400"}`} />
                          <span>{rec.isEnabled ? "Aktif (Hantar Emel)" : "Dinyahaktifkan"}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(rec)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Edit Penerima"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(rec.id, rec.name)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Padam Penerima"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Bell className="h-4 w-4 text-blue-600" />
                <span>{editingRecipient ? "Edit Penerima Emel" : "Tambah Penerima Emel Baru"}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Nama Penerima <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="cth: Akmal (Maintenance Lead) / Iskandar"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Alamat Emel <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="cth: akmal@bubbleso2.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Kategori Tiket Diperlukan <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.ticketType}
                  onChange={(e) => setFormData({ ...formData, ticketType: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold text-slate-700"
                >
                  <option value="ALL">Semua Kategori (Electrical, Mechanical, Civil, Others)</option>
                  <option value="ELECTRICAL">Electrical Sahaja (Elektrik &amp; Pendawaian)</option>
                  <option value="MECHANICAL">Mechanical Sahaja (Mesin &amp; Peralatan)</option>
                  <option value="CIVIL">Civil &amp; Facility Sahaja (Bangunan &amp; Infrastruktur)</option>
                  <option value="OTHERS">Others Sahaja (Lain-lain Kerosakan)</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Pilih sama ada penerima ingin menerima semua tiket atau hanya mengikut pengkhususan kerja.
                </p>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.isEnabled}
                    onChange={(e) => setFormData({ ...formData, isEnabled: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-bold text-slate-700">Aktifkan notifikasi emel sekarang</span>
                </label>
              </div>

              {/* Modal Buttons */}
              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>{editingRecipient ? "Simpan Perubahan" : "Daftar Penerima"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
