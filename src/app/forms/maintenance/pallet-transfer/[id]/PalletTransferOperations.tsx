"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import {
  AlertTriangle,
  ArrowLeft,
  Boxes,
  CheckCircle2,
  ExternalLink,
  Layers,
  RotateCcw,
  ShieldCheck,
  Truck,
  Warehouse,
  XCircle,
} from "lucide-react"
import { postPalletTransferAction, reversePalletTransferAction } from "@/app/actions/warehouse-pallet"
import { TactileButton } from "@/components/ui/TactileButton"

type Transfer = {
  id: string
  transferNo: string
  status: string
  movementType: string
  occurredAt: string
  postedAt: string | null
  reversedAt: string | null
  reversalReason: string | null
  fromCustodian: { name: string; kind: string }
  toCustodian: { name: string; kind: string }
  transportCompany: string | null
  driverName: string | null
  vehicleNo: string | null
  remarks: string | null
  evidenceUrl: string | null
  releasedSignature: string | null
  receivedByName: string | null
  receivedSignature: string | null
  createdBy: { id: string; name: string | null }
  postedBy: { id: string; name: string | null } | null
  reversedBy: { id: string; name: string | null } | null
  gatePass: { id: string; gatePassNo: string } | null
  distributionOrder: { id: string; doNumber: string } | null
  lines: Array<{
    id: string
    quantity: number
    fromCondition: string
    toCondition: string
    remarks: string | null
    palletType: { code: string; name: string }
  }>
  movementCount: number
}

export function PalletTransferOperations({ transfer }: { transfer: Transfer }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  function post() {
    const confirmed = window.confirm(
      "Adakah anda pasti untuk mengepos rekod ini ke Lejar Pallet? Tindakan ini akan mengemas kini baki pallet dan mengunci rekod daripada suntingan."
    )
    if (!confirmed) return

    setError("")
    startTransition(async () => {
      const result = await postPalletTransferAction(transfer.id)
      if (!result.success) {
        // Format friendly insufficient balance message if detected
        const rawError = result.error || "Gagal mengepos ke lejar."
        if (rawError.toLowerCase().includes("balance") || rawError.toLowerCase().includes("baki")) {
          setError(
            "Stok pallet tidak mencukupi di Warehouse untuk menampung transaksi ini. Sila pastikan Stok Awal atau transaksi pemulangan telah direkodkan."
          )
        } else {
          setError(rawError)
        }
        return
      }
      setMessage("Rekod berjaya dipost ke Lejar Pallet.")
      router.refresh()
    })
  }

  function reverse() {
    const reason = window.prompt("Sila nyatakan sebab pembatalan / reversal (Wajib):")
    if (!reason) return
    setError("")
    startTransition(async () => {
      const result = await reversePalletTransferAction(transfer.id, reason)
      if (!result.success) return setError(result.error)
      setMessage(`Reversal ${result.data.reversalNo} berjaya dipost ke lejar.`)
      router.refresh()
    })
  }

  const isInsufficientStock = error.toLowerCase().includes("stok pallet tidak mencukupi")
  const totalPallets = transfer.lines.reduce((sum, line) => sum + line.quantity, 0)

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Card */}
      <div className="rounded-3xl bg-gradient-to-r from-stone-950 via-amber-950 to-yellow-950 p-6 md:p-8 text-white shadow-xl">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href="/forms/maintenance/pallet-transfer"
              className="group mb-3 inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              Kembali ke Lejar Pallet
            </Link>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl md:text-4xl font-black tracking-tight">{transfer.transferNo}</h1>
              <span
                className={`rounded-full px-3.5 py-1 text-xs font-black uppercase tracking-wider border ${
                  transfer.status === "POSTED"
                    ? "bg-emerald-400/20 text-emerald-200 border-emerald-400/40"
                    : transfer.status === "REVERSED"
                    ? "bg-red-400/20 text-red-200 border-red-400/40"
                    : "bg-amber-400/20 text-amber-200 border-amber-300/40"
                }`}
              >
                {transfer.status === "POSTED"
                  ? "Selesai Posting (Posted)"
                  : transfer.status === "REVERSED"
                  ? "Dibatalkan (Reversed)"
                  : "Draf (Belum Dipost)"}
              </span>
            </div>
            <p className="mt-2 text-sm text-amber-100/80">
              Jenis: <span className="font-semibold text-white">{transfer.movementType.replaceAll("_", " ")}</span> ·{" "}
              Masa:{" "}
              <span className="font-semibold text-white">
                {new Date(transfer.occurredAt).toLocaleString("en-MY", { dateStyle: "full", timeStyle: "short" })}
              </span>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2.5">
            {transfer.status === "DRAFT" && (
              <TactileButton
                variant="emerald"
                size="lg"
                loading={pending}
                loadingText="Sedang Mengepos ke Lejar..."
                icon={<CheckCircle2 className="h-5 w-5" />}
                onClick={post}
              >
                Post ke Lejar Pallet (Post Ledger)
              </TactileButton>
            )}

            {transfer.status === "POSTED" && (
              <TactileButton
                variant="danger"
                size="md"
                disabled={pending}
                icon={<RotateCcw className="h-4 w-4" />}
                onClick={reverse}
              >
                Batalkan Transaksi (Reverse)
              </TactileButton>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Alerts */}
      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-2xl border-2 border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700 shadow-sm animate-in fade-in">
          <XCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-black text-red-800">Posting Gagal:</div>
            <div className="mt-1 font-medium">{error}</div>

            {isInsufficientStock && (
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href="/forms/maintenance/pallet-transfer/new"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-700 px-3.5 py-2 text-xs font-black text-white hover:bg-amber-800"
                >
                  <Boxes className="h-4 w-4" /> Setup Stok Awal Pallet
                </Link>
                <Link
                  href="/forms/maintenance/pallet-transfer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-black text-stone-800 hover:bg-stone-100"
                >
                  <Warehouse className="h-4 w-4" /> Semak Baki Pallet Warehouse
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {message && (
        <div role="status" className="flex items-start gap-3 rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800 shadow-sm animate-in fade-in">
          <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-emerald-600" />
          <div className="flex-1">{message}</div>
        </div>
      )}

      {/* Draft Notification Banner */}
      {transfer.status === "DRAFT" && (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 shadow-sm flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-black uppercase tracking-wider text-amber-900">
              Dokumen Masih Dalam Status Draf
            </div>
            <p className="text-xs text-amber-800 mt-0.5">
              Rekod ini belum mengubah baki pallet lejar dan kenderaan Gatepass tidak boleh disahkan keluar (Check-Out) sehingga butang <strong>Post ke Lejar Pallet</strong> di atas ditekan.
            </p>
          </div>
        </div>
      )}

      {/* Main Grid Details */}
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          {/* Movement Route Card */}
          <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="font-black text-stone-950 flex items-center gap-2">
              <Layers className="h-5 w-5 text-amber-700" /> Laluan Pergerakan Pallet
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto_1fr] items-center">
              <Party label="Daripada (From)" name={transfer.fromCustodian.name} kind={transfer.fromCustodian.kind} />
              <div className="flex justify-center text-3xl font-black text-amber-600 py-2 sm:py-0">➔</div>
              <Party label="Kepada (To)" name={transfer.toCustodian.name} kind={transfer.toCustodian.kind} />
            </div>
          </section>

          {/* Pallet Lines Table */}
          <section className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
            <div className="border-b border-stone-200 px-6 py-4 bg-stone-50/50 flex items-center justify-between">
              <h2 className="font-black text-stone-950 flex items-center gap-2">
                <Boxes className="h-5 w-5 text-amber-700" /> Butiran Kuantiti Pallet
              </h2>
              <span className="text-xs font-black text-amber-900 bg-amber-100 px-3 py-1 rounded-full">
                Jumlah: {totalPallets} Pallet
              </span>
            </div>
            <table className="min-w-full text-left text-sm">
              <thead className="bg-stone-50 text-[10px] uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="px-6 py-3">Jenis Pallet</th>
                  <th className="px-6 py-3">Keadaan Fizikal</th>
                  <th className="px-6 py-3 text-right">Kuantiti</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {transfer.lines.map((line) => (
                  <tr key={line.id} className="hover:bg-stone-50/40">
                    <td className="px-6 py-4">
                      <div className="font-black text-stone-950">{line.palletType.code}</div>
                      <div className="text-xs text-stone-500 font-semibold">{line.palletType.name}</div>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-stone-700">
                      {line.fromCondition} ➔ {line.toCondition}
                    </td>
                    <td className="px-6 py-4 text-right text-2xl font-black text-amber-900">
                      {line.quantity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Transport & Acknowledgement */}
          <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="font-black text-stone-950 flex items-center gap-2">
              <Truck className="h-5 w-5 text-amber-700" /> Butiran Pengangkutan &amp; Serahan
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <Info label="Syarikat Transporter" value={transfer.transportCompany || "—"} />
              <Info label="Nama Pemandu" value={transfer.driverName || "—"} />
              <Info label="No. Pendaftaran Lori" value={transfer.vehicleNo || "—"} />
              <Info label="Diserah Kepada / Penerima" value={transfer.receivedByName || "—"} />
              <Info label="Pautan Bukti" value={transfer.evidenceUrl || "—"} />
              <Info label="Pergerakan Lejar" value={`${transfer.movementCount} rekod lejar`} />
            </div>

            {transfer.remarks && (
              <div className="rounded-2xl bg-stone-50 p-4 text-xs text-stone-700 border border-stone-200">
                <span className="font-bold uppercase text-[10px] text-stone-400 block mb-1">Catatan Tambahan:</span>
                {transfer.remarks}
              </div>
            )}

            <div className="grid gap-5 sm:grid-cols-2 pt-2">
              {transfer.releasedSignature && <Signature label="Tandatangan Pegawai Gudang" src={transfer.releasedSignature} />}
              {transfer.receivedSignature && <Signature label="Tandatangan Penerima / Pemandu" src={transfer.receivedSignature} />}
            </div>
          </section>
        </div>

        {/* Sidebar: Audit & Linked Records */}
        <aside className="space-y-5">
          {/* Audit Control Card */}
          <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 font-black text-stone-950">
              <ShieldCheck className="h-5 w-5 text-emerald-700" /> Kawalan Audit Lejar
            </h2>
            <div className="mt-4 space-y-3.5">
              <Info label="Dicipta Oleh" value={transfer.createdBy.name || "Sistem"} />
              <Info
                label="Dipost Oleh / Masa"
                value={
                  transfer.postedBy
                    ? `${transfer.postedBy.name || "Pengguna"} · ${
                        transfer.postedAt ? new Date(transfer.postedAt).toLocaleString("en-MY") : ""
                      }`
                    : "Belum dipost (Draf)"
                }
              />
              {transfer.reversedBy && (
                <Info
                  label="Dibatalkan Oleh / Masa"
                  value={`${transfer.reversedBy.name || "Pengguna"} · ${
                    transfer.reversedAt ? new Date(transfer.reversedAt).toLocaleString("en-MY") : ""
                  }`}
                />
              )}
              {transfer.reversalReason && <Info label="Sebab Pembatalan" value={transfer.reversalReason} />}
            </div>
          </section>

          {/* Linked Documents Card */}
          <section className="rounded-3xl border-2 border-amber-300 bg-amber-50/70 p-6">
            <h2 className="font-black text-amber-950">Dokumen Berkait</h2>
            <div className="mt-3 space-y-2.5">
              {transfer.gatePass ? (
                <Link
                  href={`/forms/warehouse/gatepass/${transfer.gatePass.id}`}
                  className="flex items-center justify-between rounded-2xl bg-white p-3.5 text-sm font-black text-amber-950 shadow-sm hover:bg-amber-100 transition-colors border border-amber-200"
                >
                  <span>Gatepass: {transfer.gatePass.gatePassNo}</span>
                  <ExternalLink className="h-4 w-4 text-amber-700" />
                </Link>
              ) : (
                <p className="text-xs text-amber-800 italic">Tiada Gatepass dipautkan.</p>
              )}

              {transfer.distributionOrder && (
                <Link
                  href={`/forms/warehouse/distribution/${transfer.distributionOrder.id}/pod`}
                  className="flex items-center justify-between rounded-2xl bg-white p-3.5 text-sm font-black text-amber-950 shadow-sm hover:bg-amber-100 transition-colors border border-amber-200"
                >
                  <span>DO: {transfer.distributionOrder.doNumber}</span>
                  <ExternalLink className="h-4 w-4 text-amber-700" />
                </Link>
              )}
            </div>
          </section>

          {/* Ledger Isolation Notice */}
          <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-4 text-xs text-blue-950 leading-relaxed">
            <strong>Peringatan Pengasingan:</strong> Mengepos dokumen ini hanya mengemas kini rekod <code>PalletMovement</code>. Ia sama sekali tidak mengubah stok produk (*InventoryBatch*, *ProductionTransfer*, *Transfer In* atau *Daily Production Report*).
          </div>
        </aside>
      </div>
    </div>
  )
}

function Party({ label, name, kind }: { label: string; name: string; kind: string }) {
  return (
    <div className="rounded-2xl bg-stone-50 p-4 border border-stone-200">
      <div className="text-[10px] font-black uppercase tracking-wider text-stone-400">{label}</div>
      <div className="mt-1 font-black text-stone-900 text-base">{name}</div>
      <div className="text-xs font-semibold text-stone-500 mt-0.5">{kind.replaceAll("_", " ")}</div>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-black uppercase tracking-wider text-stone-400">{label}</div>
      <div className="break-words text-sm font-bold text-stone-800 mt-0.5">{value}</div>
    </div>
  )
}

function Signature({ label, src }: { label: string; src: string }) {
  return (
    <div>
      <div className="text-[10px] font-black uppercase text-stone-500 font-bold">{label}</div>
      <div className="relative mt-1 h-28 rounded-2xl border border-stone-200 bg-white p-2 shadow-inner">
        <Image src={src} alt={`${label} signature`} fill unoptimized className="object-contain p-2" />
      </div>
    </div>
  )
}
