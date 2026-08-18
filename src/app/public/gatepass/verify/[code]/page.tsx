import type { Metadata } from "next"
import Link from "next/link"
import { CheckCircle2, ClipboardList, MapPin, PackageCheck, ShieldCheck, Truck, XCircle } from "lucide-react"
import { getVerificationGatePass } from "@/lib/warehouse/gatepass-service"

export const dynamic = "force-dynamic"
export const metadata: Metadata = {
  title: "Verify BubblesO2 Gatepass & DO",
  robots: { index: false, follow: false, nocache: true },
}

function formatSku(sku: string) {
  return sku.replace("p800_", "800ml × ").replace("p425_", "425ml × ").toUpperCase()
}

export default async function VerifyGatePassPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const gatePass = await getVerificationGatePass(code)

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 md:p-8 shadow-2xl space-y-5">
        {gatePass ? (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-10 w-10 text-emerald-600" />
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">
                    Rekod Rasmi Sah BubblesO2
                  </div>
                  <div className="text-xs text-slate-500 font-medium">Pengesahan Pos Keselamatan &amp; DO</div>
                </div>
              </div>
              <span className="rounded-full bg-emerald-100 border border-emerald-300 px-3 py-1 text-[11px] font-black text-emerald-900 uppercase">
                {gatePass.status.replaceAll("_", " ")}
              </span>
            </div>

            <div className="border-t border-b border-slate-100 py-4 space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase">No. Gatepass</span>
                <span className="text-2xl font-black text-slate-950">{gatePass.gatePassNo}</span>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 space-y-2.5 border border-slate-100 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-bold flex items-center gap-1.5">
                    <Truck className="h-4 w-4 text-cyan-700" /> No. Plat Lori
                  </span>
                  <span className="font-mono font-black text-sm text-slate-900">
                    {gatePass.vehicleNo || "Menunggu pemandu"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-bold flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-cyan-700" /> Destinasi
                  </span>
                  <span className="font-bold text-slate-900 truncate max-w-[200px]">
                    {gatePass.destination}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-bold flex items-center gap-1.5">
                    <PackageCheck className="h-4 w-4 text-cyan-700" /> Muatan Pallet
                  </span>
                  <span className="font-bold text-slate-900">
                    {gatePass.actualPalletQty ?? gatePass.plannedPalletQty} Wooden Pallet
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px]">
                  <span className="text-slate-400 font-bold">Waktu Pengambilan:</span>
                  <span className="font-semibold text-slate-700">
                    {gatePass.requestedPickupAt.toLocaleString("en-MY", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Linked Delivery Orders (DO) */}
            {gatePass.deliveryOrders && gatePass.deliveryOrders.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <ClipboardList className="h-4 w-4 text-indigo-600" /> Delivery Order (DO) Berkait
                  </span>
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                    {gatePass.deliveryOrders.length} DO
                  </span>
                </div>

                <div className="space-y-2">
                  {gatePass.deliveryOrders.map((link) => {
                    const doOrder = link.distributionOrder
                    const totalItems = doOrder.items.reduce((sum, item) => sum + item.qtySent, 0)

                    return (
                      <div
                        key={doOrder.id}
                        className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-3.5 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-black text-sm text-indigo-950 font-mono">{doOrder.doNumber}</span>
                          <span className="font-black text-indigo-900 bg-indigo-100 px-2 py-0.5 rounded-full text-[10px]">
                            {totalItems} kotak
                          </span>
                        </div>
                        <p className="text-slate-600 font-medium truncate">{doOrder.destination}</p>

                        <div className="pt-1 flex flex-wrap gap-1">
                          {doOrder.items.map((item, idx) => (
                            <span
                              key={idx}
                              className="inline-block bg-white text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded border border-indigo-100"
                            >
                              {formatSku(item.sku)} ({item.qtySent})
                            </span>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Internal Staff Quick Link */}
            <div className="pt-2">
              <Link
                href={`/forms/warehouse/gatepass/security/${code}`}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-xs font-black text-white shadow-md hover:bg-slate-950 transition-all"
              >
                <ShieldCheck className="h-4 w-4 text-amber-400" />
                <span>Buka Panel Kawalan Pos Pintu (Security)</span>
              </Link>
            </div>

            <p className="text-center text-[10px] text-slate-400 leading-relaxed">
              Halaman pengesahan rasmi ini selamat dan dijana khas untuk semakan keselamatan di kilang BubblesO2.
            </p>
          </>
        ) : (
          <div className="text-center py-6 space-y-3">
            <XCircle className="mx-auto h-12 w-12 text-red-500" />
            <div className="text-xs font-black uppercase tracking-[0.2em] text-red-700">Tidak Sah</div>
            <h1 className="text-2xl font-black text-slate-950">QR Gatepass Tidak Sah atau Telah Dibatalkan</h1>
            <p className="text-xs text-slate-600 max-w-xs mx-auto">
              Sila hubungi PIC Gudang BubblesO2 untuk mendapatkan QR Gatepass yang terkini.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
