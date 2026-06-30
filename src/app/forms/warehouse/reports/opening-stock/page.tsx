"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { getOpeningStocks, setOpeningStock } from "@/app/actions/warehouse-reports"
import { SessionProvider } from "next-auth/react"

export default function Page() {
  return (
    <SessionProvider>
      <OpeningStockPage />
    </SessionProvider>
  )
}

function OpeningStockPage() {
  const { data: session } = useSession()
  const [stocks, setStocks] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState("")

  // Form State
  const [batchNumber, setBatchNumber] = useState("")
  const [sku, setSku] = useState("p800_12") // Default
  const [openingQty, setOpeningQty] = useState("")
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())

  useEffect(() => {
    fetchStocks()
  }, [])

  async function fetchStocks() {
    setLoading(true)
    const res = await getOpeningStocks()
    if (res.success && res.data) setStocks(res.data)
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!session?.user?.id) return

    setSubmitting(true)
    setMessage("")

    const res = await setOpeningStock({
      batchNumber,
      sku,
      openingQty: parseInt(openingQty),
      month,
      year,
      userId: session.user.id
    })

    if (res.success) {
      setMessage("Opening stock set successfully!")
      setBatchNumber("")
      setOpeningQty("")
      fetchStocks()
    } else {
      setMessage("Failed to set opening stock.")
    }
    setSubmitting(false)
  }

  const isSuperadmin = session?.user?.role === "SUPERADMIN" || session?.user?.role === "ADMIN" || session?.user?.email === "dina@bubbleso2.com"

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-black uppercase">System Initialization</h2>
        <p className="text-sm text-gray-500 font-bold">Set the opening stock for the very first month of system deployment.</p>
      </div>

      {!isSuperadmin ? (
        <div className="bg-red-50 text-red-700 p-4 rounded-md font-bold border border-red-200">
          Only Superadmin, Admin, or authorized personnel can set opening stocks.
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="font-bold text-lg mb-4 uppercase">Set Opening Stock</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Batch Number</label>
              <input required type="text" value={batchNumber} onChange={e => setBatchNumber(e.target.value.toUpperCase())} className="w-full border-2 border-gray-300 p-2 font-bold focus:border-emerald-500 outline-none uppercase" placeholder="e.g. 010626-01" />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">SKU</label>
              <select value={sku} onChange={e => setSku(e.target.value)} className="w-full border-2 border-gray-300 p-2 font-bold focus:border-emerald-500 outline-none">
                <option value="p425_24">425ml x 24</option>
                <option value="p425_6">425ml x 6</option>
                <option value="p800_12">800ml x 12</option>
                <option value="p800_20">800ml x 20</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Opening Qty (Box)</label>
              <input required type="number" min="0" value={openingQty} onChange={e => setOpeningQty(e.target.value)} className="w-full border-2 border-gray-300 p-2 font-bold focus:border-emerald-500 outline-none" />
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Month</label>
                <input required type="number" min="1" max="12" value={month} onChange={e => setMonth(parseInt(e.target.value))} className="w-full border-2 border-gray-300 p-2 font-bold focus:border-emerald-500 outline-none" />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Year</label>
                <input required type="number" min="2020" value={year} onChange={e => setYear(parseInt(e.target.value))} className="w-full border-2 border-gray-300 p-2 font-bold focus:border-emerald-500 outline-none" />
              </div>
            </div>

            <div className="md:col-span-2 pt-2">
              <button type="submit" disabled={submitting} className="w-full bg-emerald-600 text-white font-bold uppercase py-3 hover:bg-emerald-700 transition-colors disabled:opacity-50">
                {submitting ? "Saving..." : "Set Opening Stock"}
              </button>
              {message && <p className="mt-2 text-sm font-bold text-emerald-600 text-center">{message}</p>}
            </div>
          </form>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="font-bold text-lg mb-4 uppercase">Existing Opening Stocks</h3>
        {loading ? (
          <p className="text-gray-500 italic">Loading...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-2 text-left">Period</th>
                  <th className="border border-gray-300 p-2 text-left">Batch Number</th>
                  <th className="border border-gray-300 p-2 text-left">SKU</th>
                  <th className="border border-gray-300 p-2 text-right">Opening Qty</th>
                  <th className="border border-gray-300 p-2 text-left">Set By</th>
                </tr>
              </thead>
              <tbody>
                {stocks.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="border border-gray-300 p-2 font-bold">{s.month}/{s.year}</td>
                    <td className="border border-gray-300 p-2 font-bold">{s.batchNumber}</td>
                    <td className="border border-gray-300 p-2">{s.sku}</td>
                    <td className="border border-gray-300 p-2 text-right font-bold text-emerald-700">{s.openingQty}</td>
                    <td className="border border-gray-300 p-2">{s.setBy?.name}</td>
                  </tr>
                ))}
                {stocks.length === 0 && (
                  <tr><td colSpan={5} className="border border-gray-300 p-4 text-center text-gray-500 italic">No opening stocks configured yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}
