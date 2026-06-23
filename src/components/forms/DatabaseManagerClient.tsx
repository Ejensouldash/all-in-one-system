"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2, AlertCircle, Loader2, Search, CheckSquare } from "lucide-react"
import { deleteDailyReports, deleteTransferIns } from "@/app/actions/databaseManager"

export function DatabaseManagerClient({ 
  dailyReports, 
  transferIns 
}: { 
  dailyReports: any[], 
  transferIns: any[] 
}) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"REPORTS" | "DO">("REPORTS")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isDeleting, setIsDeleting] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  const activeData = activeTab === "REPORTS" ? dailyReports : transferIns
  
  const filteredData = activeData.filter((item: any) => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    if (activeTab === "REPORTS") {
      return item.preparedBy?.toLowerCase().includes(term) || item.line?.toLowerCase().includes(term) || item.shift?.toLowerCase().includes(term)
    } else {
      return item.doNumber?.toLowerCase().includes(term) || item.receiverName?.toLowerCase().includes(term)
    }
  })

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredData.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredData.map((d: any) => d.id))
    }
  }

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  const handleDelete = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`WARNING: You are about to permanently delete ${selectedIds.length} records. This action cannot be undone. Proceed?`)) return

    setIsDeleting(true)
    let res;
    if (activeTab === "REPORTS") {
      res = await deleteDailyReports(selectedIds)
    } else {
      res = await deleteTransferIns(selectedIds)
    }
    
    setIsDeleting(false)

    if (res.success) {
      setSelectedIds([])
      router.refresh()
    } else {
      alert(`Error: ${res.error}`)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      
      {/* Action Bar */}
      <div className="bg-gray-50 border-b border-gray-200 p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        
        {/* Sub-Tabs */}
        <div className="flex bg-gray-200/50 p-1 rounded-lg">
          <button 
            onClick={() => { setActiveTab("REPORTS"); setSelectedIds([]) }}
            className={`px-4 py-2 text-sm font-bold uppercase tracking-wider rounded-md transition-colors ${activeTab === "REPORTS" ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            Daily Reports ({dailyReports.length})
          </button>
          <button 
            onClick={() => { setActiveTab("DO"); setSelectedIds([]) }}
            className={`px-4 py-2 text-sm font-bold uppercase tracking-wider rounded-md transition-colors ${activeTab === "DO" ? "bg-white text-emerald-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            Transfer Ins ({transferIns.length})
          </button>
        </div>

        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search records..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full sm:w-64 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-red-50 border-b border-red-100 p-3 flex justify-between items-center animate-in slide-in-from-top-2">
          <div className="flex items-center text-red-800 font-bold text-sm">
            <CheckSquare className="h-5 w-5 mr-2 text-red-600" />
            {selectedIds.length} item{selectedIds.length > 1 ? 's' : ''} selected
          </div>
          <button 
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center transition-colors disabled:opacity-50"
          >
            {isDeleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
            Delete Selected
          </button>
        </div>
      )}

      {/* Data Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-4 text-left">
                <input 
                  type="checkbox" 
                  checked={filteredData.length > 0 && selectedIds.length === filteredData.length}
                  onChange={toggleSelectAll}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                />
              </th>
              {activeTab === "REPORTS" ? (
                <>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Shift</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Line</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Prepared By</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Status</th>
                </>
              ) : (
                <>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Receive Date</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">DO Number</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Receiver</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Items</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500 font-medium italic">
                  No records found matching your search.
                </td>
              </tr>
            ) : (
              filteredData.map((item: any) => (
                <tr key={item.id} className={selectedIds.includes(item.id) ? "bg-red-50/50" : "hover:bg-gray-50 transition-colors"}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input 
                      type="checkbox" 
                      checked={selectedIds.includes(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    />
                  </td>
                  {activeTab === "REPORTS" ? (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{new Date(item.date).toLocaleDateString('en-GB')}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{item.shift}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{item.line}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 uppercase">{item.preparedBy}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">{item.status}</td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{new Date(item.receiveDate).toLocaleDateString('en-GB')}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{item.receiveTime}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-emerald-700">{item.doNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 uppercase">{item.receiverName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">{item.items?.length || 0} items</td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
