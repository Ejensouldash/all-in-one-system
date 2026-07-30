import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { getCarryForwardPrefill } from "@/app/actions/warehouseRawMaterial"
import { RawMaterialForm } from "./RawMaterialForm"

export default async function NewRawMaterialPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const user = session.user as any

  const prefill = await getCarryForwardPrefill()
  const rows = prefill.success ? prefill.data!.rows : []
  const from = prefill.success ? prefill.data!.from : null

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/forms/warehouse/reports/raw-material"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke senarai
        </Link>
        <h2 className="text-xl font-black uppercase tracking-tight mt-2">Daily Raw Material (Warehouse)</h2>
        <p className="text-sm text-gray-500 font-medium">
          SGMP/15/DRM (W) · Rev 2 · Quantity Stock Out akan masuk terus ke Transfer In dalam Daily Production Report.
        </p>
      </div>

      <RawMaterialForm
        prefillRows={rows}
        prefillFrom={from}
        defaultPreparedBy={user?.name || user?.email || ""}
      />
    </div>
  )
}
