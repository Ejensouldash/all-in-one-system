"use client"

import { useMemo, useState, useTransition } from "react"
import { addMonths, format, subMonths } from "date-fns"
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  List,
  CheckCircle2,
  CircleAlert,
  Sparkles,
  Loader2,
  BellRing,
  Repeat,
  Send,
  X,
} from "lucide-react"
import "./RemindersCSS.css"
import {
  createReminder,
  updateReminder,
  deleteReminder,
  toggleReminder,
  sendTestReminder,
  seedMaintenanceReminders,
} from "@/app/actions/reminders"
import { ReminderCalendarGrid } from "./ReminderCalendarGrid"
import { ReminderList } from "./ReminderList"
import { ReminderFormModal } from "./ReminderFormModal"
import { ReminderViewModal } from "./ReminderViewModal"
import { MONTH_BM, type ReminderDTO, type ReminderUser } from "./reminder-utils"

const cn = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(" ")

type Banner = { kind: "ok" | "err"; text: string } | null
type ModalState =
  | { type: "none" }
  | { type: "add"; day: Date | null }
  | { type: "edit"; reminder: ReminderDTO }
  | { type: "view"; reminder: ReminderDTO }

export function RemindersClient({
  reminders,
  allUsers,
  units,
  currentUserId,
  isSuperAdmin,
  showSeedButton,
}: {
  reminders: ReminderDTO[]
  allUsers: ReminderUser[]
  units: { id: string; name: string }[]
  currentUserId: string
  isSuperAdmin: boolean
  showSeedButton: boolean
}) {
  const [cursor, setCursor] = useState(() => new Date())
  const [view, setView] = useState<"calendar" | "list">("calendar")
  const [modal, setModal] = useState<ModalState>({ type: "none" })
  const [banner, setBanner] = useState<Banner>(null)
  const [seeding, startSeeding] = useTransition()

  const stats = useMemo(() => {
    const active = reminders.filter((r) => r.enabled).length
    const recurring = reminders.filter((r) => r.enabled && r.frequency !== "ONCE").length
    const sent = reminders.reduce(
      (acc, r) => acc + r.deliveries.filter((d) => d.status === "SENT" || d.status === "PARTIAL").length,
      0
    )
    return { total: reminders.length, active, recurring, sent }
  }, [reminders])

  // Keep the view modal showing fresh data after a revalidate.
  const viewing =
    modal.type === "view" ? reminders.find((r) => r.id === modal.reminder.id) ?? modal.reminder : null

  const flash = (b: Banner) => {
    setBanner(b)
    if (b?.kind === "ok") setTimeout(() => setBanner(null), 3500)
  }

  const canManage = (r: ReminderDTO) => isSuperAdmin || r.createdById === currentUserId

  const handleSeed = () =>
    startSeeding(async () => {
      const res = await seedMaintenanceReminders()
      if (res.success) {
        flash({
          kind: "ok",
          text: res.warning || "3 peringatan Maintenance harian (8AM / 12PM / 4PM) telah disediakan.",
        })
      } else {
        flash({ kind: "err", text: res.error || "Gagal menyediakan peringatan maintenance." })
      }
    })

  return (
    <div className="space-y-4">
      {/* Feedback banner */}
      {banner && (
        <div
          className={cn(
            "reminder-fade-up flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm shadow-sm",
            banner.kind === "ok"
              ? "border-emerald-100 bg-emerald-50 text-emerald-700"
              : "border-red-100 bg-red-50 text-red-700"
          )}
        >
          <span className="flex items-start gap-2">
            {banner.kind === "ok" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            {banner.text}
          </span>
          <button type="button" onClick={() => setBanner(null)} className="shrink-0 opacity-60 hover:opacity-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Stats row */}
      <div className="reminder-stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Jumlah Peringatan", value: stats.total, icon: BellRing, cls: "from-indigo-500 to-violet-600" },
          { label: "Aktif", value: stats.active, icon: Sparkles, cls: "from-emerald-500 to-teal-600" },
          { label: "Berulang", value: stats.recurring, icon: Repeat, cls: "from-blue-500 to-cyan-600" },
          { label: "E-mel Dihantar", value: stats.sent, icon: Send, cls: "from-amber-500 to-orange-600" },
        ].map((s) => (
          <div
            key={s.label}
            className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm",
                s.cls
              )}
            >
              <s.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xl font-black tabular-nums leading-none text-gray-900">{s.value}</div>
              <div className="mt-1 truncate text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                {s.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCursor((d) => subMonths(d, 1))}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setCursor(new Date())}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600 transition hover:bg-gray-50"
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={() => setCursor((d) => addMonths(d, 1))}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <h2 className="ml-1 text-lg font-black tracking-tight text-gray-900">
              {MONTH_BM[cursor.getMonth()]} <span className="text-gray-400">{format(cursor, "yyyy")}</span>
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex rounded-xl bg-gray-100 p-1">
              <button
                type="button"
                onClick={() => setView("calendar")}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all",
                  view === "calendar" ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                <CalendarDays className="h-3.5 w-3.5" /> Kalendar
              </button>
              <button
                type="button"
                onClick={() => setView("list")}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all",
                  view === "list" ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                <List className="h-3.5 w-3.5" /> Senarai
              </button>
            </div>

            {showSeedButton && (
              <button
                type="button"
                onClick={handleSeed}
                disabled={seeding}
                className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-700 transition hover:bg-amber-100 disabled:opacity-60"
              >
                {seeding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Seed Maintenance
              </button>
            )}

            <button
              type="button"
              onClick={() => setModal({ type: "add", day: null })}
              className="reminder-btn-glow flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:from-indigo-700 hover:to-violet-700"
            >
              <Plus className="h-4 w-4" /> Peringatan Baru
            </button>
          </div>
        </div>

        {/* Views */}
        <div className="mt-4">
          {view === "calendar" ? (
            <ReminderCalendarGrid
              reminders={reminders}
              date={cursor}
              onSelectReminder={(r) => setModal({ type: "view", reminder: r })}
              onSelectDay={(day) => setModal({ type: "add", day })}
            />
          ) : (
            <ReminderList reminders={reminders} onSelectReminder={(r) => setModal({ type: "view", reminder: r })} />
          )}
        </div>
      </div>

      {/* Modals */}
      <ReminderFormModal
        open={modal.type === "add" || modal.type === "edit"}
        onClose={() => setModal({ type: "none" })}
        editing={modal.type === "edit" ? modal.reminder : null}
        allUsers={allUsers}
        units={units}
        currentUserId={currentUserId}
        defaultDay={modal.type === "add" ? modal.day : null}
        onSubmit={async (data) => {
          const res =
            modal.type === "edit" ? await updateReminder(modal.reminder.id, data) : await createReminder(data)
          if (res.success) {
            flash({
              kind: "ok",
              text: modal.type === "edit" ? "Peringatan dikemas kini." : "Peringatan baharu dicipta.",
            })
          }
          return res
        }}
      />

      <ReminderViewModal
        open={modal.type === "view"}
        reminder={viewing}
        canManage={viewing ? canManage(viewing) : false}
        onClose={() => setModal({ type: "none" })}
        onEdit={(r) => setModal({ type: "edit", reminder: r })}
        onDelete={async (r) => {
          const res = await deleteReminder(r.id)
          if (res.success) flash({ kind: "ok", text: "Peringatan dipadam." })
          return res
        }}
        onToggle={(r, enabled) => toggleReminder(r.id, enabled)}
        onSendTest={(r) => sendTestReminder(r.id)}
      />
    </div>
  )
}
