"use client"

import { useState } from "react"
import Link from "next/link"
import { Eye, Pencil, Trash2, Loader2, CheckSquare, Square } from "lucide-react"
import { deleteTransferIn, bulkDeleteTransferIn } from "@/app/actions/transferIn"

export function TransferInHistoryClient({ 
  transfers, 
  hasAdminAccess 
}: { 
  transfers: any[], 
  hasAdminAccess: boolean 
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  const handleDelete = async (id: string, doNumber: string) => {
    if (!confirm(`Are you sure you want to delete DO ${doNumber}? This will also remove all its items from stock.`)) {
      return
    }

    setDeletingId(id)
    const res = await deleteTransferIn(id)
    if (!res.success) {
      alert("Failed to delete: " + res.error)
      setDeletingId(null)
    } else {
      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} DOs? This will also remove all their items from stock.`)) {
      return
    }

    setIsBulkDeleting(true)
    const res = await bulkDeleteTransferIn(selectedIds)
    if (!res.success) {
      alert("Failed to bulk delete: " + res.error)
      setIsBulkDeleting(false)
    } else {
      setSelectedIds([])
      setIsBulkDeleting(false)
    }
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === transfers.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(transfers.map(t => t.id))
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  return (
    <>
      <thead className="bg-gray-50">
        <tr>
          <th scope="col" className="w-12 px-6 py-4 text-left">
            <button onClick={toggleSelectAll} className="text-gray-400 hover:text-emerald-600 focus:outline-none">
              {selectedIds.length === transfers.length && transfers.length > 0 ? (
                <CheckSquare className="w-5 h-5 text-emerald-600" />
              ) : (
                <Square className="w-5 h-5" />
              )}
            </button>
          </th>
          <th scope="col" className="w-32 px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Date</th>
          <th scope="col" className="w-24 px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Time</th>
          <th scope="col" className="w-24 px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Shift</th>
          <th scope="col" className="w-48 px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">DO Number</th>
          <th scope="col" className="w-48 px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Receiver Name</th>
          <th scope="col" className="w-32 px-6 py-4 text-right text-xs font-black text-gray-500 uppercase tracking-wider">Actions</th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {transfers.map((t: any) => {
          const isWithin30Mins = Date.now() - new Date(t.createdAt).getTime() <= 30 * 60 * 1000
          const isEditable = hasAdminAccess || isWithin30Mins
          const isDeleting = deletingId === t.id
          const isSelected = selectedIds.includes(t.id)

          return (
            <tr key={t.id} className={`transition-colors ${isDeleting || (isBulkDeleting && isSelected) ? 'opacity-50' : 'hover:bg-gray-50'} ${isSelected ? 'bg-emerald-50/50' : ''}`}>
              <td className="px-6 py-4 whitespace-nowrap">
                <button onClick={() => toggleSelect(t.id)} className="text-gray-400 hover:text-emerald-600 focus:outline-none">
                  {isSelected ? (
                    <CheckSquare className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <Square className="w-5 h-5" />
                  )}
                </button>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-bold text-gray-900">{new Date(t.receiveDate).toLocaleDateString()}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-500">{t.receiveTime}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${t.shift === 'AM' ? 'bg-blue-100 text-blue-800' : 'bg-indigo-100 text-indigo-800'}`}>
                  {t.shift || "AM"}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-black text-emerald-600">{t.doNumber}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 truncate">
                {t.receiverName}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end space-x-2">
                {isEditable && (
                  <>
                    <Link href={`/forms/production/transfer-in/${t.id}/edit`} className="text-amber-600 hover:text-amber-900 font-black flex items-center bg-amber-50 px-3 py-2 rounded-lg hover:bg-amber-100 transition-colors">
                      <Pencil className="w-4 h-4 mr-1" /> Edit
                    </Link>
                    <button 
                      onClick={() => handleDelete(t.id, t.doNumber)}
                      disabled={isDeleting || isBulkDeleting}
                      className="text-red-600 hover:text-red-900 font-black flex items-center bg-red-50 px-3 py-2 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      {isDeleting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Trash2 className="w-4 h-4 mr-1" />} Delete
                    </button>
                  </>
                )}
                <Link href={`/forms/production/transfer-in/${t.id}`} className="text-emerald-600 hover:text-emerald-900 font-black flex items-center bg-emerald-50 px-3 py-2 rounded-lg hover:bg-emerald-100 transition-colors">
                  <Eye className="w-4 h-4 mr-1" /> View
                </Link>
              </td>
            </tr>
          )
        })}
      </tbody>
      {selectedIds.length > 0 && (
        <tfoot className="bg-red-50 border-t-2 border-red-200">
          <tr>
            <td colSpan={6} className="px-6 py-4 whitespace-nowrap">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-red-800">
                  {selectedIds.length} item(s) selected
                </span>
                <button
                  onClick={handleBulkDelete}
                  disabled={isBulkDeleting}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg font-black uppercase tracking-wider text-sm hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50 flex items-center"
                >
                  {isBulkDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                  Delete Selected
                </button>
              </div>
            </td>
          </tr>
        </tfoot>
      )}
    </>
  )
}
