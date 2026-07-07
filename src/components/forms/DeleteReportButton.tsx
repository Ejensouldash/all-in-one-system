"use client"

import { useState } from "react"
import { Trash2 } from "lucide-react"
import { deleteDailyReport } from "@/app/actions/dailyReport"
import { useRouter } from "next/navigation"

export function DeleteReportButton({ reportId }: { reportId: string }) {
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this Daily Report? This will automatically restore any used materials to the Storeroom balance. This action cannot be undone.")) {
      return
    }

    setIsDeleting(true)
    try {
      const res = await deleteDailyReport(reportId)
      if (res.success) {
        alert("Report deleted and stock restored successfully.")
        router.push("/forms/production/daily-report")
      } else {
        alert("Failed to delete report: " + res.error)
        setIsDeleting(false)
      }
    } catch (error) {
      alert("An unexpected error occurred.")
      setIsDeleting(false)
    }
  }

  return (
    <button 
      onClick={handleDelete}
      disabled={isDeleting}
      className="inline-flex items-center text-sm font-black uppercase tracking-wider border-2 border-red-600 text-red-600 px-4 py-2 bg-white hover:bg-red-600 hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(220,38,38,1)] hover:shadow-none hover:translate-y-[2px] hover:translate-x-[2px] disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Trash2 className="w-4 h-4 mr-2" />
      {isDeleting ? "Deleting..." : "Delete Report"}
    </button>
  )
}
