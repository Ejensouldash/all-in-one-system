"use client"

import React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

export interface TablePaginationProps {
  currentPage: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  pageSizeOptions?: number[]
  itemName?: string
  className?: string
}

export function getPaginationItems(currentPage: number, totalPages: number): (number | string)[] {
  const items: (number | string)[] = []

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) items.push(i)
  } else {
    if (currentPage <= 4) {
      items.push(1, 2, 3, 4, 5, "...", totalPages)
    } else if (currentPage >= totalPages - 3) {
      items.push(1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
    } else {
      items.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages)
    }
  }
  return items
}

export function TablePagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
  itemName = "items",
  className = "",
}: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages)

  const startRecord = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1
  const endRecord = Math.min(safeCurrentPage * pageSize, totalItems)
  const paginationItems = getPaginationItems(safeCurrentPage, totalPages)

  return (
    <div
      className={`bg-white px-4 py-3.5 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 ${className}`}
    >
      {/* Entries summary & optional rows selector */}
      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
        <span className="font-medium">
          Showing <span className="font-bold text-slate-900">{startRecord}</span> to{" "}
          <span className="font-bold text-slate-900">{endRecord}</span> of{" "}
          <span className="font-bold text-slate-900">{totalItems}</span> {itemName}
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200">
            <span className="text-[11px] text-slate-500 font-medium">Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                const newSize = Number(e.target.value)
                onPageSizeChange(newSize)
                const newMaxPage = Math.max(1, Math.ceil(totalItems / newSize))
                if (safeCurrentPage > newMaxPage) {
                  onPageChange(newMaxPage)
                }
              }}
              className="px-2 py-1 text-xs rounded-lg border border-slate-200 bg-white font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Page navigation controls */}
      <div className="flex items-center gap-1 w-full sm:w-auto justify-center sm:justify-end">
        <nav className="relative z-0 inline-flex rounded-lg shadow-2xs -space-x-px" aria-label="Pagination">
          {/* Previous Page */}
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, safeCurrentPage - 1))}
            disabled={safeCurrentPage <= 1}
            className="relative inline-flex items-center px-2.5 py-1.5 rounded-l-lg border border-slate-300 bg-white text-xs font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Previous Page"
          >
            <span className="sr-only">Previous</span>
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>

          {/* Mobile Current / Total indicator */}
          <span className="md:hidden relative inline-flex items-center px-3 py-1.5 border border-slate-300 bg-white text-xs font-bold text-slate-700">
            {safeCurrentPage} / {totalPages}
          </span>

          {/* Desktop Page Numbers */}
          <div className="hidden md:flex items-center -space-x-px">
            {paginationItems.map((item, idx) => {
              if (item === "...") {
                return (
                  <span
                    key={`ellipsis-${idx}`}
                    className="relative inline-flex items-center px-3 py-1.5 border border-slate-300 bg-white text-xs font-medium text-slate-400 select-none"
                  >
                    ...
                  </span>
                )
              }

              const pageNum = item as number
              const isActive = safeCurrentPage === pageNum

              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => onPageChange(pageNum)}
                  className={`relative inline-flex items-center px-3 py-1.5 border text-xs font-bold transition-colors ${
                    isActive
                      ? "z-10 bg-slate-900 border-slate-900 text-white shadow-xs"
                      : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {pageNum}
                </button>
              )
            })}
          </div>

          {/* Next Page */}
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, safeCurrentPage + 1))}
            disabled={safeCurrentPage >= totalPages}
            className="relative inline-flex items-center px-2.5 py-1.5 rounded-r-lg border border-slate-300 bg-white text-xs font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Next Page"
          >
            <span className="sr-only">Next</span>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </nav>
      </div>
    </div>
  )
}
