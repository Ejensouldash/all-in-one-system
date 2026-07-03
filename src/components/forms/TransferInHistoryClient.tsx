"use client"

import { useState } from "react"
import Link from "next/link"
import { Eye, Pencil, Trash2, AlertTriangle, Loader2 } from "lucide-react"
import { deleteTransferIn } from "@/app/actions/transferIn"

export function TransferInHistoryClient({ 
  transfers, 
  hasAdminAccess 
}: { 
  transfers: any[], 
  hasAdminAccess: boolean 
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (id: string, doNumber: string) => {
    if (!confirm(`Are you sure you want to delete DO ${doNumber}? This will also remove all its items from stock.`)) {
      return
    }

    setDeletingId(id)
    const res = await deleteTransferIn(id)
    if (!res.success) {
      alert("Failed to delete: " + res.error)
      setDeletingId(null)
    }
  }

  return (
    <tbody className="bg-white divide-y divide-gray-200">
      {transfers.map((t: any) => {
        const isWithin30Mins = Date.now() - new Date(t.createdAt).getTime() <= 30 * 60 * 1000
        const isEditable = hasAdminAccess || isWithin30Mins
        const isDeleting = deletingId === t.id

        return (
          <tr key={t.id} className={`transition-colors ${isDeleting ? 'opacity-50' : 'hover:bg-gray-50'}`}>
            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 truncate">
              {new Date(t.receiveDate).toLocaleDateString('en-GB')}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate">
              {t.receiveTime}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-600 truncate">
              {t.doNumber}
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
                    disabled={isDeleting}
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
  )
}
