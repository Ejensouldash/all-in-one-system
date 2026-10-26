"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"

export function Pagination({ totalPages }: { totalPages: number }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentPage = Number(searchParams.get("page")) || 1

  const createPageURL = (pageNumber: number | string) => {
    const params = new URLSearchParams(searchParams)
    params.set("page", pageNumber.toString())
    return `${pathname}?${params.toString()}`
  }

  if (totalPages <= 1) return null

  // Generate page numbers with ellipses if needed
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, "...", totalPages]
    }

    if (currentPage >= totalPages - 3) {
      return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
    }

    return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages]
  }

  const pageNumbers = getPageNumbers()

  return (
    <div className="flex items-center justify-between border-t border-gray-100 bg-white px-4 py-3 sm:px-6">
      <div className="flex flex-1 justify-between sm:hidden">
        <Link
          href={createPageURL(currentPage - 1)}
          aria-disabled={currentPage <= 1}
          className={`relative inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors ${
            currentPage <= 1 ? "pointer-events-none opacity-40 text-gray-400" : ""
          }`}
        >
          Previous
        </Link>
        <span className="text-xs text-gray-500 self-center">
          {currentPage} / {totalPages}
        </span>
        <Link
          href={createPageURL(currentPage + 1)}
          aria-disabled={currentPage >= totalPages}
          className={`relative inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors ${
            currentPage >= totalPages ? "pointer-events-none opacity-40 text-gray-400" : ""
          }`}
        >
          Next
        </Link>
      </div>

      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-xs text-gray-500">
            Page <span className="font-semibold text-gray-800">{currentPage}</span> of{" "}
            <span className="font-semibold text-gray-800">{totalPages}</span>
          </p>
        </div>
        <div>
          <nav className="isolate inline-flex -space-x-px rounded-lg shadow-2xs overflow-hidden border border-gray-200" aria-label="Pagination">
            <Link
              href={createPageURL(currentPage - 1)}
              aria-disabled={currentPage <= 1}
              className={`relative inline-flex items-center px-2.5 py-1.5 text-gray-500 bg-white hover:bg-gray-50 transition-colors ${
                currentPage <= 1 ? "pointer-events-none opacity-40 text-gray-300" : ""
              }`}
              title="Previous Page"
            >
              <span className="sr-only">Previous</span>
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Link>

            {pageNumbers.map((page, idx) => {
              if (page === "...") {
                return (
                  <span
                    key={`ellipsis-${idx}`}
                    className="relative inline-flex items-center px-3 py-1.5 text-xs font-semibold text-gray-400 bg-gray-50 border-x border-gray-200"
                  >
                    ...
                  </span>
                )
              }

              const isCurrent = page === currentPage
              return (
                <Link
                  key={page}
                  href={createPageURL(page)}
                  className={`relative inline-flex items-center px-3 py-1.5 text-xs font-semibold border-x border-gray-200 transition-colors ${
                    isCurrent
                      ? "z-10 bg-blue-600 text-white border-blue-600 font-bold"
                      : "text-gray-700 bg-white hover:bg-gray-50"
                  }`}
                >
                  {page}
                </Link>
              )
            })}

            <Link
              href={createPageURL(currentPage + 1)}
              aria-disabled={currentPage >= totalPages}
              className={`relative inline-flex items-center px-2.5 py-1.5 text-gray-500 bg-white hover:bg-gray-50 transition-colors ${
                currentPage >= totalPages ? "pointer-events-none opacity-40 text-gray-300" : ""
              }`}
              title="Next Page"
            >
              <span className="sr-only">Next</span>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </nav>
        </div>
      </div>
    </div>
  )
}

