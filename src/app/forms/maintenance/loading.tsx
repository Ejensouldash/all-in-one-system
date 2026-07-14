import React from "react"
import { Wrench } from "lucide-react"

export default function MaintenanceLoading() {
  return (
    <div className="bg-gray-50 pb-12 min-h-screen animate-pulse">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Header Skeleton */}
        <div className="mb-6">
          <div className="flex items-center space-x-4 mb-2">
            <div className="h-10 w-10 bg-gray-200 rounded-lg"></div>
            <div>
              <div className="h-8 bg-gray-200 rounded-md w-64 sm:w-80"></div>
              <div className="h-3 bg-gray-200 rounded-md w-32 mt-2"></div>
            </div>
          </div>
        </div>

        {/* Tabs Skeleton */}
        <div className="border-b border-gray-200 mb-8">
          <div className="flex space-x-8">
            <div className="h-4 bg-gray-200 rounded w-20 py-3"></div>
            <div className="h-4 bg-gray-200 rounded w-20 py-3"></div>
          </div>
        </div>

        {/* Grid Cards Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-12">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-6 sm:p-8 shadow-md border border-gray-100 flex flex-col justify-between min-h-[220px]"
            >
              <div className="mb-6 space-y-3">
                <div className="h-5 bg-gray-200 rounded w-28"></div>
                <div className="h-6 bg-gray-200 rounded w-48"></div>
                <div className="space-y-1">
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                  <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                </div>
              </div>
              <div className="h-10 bg-gray-200 rounded-xl w-full"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
