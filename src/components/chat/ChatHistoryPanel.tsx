"use client"

import { useEffect, useState } from "react"
import { ArrowLeft, Loader2, MessageSquare, Trash2 } from "lucide-react"
import { deleteAriaChat, listAriaChats } from "@/app/actions/ariaChat"

type ChatSummary = { id: string; title: string; updatedAt: string }

function formatWhen(iso: string) {
  const date = new Date(iso)
  const sameDay = date.toDateString() === new Date().toDateString()
  return sameDay
    ? date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

export function ChatHistoryPanel({
  activeSessionId,
  onOpen,
  onDeleted,
  onBack,
}: {
  activeSessionId: string | null
  onOpen: (id: string) => void
  onDeleted: (id: string) => void
  onBack: () => void
}) {
  const [sessions, setSessions] = useState<ChatSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listAriaChats()
      .then(res => {
        if (cancelled) return
        if (res.success) setSessions(res.sessions)
        else setError(res.error)
      })
      .catch(() => !cancelled && setError("Gagal memuatkan sejarah chat."))
    return () => { cancelled = true }
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm("Padam chat ini? Tindakan ini tidak boleh dibatalkan.")) return
    setDeletingId(id)
    const res = await deleteAriaChat(id).catch(() => ({ success: false as const, error: "Gagal memadam chat." }))
    setDeletingId(null)
    if (!res.success) {
      setError(res.error)
      return
    }
    setSessions(prev => prev?.filter(s => s.id !== id) ?? null)
    onDeleted(id)
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-50 to-white">
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-slate-100 bg-white/90 px-4 py-3 backdrop-blur">
        <button
          onClick={onBack}
          className="rounded-lg p-1.5 text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-700"
          aria-label="Kembali ke chat"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h4 className="text-sm font-bold text-slate-700">Sejarah Chat</h4>
      </div>

      <div className="space-y-2 px-4 py-4">
        {error && (
          <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{error}</p>
        )}

        {sessions === null && !error && (
          <div className="flex justify-center py-10 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}

        {sessions?.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-slate-400">
            <MessageSquare className="h-8 w-8" />
            <p className="text-xs font-medium">Belum ada chat yang disimpan.</p>
          </div>
        )}

        {sessions?.map(session => (
          <div
            key={session.id}
            className={`group flex items-center gap-2 rounded-xl border px-3 py-2.5 transition-all ${
              session.id === activeSessionId
                ? "border-indigo-200 bg-indigo-50/60"
                : "border-slate-100 bg-white hover:border-indigo-200 hover:bg-indigo-50/30"
            }`}
          >
            <button onClick={() => onOpen(session.id)} className="min-w-0 flex-1 text-left">
              <p className="truncate text-[13px] font-semibold text-slate-700">{session.title}</p>
              <p className="text-[10px] font-medium text-slate-400">{formatWhen(session.updatedAt)}</p>
            </button>
            <button
              onClick={() => handleDelete(session.id)}
              disabled={deletingId === session.id}
              className="rounded-lg p-1.5 text-slate-300 transition-all hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
              aria-label="Padam chat"
            >
              {deletingId === session.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
