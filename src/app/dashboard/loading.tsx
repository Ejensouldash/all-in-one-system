import React from "react"
import { Ticket, AlertCircle, CheckCircle2, Users, CalendarDays } from "lucide-react"

export default function DashboardLoading() {
  return (
    <div className="space-y-6 pb-10 animate-pulse">
      {/* Header Skeleton */}
      <div>
        <div className="h-8 bg-gray-200 rounded-md w-48 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded-md w-96"></div>
      </div>

      {/* 5 Cards Grid Skeleton */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {[
          { icon: <Ticket className="h-6 w-6 text-gray-300" /> },
          { icon: <AlertCircle className="h-6 w-6 text-gray-300" /> },
          { icon: <CheckCircle2 className="h-6 w-6 text-gray-300" /> },
          { icon: <Users className="h-6 w-6 text-gray-300" /> },
          { icon: <CalendarDays className="h-6 w-6 text-gray-300" /> },
        ].map((card, i) => (
          <div key={i} className="bg-white/50 rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-gray-100 p-3 rounded-lg border border-gray-100">
                  {card.icon}
                </div>
                <div className="ml-4 w-full flex-1">
                  <div className="h-3 bg-gray-200 rounded w-20 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-12"></div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50/50 px-5 py-3 border-t border-gray-100 flex items-center">
              <div className="h-3 bg-gray-200 rounded w-24"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Section Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        
        {/* Recent Tickets Skeleton (Span 2) */}
        <div className="lg:col-span-2 bg-white/50 rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="h-6 bg-gray-200 rounded w-32"></div>
            <div className="h-4 bg-gray-200 rounded w-16"></div>
          </div>
          
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-4 bg-white/50 rounded-lg border border-gray-100 flex items-center justify-between gap-3">
                <div className="w-full">
                  <div className="h-5 bg-gray-200 rounded w-2/3 mb-2"></div>
                  <div className="flex items-center space-x-2">
                    <div className="h-3 bg-gray-200 rounded w-20"></div>
                    <div className="h-3 bg-gray-200 rounded w-20"></div>
                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
                <div className="h-6 w-16 bg-gray-200 rounded-full flex-shrink-0"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions Skeleton */}
        <div className="bg-white/50 rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
          <div className="h-6 bg-gray-200 rounded w-32 mb-6"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-gray-200 rounded-lg w-full"></div>
            ))}
          </div>
        </div>
        
      </div>
    </div>
  )
}
