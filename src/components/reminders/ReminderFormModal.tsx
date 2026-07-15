"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { motion } from "framer-motion"
import {
  X,
  BellRing,
  CalendarClock,
  Link2,
  Loader2,
  Plus,
  Search,
  Trash2,
  User,
  Users,
  Building2,
  Boxes,
  CircleAlert,
} from "lucide-react"
import { ModalShell } from "./ModalShell"
import {
  REMINDER_THEMES,
  THEME_ORDER,
  MODULE_TARGET_OPTIONS,
  WEEKDAY_SHORT_BM,
  toMytLocalInput,
  parseActionLinks,
  initials,
  avatarGradient,
  type ReminderDTO,
  type ReminderUser,
  type Frequency,
  type ActionLink,
} from "./reminder-utils"

const cn = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(" ")

type ActionResult = { success: boolean; error?: string; warning?: string }

const FREQUENCY_TABS: { key: Frequency; label: string }[] = [
  { key: "ONCE", label: "Sekali" },
  { key: "DAILY", label: "Harian" },
  { key: "WEEKLY", label: "Mingguan" },
  { key: "MONTHLY", label: "Bulanan" },
]

function SectionLabel({ icon: Icon, children }: { icon: any; children: React.ReactNode }) {
  return (
    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-gray-500">
      <Icon className="h-3.5 w-3.5" /> {children}
    </label>
  )
}

export function ReminderFormModal({
  open,
  onClose,
  onSubmit,
  editing,
  allUsers,
  units,
  currentUserId,
  defaultDay,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (data: FormData) => Promise<ActionResult>
  editing: ReminderDTO | null
  allUsers: ReminderUser[]
  units: { id: string; name: string }[]
  currentUserId: string
  defaultDay: Date | null
}) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("general")
  const [frequency, setFrequency] = useState<Frequency>("ONCE")
  const [onceAt, setOnceAt] = useState("")
  const [timeOfDay, setTimeOfDay] = useState("08:00")
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([])
  const [dayOfMonth, setDayOfMonth] = useState(1)
  const [enabled, setEnabled] = useState(true)
  const [targetSelf, setTargetSelf] = useState(true)
  const [recipients, setRecipients] = useState<ReminderUser[]>([])
  const [targetUnitId, setTargetUnitId] = useState("")
  const [targetModules, setTargetModules] = useState<string[]>([])
  const [links, setLinks] = useState<ActionLink[]>([])
  const [query, setQuery] = useState("")
  const [dropOpen, setDropOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const boxRef = useRef<HTMLDivElement | null>(null)

  // (Re)hydrate form state each time the modal opens
  useEffect(() => {
    if (!open) return
    setError(null)
    setSaving(false)
    setQuery("")
    if (editing) {
      setTitle(editing.title)
      setDescription(editing.description || "")
      setCategory(editing.category || "general")
      setFrequency(editing.frequency)
      setOnceAt(editing.onceAt ? toMytLocalInput(editing.onceAt) : "")
      setTimeOfDay(editing.timeOfDay || "08:00")
      setDaysOfWeek(editing.daysOfWeek || [])
      setDayOfMonth(editing.dayOfMonth || 1)
      setEnabled(editing.enabled)
      setTargetSelf(editing.targetSelf)
      setRecipients(editing.recipients.map((r) => r.user))
      setTargetUnitId(editing.targetUnitId || "")
      setTargetModules(editing.targetModules || [])
      setLinks(parseActionLinks(editing.actionLinks))
    } else {
      const base = defaultDay ? new Date(defaultDay) : new Date()
      base.setHours(9, 0, 0, 0)
      const pad = (n: number) => String(n).padStart(2, "0")
      setTitle("")
      setDescription("")
      setCategory("general")
      setFrequency("ONCE")
      setOnceAt(
        `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}T${pad(base.getHours())}:${pad(base.getMinutes())}`
      )
      setTimeOfDay("08:00")
      setDaysOfWeek([new Date().getDay()])
      setDayOfMonth(new Date().getDate())
      setEnabled(true)
      setTargetSelf(true)
      setRecipients([])
      setTargetUnitId("")
      setTargetModules([])
      setLinks([])
    }
  }, [open, editing, defaultDay])

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setDropOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [])

  const selectedIds = useMemo(() => new Set(recipients.map((r) => r.id)), [recipients])
  const q = query.trim().toLowerCase()
  const results = allUsers
    .filter(
      (u) =>
        u.id !== currentUserId &&
        !selectedIds.has(u.id) &&
        (!q || (u.name || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q))
    )
    .slice(0, 6)

  const toggleDay = (d: number) =>
    setDaysOfWeek((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()))

  const toggleModule = (id: string) =>
    setTargetModules((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const handleSubmit = async () => {
    if (saving) return
    setError(null)

    const data = new FormData()
    data.set("title", title)
    data.set("description", description)
    data.set("category", category)
    data.set("frequency", frequency)
    data.set("enabled", enabled ? "true" : "false")
    data.set("targetSelf", targetSelf ? "true" : "false")
    data.set("targetUnitId", targetUnitId)
    if (frequency === "ONCE") data.set("onceAt", onceAt)
    else data.set("timeOfDay", timeOfDay)
    if (frequency === "WEEKLY") daysOfWeek.forEach((d) => data.append("daysOfWeek", String(d)))
    if (frequency === "MONTHLY") data.set("dayOfMonth", String(dayOfMonth))
    recipients.forEach((r) => data.append("recipientIds", r.id))
    targetModules.forEach((m) => data.append("targetModules", m))
    data.set("actionLinks", JSON.stringify(links.filter((l) => l.label.trim() || l.url.trim())))

    setSaving(true)
    const res = await onSubmit(data)
    setSaving(false)
    if (res.success) onClose()
    else setError(res.error || "Gagal menyimpan peringatan.")
  }

  return (
    <ModalShell open={open} onClose={onClose} maxWidth="max-w-2xl">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white/90 px-5 py-4 backdrop-blur sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm">
            <BellRing className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-black tracking-tight text-gray-900">
              {editing ? "Kemas Kini Peringatan" : "Peringatan Baru"}
            </h2>
            <p className="text-xs text-gray-500">E-mel dihantar secara automatik mengikut jadual (MYT).</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-5 px-5 py-5 sm:px-6">
        {error && (
          <div className="reminder-shake flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-3.5 py-3 text-sm text-red-700">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Title */}
        <div>
          <SectionLabel icon={BellRing}>Tajuk</SectionLabel>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="cth. Isi Borang Pemeriksaan Harian"
            className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm font-medium text-gray-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        {/* Description */}
        <div>
          <SectionLabel icon={CalendarClock}>Nota / Penerangan (pilihan)</SectionLabel>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Butiran tambahan yang akan dipaparkan dalam e-mel..."
            className="w-full resize-none rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        {/* Category */}
        <div>
          <SectionLabel icon={Boxes}>Kategori</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {THEME_ORDER.map((key) => {
              const theme = REMINDER_THEMES[key]
              const Icon = theme.icon
              const active = category === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCategory(key)}
                  className={cn(
                    "reminder-chip-in flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-all",
                    active
                      ? cn(theme.soft, theme.softText, theme.border, "shadow-sm ring-2 ring-offset-1", "ring-indigo-500/20")
                      : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                  )}
                >
                  <span className={cn("h-2 w-2 rounded-full", theme.dot)} />
                  <Icon className="h-3 w-3" />
                  {theme.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Frequency segmented control */}
        <div>
          <SectionLabel icon={CalendarClock}>Kekerapan</SectionLabel>
          <div className="grid grid-cols-4 gap-1 rounded-2xl bg-gray-100 p-1">
            {FREQUENCY_TABS.map((tab) => {
              const active = frequency === tab.key
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setFrequency(tab.key)}
                  className={cn(
                    "relative rounded-xl px-2 py-2 text-xs font-bold transition-colors",
                    active ? "text-indigo-700" : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="freq-indicator"
                      className="absolute inset-0 rounded-xl bg-white shadow-sm ring-1 ring-black/5"
                      transition={{ type: "spring", stiffness: 500, damping: 38 }}
                    />
                  )}
                  <span className="relative">{tab.label}</span>
                </button>
              )
            })}
          </div>

          {/* Conditional schedule fields */}
          <div className="mt-3 rounded-2xl border border-gray-100 bg-gray-50/60 p-3.5">
            {frequency === "ONCE" && (
              <div className="reminder-fade-up">
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-gray-500">
                  Tarikh &amp; Masa (MYT)
                </label>
                <input
                  type="datetime-local"
                  value={onceAt}
                  onChange={(e) => setOnceAt(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            )}

            {frequency !== "ONCE" && (
              <div className="reminder-fade-up space-y-3">
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-gray-500">
                    Masa (MYT)
                  </label>
                  <input
                    type="time"
                    value={timeOfDay}
                    onChange={(e) => setTimeOfDay(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 sm:w-48"
                  />
                  <p className="mt-1 text-[11px] text-gray-400">
                    E-mel dihantar pada jam berkenaan (penghantaran mengikut kitaran setiap jam).
                  </p>
                </div>

                {frequency === "WEEKLY" && (
                  <div>
                    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-gray-500">
                      Hari Dalam Minggu
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {WEEKDAY_SHORT_BM.map((label, d) => {
                        const active = daysOfWeek.includes(d)
                        return (
                          <button
                            key={d}
                            type="button"
                            onClick={() => toggleDay(d)}
                            className={cn(
                              "h-9 w-11 rounded-xl text-xs font-bold transition-all",
                              active
                                ? "bg-indigo-600 text-white shadow-sm"
                                : "bg-white text-gray-500 ring-1 ring-gray-200 hover:bg-gray-50"
                            )}
                          >
                            {label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {frequency === "MONTHLY" && (
                  <div>
                    <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-gray-500">
                      Hari Dalam Bulan (1-31)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={dayOfMonth}
                      onChange={(e) => setDayOfMonth(Number(e.target.value))}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 sm:w-32"
                    />
                    <p className="mt-1 text-[11px] text-gray-400">
                      Untuk bulan pendek, hari 29-31 akan jatuh pada hari terakhir bulan tersebut.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Recipients */}
        <div className="rounded-2xl border border-gray-100 bg-white p-3.5 shadow-sm">
          <SectionLabel icon={Users}>Penerima E-mel</SectionLabel>

          {/* Self toggle */}
          <button
            type="button"
            onClick={() => setTargetSelf((v) => !v)}
            className="flex w-full items-center justify-between rounded-xl bg-gray-50 px-3 py-2.5 transition hover:bg-gray-100/70"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <User className="h-4 w-4 text-gray-400" /> Hantar kepada saya
            </span>
            <span
              className={cn(
                "relative h-5 w-9 rounded-full transition-colors",
                targetSelf ? "bg-emerald-500" : "bg-gray-300"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all",
                  targetSelf ? "left-[18px]" : "left-0.5"
                )}
              />
            </span>
          </button>

          {/* User picker */}
          <div ref={boxRef} className="relative mt-3">
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-gray-500">
              Pengguna Lain
              {recipients.length > 0 && (
                <span className="ml-1.5 rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">
                  {recipients.length}
                </span>
              )}
            </label>

            {recipients.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {recipients.map((r) => (
                  <span
                    key={r.id}
                    className="reminder-chip-in flex items-center gap-1.5 rounded-full bg-indigo-50 py-1 pl-1 pr-2 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-100"
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white",
                        avatarGradient(r.name || "?")
                      )}
                    >
                      {initials(r.name)}
                    </span>
                    {r.name}
                    <button
                      type="button"
                      onClick={() => setRecipients((prev) => prev.filter((x) => x.id !== r.id))}
                      className="text-indigo-400 hover:text-indigo-700"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setDropOpen(true)
                }}
                onFocus={() => setDropOpen(true)}
                placeholder="Cari nama atau e-mel..."
                className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-3.5 text-sm text-gray-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {dropOpen && results.length > 0 && (
              <div className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl ring-1 ring-black/5">
                {results.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      setRecipients((prev) => [...prev, u])
                      setQuery("")
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition hover:bg-indigo-50/60"
                  >
                    <span
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white",
                        avatarGradient(u.name || "?")
                      )}
                    >
                      {initials(u.name)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-gray-700">{u.name}</span>
                      <span className="block truncate text-[11px] text-gray-400">{u.email}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Unit + module targeting */}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-gray-500">
                <Building2 className="h-3 w-3" /> Seluruh Unit
              </label>
              <select
                value={targetUnitId}
                onChange={(e) => setTargetUnitId(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">— Tiada —</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-gray-500">
                <Boxes className="h-3 w-3" /> Pemegang Modul
              </label>
              <div className="flex flex-wrap gap-1.5">
                {MODULE_TARGET_OPTIONS.map((m) => {
                  const active = targetModules.includes(m.id)
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleModule(m.id)}
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[10px] font-bold transition-all",
                        active
                          ? "bg-violet-600 text-white shadow-sm"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200/70"
                      )}
                    >
                      {m.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Action links */}
        <div>
          <SectionLabel icon={Link2}>Pautan Tindakan Dalam E-mel (pilihan)</SectionLabel>
          <div className="space-y-2">
            {links.map((link, i) => (
              <div key={i} className="reminder-chip-in flex items-center gap-2">
                <input
                  value={link.label}
                  onChange={(e) =>
                    setLinks((prev) => prev.map((l, j) => (j === i ? { ...l, label: e.target.value } : l)))
                  }
                  placeholder="Label butang"
                  className="w-2/5 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                />
                <input
                  value={link.url}
                  onChange={(e) =>
                    setLinks((prev) => prev.map((l, j) => (j === i ? { ...l, url: e.target.value } : l)))
                  }
                  placeholder="/forms/... atau https://..."
                  className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                />
                <button
                  type="button"
                  onClick={() => setLinks((prev) => prev.filter((_, j) => j !== i))}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {links.length < 8 && (
              <button
                type="button"
                onClick={() => setLinks((prev) => [...prev, { label: "", url: "" }])}
                className="flex items-center gap-1.5 rounded-xl border border-dashed border-gray-300 px-3 py-2 text-xs font-bold text-gray-500 transition hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-600"
              >
                <Plus className="h-3.5 w-3.5" /> Tambah Pautan
              </button>
            )}
          </div>
        </div>

        {/* Enabled toggle */}
        <button
          type="button"
          onClick={() => setEnabled((v) => !v)}
          className="flex w-full items-center justify-between rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm transition hover:bg-gray-50/70"
        >
          <span className="text-sm font-bold text-gray-700">
            Peringatan Aktif
            <span className="ml-2 text-xs font-medium text-gray-400">
              {enabled ? "E-mel akan dihantar mengikut jadual" : "Dijeda — tiada e-mel dihantar"}
            </span>
          </span>
          <span
            className={cn(
              "relative h-6 w-11 shrink-0 rounded-full transition-colors",
              enabled ? "bg-emerald-500" : "bg-gray-300"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                enabled ? "left-[22px]" : "left-0.5"
              )}
            />
          </span>
        </button>
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-gray-100 bg-white/90 px-5 py-4 backdrop-blur sm:px-6">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-600 transition hover:bg-gray-50"
        >
          Batal
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="reminder-btn-glow flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:from-indigo-700 hover:to-violet-700 disabled:opacity-60"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {editing ? "Simpan Perubahan" : "Cipta Peringatan"}
        </button>
      </div>
    </ModalShell>
  )
}
