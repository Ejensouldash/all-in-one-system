import Link from "next/link"
import { Boxes, History, Plus, Scale, Warehouse } from "lucide-react"
import { MaintenanceTabs } from "@/components/forms/MaintenanceTabs"
import { getAccessInfo } from "@/lib/access"
import { getPalletBalances, listPalletTransfers, listPhysicalPalletDashboard, listPalletReferenceData } from "@/lib/warehouse/pallet-ledger-service"
import { PhysicalPalletControls } from "./PhysicalPalletControls"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"
export const metadata = { title: "Returnable Pallet Ledger" }

export default async function PalletLedgerPage() {
  const access = await getAccessInfo()
  if (!access) redirect("/login?callbackUrl=/forms/maintenance/pallet-transfer")
  const [balances, transfers, physicalPallets, reference] = await Promise.all([getPalletBalances(), listPalletTransfers(), listPhysicalPalletDashboard(), listPalletReferenceData()])
  const totalUsable = balances
    .filter((row) => row.custodian.kind === "WAREHOUSE_USABLE")
    .reduce((sum, row) => sum + row.balance, 0)
  const totalDamaged = balances
    .filter((row) => row.custodian.kind === "WAREHOUSE_DAMAGED")
    .reduce((sum, row) => sum + row.balance, 0)
  const external = balances
    .filter((row) => row.custodian.kind === "CUSTOMER" || row.custodian.kind === "TRANSPORTER")
    .reduce((sum, row) => sum + row.balance, 0)

  return (
    <div className="min-h-screen bg-stone-50 pb-16">
      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8 space-y-6">
        <MaintenanceTabs userModules={access.isSuperAdmin ? undefined : access.modules} />

        {/* Hero Card */}
        <div className="rounded-3xl bg-gradient-to-r from-stone-950 via-amber-950 to-yellow-950 p-6 md:p-8 text-white shadow-xl">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-3.5 py-1 text-xs font-black uppercase tracking-[0.2em] text-amber-200">
                <Boxes className="h-4 w-4" /> Kawalan Aset Boleh Pulang (Returnable Assets)
              </div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight">Lejar Pallet Kayu (Wooden Pallet)</h1>
              <p className="mt-2 max-w-2xl text-xs md:text-sm text-amber-100/80 leading-relaxed">
                Lejar khas berasingan (append-only) untuk menguruskan pengeluaran, pemulangan, kerosakan dan pelupusan pallet kayu. Ia tidak mengubah baki stok produk.
              </p>
            </div>
            <Link
              href="/forms/maintenance/pallet-transfer/new"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-400 px-5 py-3.5 text-sm font-black text-stone-950 shadow-lg hover:bg-amber-300 active:scale-98 transition-all"
            >
              <Plus className="h-5 w-5" /> Rekod Pergerakan Baharu
            </Link>
          </div>
        </div>

        <PhysicalPalletControls palletTypes={reference.palletTypes} custodians={reference.custodians} gatePasses={reference.gatePasses} />

        {/* Balances Summary Metric Cards */}
        <div className="grid gap-4 sm:grid-cols-4">
          <Summary icon={<Warehouse className="h-5 w-5" />} label="Warehouse Sedia Digunakan" value={totalUsable} />
          <Summary icon={<Boxes className="h-5 w-5" />} label="Warehouse Rosak" value={totalDamaged} />
          <Summary icon={<Scale className="h-5 w-5" />} label="Di Pihak Luar (Customer)" value={external} />
          <Summary icon={<History className="h-5 w-5" />} label="Jumlah Rekod Transaksi" value={transfers.length} />
        </div>

        {/* Balance by Custodian */}
        <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-black text-stone-950 text-base">Baki Mengikut Pemegang (Custodian Balances)</h2>
            <Link
              href="/forms/maintenance/pallet-transfer/new"
              className="text-xs font-bold text-amber-800 hover:underline"
            >
              + Setup Stok Awal
            </Link>
          </div>

          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {balances.map((row) => (
              <div
                key={`${row.custodian.id}:${row.palletType.id}`}
                className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4 hover:border-amber-300 transition-colors"
              >
                <div className="text-[10px] font-black uppercase tracking-wider text-stone-400">
                  {row.custodian.kind.replaceAll("_", " ")}
                </div>
                <div className="mt-1 font-bold text-stone-900 truncate text-sm">{row.custodian.name}</div>
                <div className="mt-3 flex items-end justify-between border-t border-stone-100 pt-2">
                  <span className="text-xs font-semibold text-stone-500">{row.palletType.code}</span>
                  <span
                    className={`text-2xl font-black ${
                      row.balance < 0 ? "text-red-700" : "text-amber-900"
                    }`}
                  >
                    {row.balance}
                  </span>
                </div>
              </div>
            ))}
            {!balances.length && (
              <div className="col-span-full py-8 text-center text-sm text-stone-500">
                Belum ada baki lejar pallet. Mulakan dengan merekodkan <strong>Setup Stok Awal Pallet</strong>.
              </div>
            )}
          </div>
        </section>

        {/* Pallet Movement Register */}
        <section className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
          <div className="border-b border-stone-200 px-6 py-4 bg-stone-50/50">
            <h2 className="font-black text-stone-950 text-base">Daftar Transaksi Pergerakan Pallet</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-stone-50 text-[10px] uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="px-6 py-3.5 font-black">No. Transaksi</th>
                  <th className="px-6 py-3.5 font-black">Tarikh / Jenis</th>
                  <th className="px-6 py-3.5 font-black">Laluan (Asal ➔ Penerima)</th>
                  <th className="px-6 py-3.5 text-right font-black">Kuantiti</th>
                  <th className="px-6 py-3.5 font-black">Dokumen Rujukan</th>
                  <th className="px-6 py-3.5 font-black">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {transfers.map((transfer) => (
                  <tr key={transfer.id} className="hover:bg-amber-50/40 transition-colors">
                    <td className="px-6 py-4">
                      <Link
                        href={`/forms/maintenance/pallet-transfer/${transfer.id}`}
                        className="font-black text-amber-900 hover:underline text-base"
                      >
                        {transfer.transferNo}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-stone-800 text-xs">
                        {transfer.occurredAt.toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" })}
                      </div>
                      <div className="text-[11px] text-stone-500 font-bold">
                        {transfer.movementType.replaceAll("_", " ")}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-stone-900">{transfer.fromCustodian.name}</div>
                      <div className="text-xs font-bold text-amber-700">➔ {transfer.toCustodian.name}</div>
                    </td>
                    <td className="px-6 py-4 text-right text-lg font-black text-stone-900">
                      {transfer.lines.reduce((sum, line) => sum + line.quantity, 0)}
                    </td>
                    <td className="px-6 py-4 text-xs text-stone-600">
                      {transfer.gatePass ? (
                        <span className="font-bold text-cyan-800">GP: {transfer.gatePass.gatePassNo}</span>
                      ) : (
                        "—"
                      )}
                      <br />
                      {transfer.distributionOrder ? (
                        <span className="text-slate-500">DO: {transfer.distributionOrder.doNumber}</span>
                      ) : null}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black border ${
                          transfer.status === "POSTED"
                            ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                            : transfer.status === "REVERSED"
                            ? "bg-red-100 text-red-800 border-red-300"
                            : "bg-slate-100 text-slate-700 border-slate-300"
                        }`}
                      >
                        {transfer.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {!transfers.length && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-stone-500">
                      Tiada transaksi lejar pallet direkodkan setakat ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
          <div className="border-b border-stone-200 px-6 py-4 bg-stone-50/50">
            <h2 className="font-black text-stone-950 text-base">Pallet Fizikal Ber-QR</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-stone-50 text-[10px] uppercase tracking-wider text-stone-500"><tr><th className="px-6 py-3">QR / ID</th><th className="px-6 py-3">Status</th><th className="px-6 py-3">Lokasi Semasa</th><th className="px-6 py-3">Kemaskini</th></tr></thead>
              <tbody className="divide-y divide-stone-100">{physicalPallets.map(pallet => <tr key={pallet.id}><td className="px-6 py-3"><Link className="font-black text-amber-900 hover:underline" href={`/forms/maintenance/pallet-transfer/trace/${encodeURIComponent(pallet.palletCode)}`}>{pallet.palletCode}</Link></td><td className="px-6 py-3 font-bold">{pallet.status.replaceAll("_", " ")}</td><td className="px-6 py-3">{pallet.currentCustodian?.name || "Warehouse"}</td><td className="px-6 py-3 text-xs text-stone-500">{pallet.lastMovedAt.toLocaleDateString("en-MY")}</td></tr>)}{!physicalPallets.length && <tr><td className="px-6 py-8 text-stone-500" colSpan={4}>Belum ada pallet fizikal didaftarkan. Daftarkan QR pallet sebelum scan keluar/return.</td></tr>}</tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}

function Summary({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-5 md:p-6 shadow-sm">
      <div className="flex items-center gap-2 text-amber-800">
        {icon}
        <span className="text-[11px] font-black uppercase tracking-wider text-stone-500">{label}</span>
      </div>
      <div className="mt-3 text-3xl font-black text-stone-950 tracking-tight">{value.toLocaleString()}</div>
    </div>
  )
}
