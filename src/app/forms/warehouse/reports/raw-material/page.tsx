import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Plus, FileText, ArrowRight, PackageSearch } from "lucide-react"
import { listRawMaterialReports } from "@/app/actions/warehouseRawMaterial"

const dmy = (d: Date) => {
  const iso = new Date(d).toISOString().split("T")[0]
  const [y, m, day] = iso.split("-")
  return `${day}/${m}/${y}`
}

export default async function RawMaterialListPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const res = await listRawMaterialReports()
  const reports = res.success ? res.data! : []

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight">Daily Raw Material (Warehouse)</h2>
          <p className="text-sm text-gray-500 font-medium">
            SGMP/15/DRM (W) · Rev 2 · Baki bahan mentah warehouse dan stock out ke production.
          </p>
        </div>
        <Link
          href="/forms/warehouse/reports/raw-material/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black uppercase tracking-wide rounded-lg shadow-sm"
        >
          <Plus className="w-4 h-4" /> Borang Baharu
        </Link>
      </div>

      {reports.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 flex flex-col items-center text-center">
          <PackageSearch className="w-10 h-10 text-gray-300 mb-3" />
          <p className="text-sm font-bold text-gray-500">Belum ada borang direkodkan.</p>
          <p className="text-xs text-gray-400 mt-1 max-w-md">
            Borang pertama bermula dengan Balance In Warehouse kosong. Selepas itu setiap borang baharu
            akan ambil carry forward daripada borang sebelumnya secara automatik.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead className="bg-gray-50">
                <tr className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-3 text-left">Tarikh</th>
                  <th className="px-4 py-3 text-left">Shift</th>
                  <th className="px-4 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-right">Baris</th>
                  <th className="px-4 py-3 text-right">Jumlah Stock Out</th>
                  <th className="px-4 py-3 text-left">DO Dijana</th>
                  <th className="px-4 py-3 text-left">Prepared By</th>
                  <th className="px-4 py-3 w-[60px]" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reports.map(r => {
                  const totalOut = r.items.reduce((s, i) => s + i.qtyOut, 0)
                  return (
                    <tr key={r.id} className="hover:bg-gray-50/60">
                      <td className="px-4 py-3 text-xs font-black text-gray-900">{dmy(r.date)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black ${
                            r.shift === "AM" ? "bg-sky-100 text-sky-800" : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {r.shift}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-gray-500">#{r.sequence}</td>
                      <td className="px-4 py-3 text-xs text-right text-gray-700">{r.items.length}</td>
                      <td className="px-4 py-3 text-xs text-right font-black text-red-700">
                        {totalOut.toLocaleString("en-MY")}
                      </td>
                      <td className="px-4 py-3">
                        {r.linkedDoNumber ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black text-indigo-700">
                            <ArrowRight className="w-3 h-3" />
                            {r.linkedDoNumber}
                          </span>
                        ) : (
                          <span className="text-[11px] text-gray-300 font-bold">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 truncate max-w-[180px]">{r.preparedBy}</td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/forms/warehouse/reports/raw-material/${r.id}`}
                          className="inline-flex text-gray-400 hover:text-indigo-600"
                          title="Lihat"
                        >
                          <FileText className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
