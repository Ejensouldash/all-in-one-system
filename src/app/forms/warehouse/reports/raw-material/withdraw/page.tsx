import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, History } from "lucide-react"
import { getAccessInfo, hasAnyModule } from "@/lib/access"
import { getWarehouseLiveStock } from "@/app/actions/rawMaterialWithdrawal"
import { WithdrawForm } from "./WithdrawForm"

export default async function WithdrawPage() {
  const access = await getAccessInfo()
  if (!access) redirect("/login")
  if (!hasAnyModule(access, ["WAREHOUSE", "RAW_MATERIAL_WITHDRAWAL"])) redirect("/forms")

  const stock = await getWarehouseLiveStock()

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <Link
            href="/forms/warehouse/reports/raw-material"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-900"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Daily Raw Material
          </Link>
          <h2 className="text-xl font-black uppercase tracking-tight mt-2">Ambil Bahan dari Warehouse</h2>
          <p className="text-sm text-gray-500 font-medium">
            Rekod apa yang diambil dari rak. Untuk tujuan Production, ia terus masuk ke Transfer In
            dalam Daily Production Report.
          </p>
        </div>
        <Link
          href="/forms/warehouse/reports/raw-material/withdraw/history"
          className="inline-flex items-center gap-2 px-4 py-2 border-2 border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white text-xs font-black uppercase tracking-wide rounded-lg transition-colors"
        >
          <History className="w-4 h-4" /> Sejarah
        </Link>
      </div>

      <WithdrawForm stock={stock.data} defaultTakenBy={access.name || ""} />
    </div>
  )
}
