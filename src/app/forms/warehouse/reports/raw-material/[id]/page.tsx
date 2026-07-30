import { auth } from "@/auth"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, ArrowRight, Lock, Ban, CheckCircle2 } from "lucide-react"
import { PrintButton } from "@/components/ui/PrintButton"
import { getRawMaterialReport, getReportEditability } from "@/app/actions/warehouseRawMaterial"
import { findSku, sectionRank, skuRank } from "@/lib/warehouse/rawMaterialSkus"
import { RawMaterialActions } from "../RawMaterialActions"

const dmy = (d: Date) => {
  const iso = new Date(d).toISOString().split("T")[0]
  const [y, m, day] = iso.split("-")
  return `${day}/${m}/${y}`
}
const nf = (n: number) => n.toLocaleString("en-MY")

export default async function RawMaterialViewPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) redirect("/login")
  const user = session.user as any
  const isSuperAdmin = user?.trueRole === "SUPERADMIN" || user?.role === "SUPERADMIN"

  const { id } = await params
  const res = await getRawMaterialReport(id)
  if (!res.success || !res.data) notFound()
  const report = res.data

  const state = await getReportEditability(id)
  const isVoid = report.status === "VOID"

  // Group into the paper form's sections, keeping the paper's row order.
  const bySection = new Map<string, typeof report.items>()
  for (const item of report.items) {
    const section = findSku(item.sku)?.section || "LAIN-LAIN"
    if (!bySection.has(section)) bySection.set(section, [])
    bySection.get(section)!.push(item)
  }
  const sections = [...bySection.entries()]
    .sort((a, b) => sectionRank(a[0]) - sectionRank(b[0]))
    .map(([section, items]) => ({
      section,
      unit: findSku(items[0].sku)?.unit || "",
      items: [...items].sort((a, b) => skuRank(a.sku) - skuRank(b.sku) || a.batchNo.localeCompare(b.batchNo)),
    }))

  const outItems = report.items.filter(i => i.qtyOut > 0)

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
        <Link
          href="/forms/warehouse/reports/raw-material"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke senarai
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <RawMaterialActions
            reportId={report.id}
            editable={state.editable}
            isSuperAdmin={isSuperAdmin}
            linkedDoNumber={report.linkedDoNumber}
          />
          <PrintButton />
        </div>
      </div>

      {isVoid && (
        <div className="print:hidden flex items-start gap-3 p-4 rounded-xl border bg-gray-100 border-gray-300">
          <Ban className="w-5 h-5 text-gray-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-gray-700">
              Borang dibatalkan (VOID)
              {report.voidedAt && ` · ${dmy(report.voidedAt)}`}
            </p>
            <p className="text-[11px] font-medium text-gray-600 mt-0.5 leading-snug">
              Sebab: {report.voidReason || "-"}. DO yang dijana telah dibuang, dan borang ini tidak dikira
              dalam carry forward. Rekod disimpan untuk jejak audit.
            </p>
          </div>
        </div>
      )}

      {!isVoid && report.linkedDoNumber && (
        <div
          className={`print:hidden flex items-start gap-3 p-4 rounded-xl border ${
            state.editable ? "bg-indigo-50 border-indigo-200" : "bg-amber-50 border-amber-300"
          }`}
        >
          {state.editable ? (
            <ArrowRight className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          ) : (
            <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          )}
          <div>
            <p className={`text-xs font-black uppercase tracking-wide ${state.editable ? "text-indigo-900" : "text-amber-900"}`}>
              {report.linkedDoNumber} · {outItems.length} baris dihantar ke production
            </p>
            <p className={`text-[11px] font-medium mt-0.5 leading-snug ${state.editable ? "text-indigo-700" : "text-amber-800"}`}>
              {state.editable
                ? `DO ini akan muncul dalam bahagian Transfer In borang harian shift ${report.shift} pada ${dmy(report.date)}. Belum digunakan lagi.`
                : state.detail}
            </p>
          </div>
        </div>
      )}

      {!isVoid && !report.linkedDoNumber && (
        <div className="print:hidden flex items-start gap-3 p-4 rounded-xl border bg-gray-50 border-gray-200">
          {state.editable ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          )}
          <p className="text-[11px] font-medium text-gray-600 leading-snug">
            Tiada stock out dalam borang ini, jadi tiada DO dijana. {state.editable ? "" : state.detail}
          </p>
        </div>
      )}

      {/* printable document */}
      <div className="bg-white p-6 sm:p-8 rounded-xl border border-gray-200 shadow-sm print-container">
        <div className="flex items-start justify-between gap-6 border-b-2 border-black pb-3 mb-5">
          <div className="flex items-center gap-4">
            {/* Plain img, not next/image: the optimizer fetches /assets server-side without a
                session cookie, and src/proxy.ts redirects that to /login. Same approach as every
                other form header (GMPHeader, MaintenanceHeader, the POD page). */}
            <img src="/assets/BubblesO2_Logo.png" alt="BubblesO2" className="h-9 object-contain" />
            <div className="text-[10px] leading-tight text-gray-700">
              <p className="font-black">BUBBLES O2 SDN BHD</p>
              <p>KOMPLEKS AL AMMAR, KG KANCHONG</p>
              <p>71200 RANTAU, NEGERI SEMBILAN</p>
            </div>
          </div>
          <table className="text-[9px] border border-gray-400">
            <tbody>
              <Meta k="Rec. No" v="SGMP/15/DRM (W)" />
              <Meta k="Issue No" v="1/10/22" />
              <Meta k="Rev. No" v="3" />
              <Meta k="Effective Date" v="01/07/2026" />
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
          <h1 className="text-lg font-black uppercase tracking-tight">Daily Raw Material (Warehouse)</h1>
          <div className="flex gap-6 text-xs">
            <span><b className="font-black">DATE :</b> {dmy(report.date)}</span>
            <span><b className="font-black">TIME :</b> {report.time}</span>
            <span><b className="font-black">SHIFT :</b> {report.shift}</span>
            <span><b className="font-black">NO :</b> #{report.sequence}</span>
          </div>
        </div>

        <div className="space-y-5">
          {sections.map(({ section, unit, items }) => (
            <table key={section} className="w-full border-collapse border border-gray-500 text-[11px]">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-500 px-2 py-1.5 text-left font-black uppercase w-[26%]">{section}</th>
                  <th className="border border-gray-500 px-2 py-1.5 font-black uppercase">Balance In Ware House</th>
                  <th className="border border-gray-500 px-2 py-1.5 font-black uppercase">Quantity Stock In</th>
                  <th className="border border-gray-500 px-2 py-1.5 font-black uppercase">Quantity Stock Out</th>
                  <th className="border border-gray-500 px-2 py-1.5 font-black uppercase">Balance Carry Forward</th>
                  <th className="border border-gray-500 px-2 py-1.5 font-black uppercase w-[18%]">Remarks</th>
                </tr>
                <tr className="bg-gray-50">
                  <th className="border border-gray-500 px-2 py-1 font-black uppercase text-[10px]">Batch Number</th>
                  {[0, 1, 2, 3].map(i => (
                    <th key={i} className="border border-gray-500 px-2 py-1 font-black uppercase text-[10px]">{unit}</th>
                  ))}
                  <th className="border border-gray-500" />
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id}>
                    <td className="border border-gray-500 px-2 py-1.5 font-mono font-bold">
                      {findSku(item.sku)?.label !== section && (
                        <span className="text-gray-400 mr-1">({findSku(item.sku)?.label}) :</span>
                      )}
                      {item.batchNo}
                    </td>
                    <td className="border border-gray-500 px-2 py-1.5 text-right">{nf(item.balanceIn)}</td>
                    <td className="border border-gray-500 px-2 py-1.5 text-right text-emerald-700 font-bold">
                      {item.qtyIn > 0 ? nf(item.qtyIn) : ""}
                    </td>
                    <td className="border border-gray-500 px-2 py-1.5 text-right text-red-700 font-bold">
                      {item.qtyOut > 0 ? nf(item.qtyOut) : ""}
                    </td>
                    <td className="border border-gray-500 px-2 py-1.5 text-right font-black">{nf(item.carryForward)}</td>
                    <td className="border border-gray-500 px-2 py-1.5 text-[10px]">{item.remarks || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}
        </div>

        {report.remarks && (
          <div className="mt-5 border border-gray-500 p-3">
            <p className="text-[10px] font-black uppercase tracking-wider text-gray-500">Remarks</p>
            <p className="text-xs mt-1">{report.remarks}</p>
          </div>
        )}

        <div className="mt-10 flex justify-between text-xs">
          <div>
            <p className="font-black">Prepared by :</p>
            <p className="mt-6 border-t border-gray-500 pt-1 min-w-[200px]">{report.preparedBy}</p>
          </div>
          <div>
            <p className="font-black">Verified by :</p>
            <p className="mt-6 border-t border-gray-500 pt-1 min-w-[200px]">{report.verifiedBy || ""}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <tr>
      <td className="border border-gray-400 px-2 py-0.5 font-bold">{k}</td>
      <td className="border border-gray-400 px-2 py-0.5">: {v}</td>
    </tr>
  )
}
