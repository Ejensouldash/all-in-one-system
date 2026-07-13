import React from "react"
import { LayoutDashboard } from "lucide-react"

export default function FormsDashboardLoading() {
  return (
    <div className="space-y-6 pb-10 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-center space-x-4 mb-6">
        <div className="h-10 w-10 bg-gray-200 rounded-lg"></div>
        <div className="space-y-2">
          <div className="h-8 w-60 bg-gray-200 rounded"></div>
          <div className="h-3 w-40 bg-gray-200 rounded"></div>
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="flex space-x-8 border-b border-gray-200 pb-4">
        <div className="h-5 w-24 bg-gray-200 rounded"></div>
        <div className="h-5 w-24 bg-gray-200 rounded"></div>
        <div className="h-5 w-24 bg-gray-200 rounded"></div>
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="h-28 bg-white rounded-xl border border-gray-200 p-6"></div>
        <div className="h-28 bg-white rounded-xl border border-gray-200 p-6"></div>
        <div className="h-28 bg-white rounded-xl border border-gray-200 p-6"></div>
      </div>

      {/* Charts Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-80 bg-white rounded-xl border border-gray-200 p-6"></div>
        <div className="h-80 bg-white rounded-xl border border-gray-200 p-6"></div>
        <div className="h-80 bg-white rounded-xl border border-gray-200 p-6 md:col-span-2"></div>
      </div>
    </div>
  )
}
