"use client"

import { useEffect, type ReactNode } from "react"

const cn = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(" ")

/**
 * Shared modal wrapper for the Reminder Calendar: dimmed blurred backdrop,
 * Escape-to-close, body scroll lock, bottom sheet on mobile / centered
 * dialog on larger screens. (Same UX pattern as the Event Calendar modals.)
 */
export function ModalShell({
  open,
  onClose,
  children,
  maxWidth = "max-w-lg",
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
  maxWidth?: string
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="reminder-backdrop fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "reminder-pop reminder-scroll max-h-[92vh] w-full overflow-y-auto overflow-x-hidden rounded-t-3xl bg-white shadow-2xl ring-1 ring-black/5 sm:rounded-3xl",
          maxWidth
        )}
      >
        {children}
      </div>
    </div>
  )
}
