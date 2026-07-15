"use client"

import { useState } from "react"
import {
  X,
  Pencil,
  Trash2,
  CalendarClock,
  Users,
  User,
  Building2,
  Boxes,
  Link2,
  Send,
  Loader2,
  History,
  Pause,
  Play,
  CircleAlert,
  CheckCircle2,
} from "lucide-react"
import { ModalShell } from "./ModalShell"
import {
  getReminderTheme,
  scheduleSummary,
  parseActionLinks,
  initials,
  avatarGradient,
  fmtTime12,
  mytParts,
  MONTH_BM,
  DELIVERY_STATUS_THEME,
  type ReminderDTO,
} from "./reminder-utils"

const cn = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(" ")

type ActionResult = { success: boolean; error?: string; warning?: string }

function fmtDeliveryTime(sentAt: string | Date): string {
  const p = mytParts(sentAt)
  return `${p.d} ${MONTH_BM[p.m]} ${p.y}, ${fmtTime12(p.hh, p.mm)}`
}

export function ReminderViewModal({
  open,
  reminder,
  canManage,
  onClose,
  onEdit,
  onDelete,
  onToggle,
  onSendTest,
}: {
  open: boolean
  reminder: ReminderDTO | null
  canManage: boolean
  onClose: () => void
  onEdit: (r: ReminderDTO) => void
  onDelete: (r: ReminderDTO) => Promise<ActionResult>
  onToggle: (r: ReminderDTO, enabled: boolean) => Promise<ActionResult>
  onSendTest: (r: ReminderDTO) => Promise<ActionResult>
}) {
  const [busy, setBusy] = useState<"delete" | "toggle" | "test" | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [note, setNote] = useState<{ kind: "ok" | "err"; text: string } | null>(null)

  if (!reminder) return null

  const theme = getReminderTheme(reminder.category)
  const Icon = theme.icon
  const links = parseActionLinks(reminder.actionLinks)

  const run = async (kind: "delete" | "toggle" | "test", fn: () => Promise<ActionResult>) => {
    if (busy) return
    setBusy(kind)
    setNote(null)
    const res = await fn()
    setBusy(null)
    if (kind === "delete" && res.success) {
      onClose()
      return
    }
    if (res.success) {
      setNote({ kind: "ok", text: kind === "test" ? "E-mel ujian dihantar ke inbox anda." : "Berjaya dikemas kini." })
    } else {
      setNote({ kind: "err", text: res.error || "Operasi gagal." })
    }
    setConfirmDelete(false)
  }

  return (
    <ModalShell open={open} onClose={onClose} maxWidth="max-w-xl">
      {/* Colored header */}
      <div className={cn("relative overflow-hidden px-5 py-6 sm:px-6", theme.solid)}>
        <div className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/20 ring-1 ring-white/30 backdrop-blur">
              <Icon className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white ring-1 ring-white/25">
                  {theme.label}
                </span>
                {!reminder.enabled && (
                  <span className="rounded-full bg-black/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/90">
                    Dijeda
                  </span>
                )}
                {reminder.seedKey && (
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white ring-1 ring-white/25">
                    Sistem
                  </span>
                )}
              </div>
              <h2 className="mt-1.5 text-lg font-black leading-tight text-white">{reminder.title}</h2>
              <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-white/85">
                <CalendarClock className="h-3.5 w-3.5" /> {scheduleSummary(reminder)} MYT
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-5 px-5 py-5 sm:px-6">
        {note && (
          <div
            className={cn(
              "flex items-start gap-2 rounded-xl px-3.5 py-3 text-sm",
              note.kind === "ok"
                ? "border border-emerald-100 bg-emerald-50 text-emerald-700"
                : "reminder-shake border border-red-100 bg-red-50 text-red-700"
            )}
          >
            {note.kind === "ok" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <span>{note.text}</span>
          </div>
        )}

        {reminder.description && (
          <p className="whitespace-pre-wrap rounded-2xl bg-gray-50 px-4 py-3 text-sm leading-relaxed text-gray-600">
            {reminder.description}
          </p>
        )}

        {/* Recipients */}
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-gray-500">
            <Users className="h-3.5 w-3.5" /> Penerima
          </p>
          <div className="flex flex-wrap gap-1.5">
            {reminder.targetSelf && (
              <span className="flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
                <User className="h-3 w-3" /> Pencipta ({reminder.createdBy?.name || "Saya"})
              </span>
            )}
            {reminder.recipients.map((r) => (
              <span
                key={r.userId}
                className="flex items-center gap-1.5 rounded-full bg-indigo-50 py-1 pl-1 pr-2.5 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-100"
              >
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white",
                    avatarGradient(r.user?.name || "?")
                  )}
                >
                  {initials(r.user?.name)}
                </span>
                {r.user?.name}
              </span>
            ))}
            {reminder.targetUnit?.name && (
              <span className="flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 ring-1 ring-violet-100">
                <Building2 className="h-3 w-3" /> Unit: {reminder.targetUnit.name}
              </span>
            )}
            {reminder.targetModules.map((m) => (
              <span
                key={m}
                className="flex items-center gap-1.5 rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-700 ring-1 ring-cyan-100"
              >
                <Boxes className="h-3 w-3" /> {m}
              </span>
            ))}
          </div>
        </div>

        {/* Action links */}
        {links.length > 0 && (
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-gray-500">
              <Link2 className="h-3.5 w-3.5" /> Pautan Tindakan
            </p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {links.map((l, i) => (
                <a
                  key={i}
                  href={l.url}
                  target={l.url.startsWith("http") ? "_blank" : undefined}
                  rel="noreferrer"
                  className="group flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/70 px-3 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-indigo-200 hover:bg-indigo-50/60 hover:text-indigo-700"
                >
                  <span className="truncate">{l.label}</span>
                  <span className="text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-400">
                    &rarr;
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Delivery history */}
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-gray-500">
            <History className="h-3.5 w-3.5" /> Sejarah Penghantaran
          </p>
          {reminder.deliveries.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-200 px-3.5 py-3 text-xs text-gray-400">
              Belum ada e-mel dihantar untuk peringatan ini.
            </p>
          ) : (
            <div className="reminder-stagger space-y-1.5">
              {reminder.deliveries.map((d) => {
                const st = DELIVERY_STATUS_THEME[d.status] || DELIVERY_STATUS_THEME.SENDING
                return (
                  <div
                    key={d.id}
                    className="flex items-center gap-2.5 rounded-xl border border-gray-100 bg-white px-3 py-2 text-xs shadow-sm"
                  >
                    <span className={cn("h-2 w-2 shrink-0 rounded-full", st.dot)} />
                    <span className={cn("w-24 shrink-0 font-bold", st.text)}>{st.label}</span>
                    <span className="flex-1 truncate text-gray-500">{fmtDeliveryTime(d.sentAt)}</span>
                    {d.recipientCount > 0 && (
                      <span className="flex shrink-0 items-center gap-1 text-gray-400">
                        <Users className="h-3 w-3" /> {d.recipientCount}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer actions */}
      <div className="sticky bottom-0 border-t border-gray-100 bg-white/90 px-5 py-4 backdrop-blur sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => run("test", () => onSendTest(reminder))}
            disabled={!!busy}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
          >
            {busy === "test" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Hantar E-mel Ujian
          </button>

          {canManage && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => run("toggle", () => onToggle(reminder, !reminder.enabled))}
                disabled={!!busy}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
              >
                {busy === "toggle" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : reminder.enabled ? (
                  <Pause className="h-3.5 w-3.5" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
                {reminder.enabled ? "Jeda" : "Aktifkan"}
              </button>
              <button
                type="button"
                onClick={() => onEdit(reminder)}
                disabled={!!busy}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
              {confirmDelete ? (
                <button
                  type="button"
                  onClick={() => run("delete", () => onDelete(reminder))}
                  disabled={!!busy}
                  className="reminder-shake flex items-center gap-1.5 rounded-xl bg-red-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
                >
                  {busy === "delete" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  Sahkan Padam?
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  disabled={!!busy}
                  className="flex items-center gap-1.5 rounded-xl border border-red-100 bg-red-50 px-3.5 py-2 text-xs font-bold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Padam
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  )
}
