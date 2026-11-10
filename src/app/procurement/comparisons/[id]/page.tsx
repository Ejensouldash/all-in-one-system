"use client"

import { useState, useEffect, useCallback, use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Scale,
  RefreshCw,
  AlertCircle,
  Building2,
  Trash2,
} from "lucide-react"
import {
  getPriceComparisonById,
  updatePriceComparison,
  deletePriceComparison,
  getSuppliers,
} from "@/app/actions/procurement"
import { ComparisonMatrixTable } from "@/components/procurement/ComparisonMatrixTable"
import { ProcurementNavTabs } from "@/components/procurement/ProcurementNavTabs"

interface PageProps {
  params: Promise<{ id: string }>
}

export default function PriceComparisonDetailPage({ params }: PageProps) {
  const router = useRouter()
  const resolvedParams = use(params)
  const id = resolvedParams.id

  const [comparison, setComparison] = useState<any | null>(null)
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [comp, sups] = await Promise.all([
        getPriceComparisonById(id),
        getSuppliers({ activeOnly: true }),
      ])

      if (!comp) {
        setError("Price comparison sheet not found.")
      } else {
        setComparison(comp)
      }
      setSuppliers(sups || [])
    } catch (err: any) {
      console.error("Failed to load price comparison:", err)
      setError(err.message || "Failed to load price comparison.")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSave = async (updatedData: any): Promise<boolean> => {
    try {
      const res = await updatePriceComparison(id, updatedData)
      if (res.success && res.comparison) {
        setComparison(res.comparison)
        return true
      }
      return false
    } catch (err) {
      console.error("Save error:", err)
      return false
    }
  }

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this price comparison? This cannot be undone.")) {
      const res = await deletePriceComparison(id)
      if (res.success) {
        router.push("/procurement/comparisons")
      } else {
        alert(res.error || "Failed to delete comparison")
      }
    }
  }

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <ProcurementNavTabs />
        <div className="p-16 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-600">Loading Price Comparison Sheet...</p>
        </div>
      </div>
    )
  }

  if (error || !comparison) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <ProcurementNavTabs />
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <h2 className="text-base font-bold text-slate-800">
            {error || "Price comparison sheet not found."}
          </h2>
          <Link
            href="/procurement/comparisons"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Price Comparisons
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Nav Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <ProcurementNavTabs />

        <div className="flex items-center gap-2 mb-6">
          <Link
            href="/procurement/comparisons"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>All Comparisons</span>
          </Link>

          <button
            onClick={handleDelete}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-slate-200 transition-colors"
            title="Delete this comparison"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Spreadsheet Matrix Table Component */}
      <ComparisonMatrixTable
        initialComparison={comparison}
        allRegisteredSuppliers={suppliers}
        onSave={handleSave}
      />
    </div>
  )
}
