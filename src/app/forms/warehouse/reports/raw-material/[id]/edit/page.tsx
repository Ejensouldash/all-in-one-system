import { auth } from "@/auth"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Lock } from "lucide-react"
import { getRawMaterialReport, getReportEditability, getWithdrawnSplit } from "@/app/actions/warehouseRawMaterial"
import { RawMaterialForm } from "../../new/RawMaterialForm"

export default async function EditRawMaterialPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) redirect("/login")
  const user = session.user as any

  const { id } = await params
  const res = await getRawMaterialReport(id)
  if (!res.success || !res.data) notFound()
  const report = res.data

  // The same gate the server action enforces. Checking it here too means a locked report never
  // even renders an editable form.
  const state = await getReportEditability(id)

  // Rows whose stock-out came from an Ambil Bahan withdrawal must stay marked as such while editing.
  // They used to arrive with withdrawnQty 0 and locked false, which hid the split from the very
  // person correcting the numbers — while the server carried on subtracting it.
  const splitRes = await getWithdrawnSplit(id)
  const split: Record<string, { withdrawnQty: number; withdrawalNos: string[] }> =
    splitRes.success ? splitRes.data : {}

  const back = `/forms/warehouse/reports/raw-material/${id}`

  if (!state.editable) {
    return (
      <div className="space-y-5">
        <Link href={back} className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-900">
          <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke borang
        </Link>
        <div className="bg-white p-6 rounded-xl border border-amber-300 shadow-sm flex items-start gap-3">
          <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-black uppercase tracking-tight text-amber-900">Borang ini tidak boleh diubah</p>
            <p className="text-xs font-medium text-amber-800 mt-1 leading-relaxed">
              {state.detail?.trim() ||
                "Sebab tidak dapat ditentukan. Muat semula halaman dan cuba lagi."}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <Link href={back} className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-900">
          <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke borang
        </Link>
        <h2 className="text-xl font-black uppercase tracking-tight mt-2">
          Betulkan Borang · {new Date(report.date).toISOString().split("T")[0]} #{report.sequence}
        </h2>
        <p className="text-sm text-gray-500 font-medium">
          SGMP/15/DRM (W) · Rev 3 · DO {report.linkedDoNumber || "belum dijana"} akan dijana semula dengan nombor sama.
        </p>
      </div>

      <RawMaterialForm
        prefillRows={[]}
        prefillFrom={null}
        defaultPreparedBy={user?.name || user?.email || ""}
        initialData={{
          id: report.id,
          date: new Date(report.date).toISOString().split("T")[0],
          time: report.time,
          shift: report.shift,
          preparedBy: report.preparedBy,
          verifiedBy: report.verifiedBy || "",
          referenceDoNumber: report.referenceDoNumber || "",
          remarks: report.remarks || "",
          rows: report.items.map(i => ({
            sku: i.sku,
            batchNo: i.batchNo,
            balanceIn: i.balanceIn,
            qtyIn: i.qtyIn,
            qtyOut: i.qtyOut,
            remarks: i.remarks || "",
            withdrawnQty: split[`${i.sku}|${i.batchNo}`]?.withdrawnQty || 0,
            withdrawalNos: split[`${i.sku}|${i.batchNo}`]?.withdrawalNos || [],
          })),
        }}
      />
    </div>
  )
}
