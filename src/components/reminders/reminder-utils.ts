import { BellRing, Wrench, Briefcase, Heart, AlarmClock, Sparkles } from "lucide-react"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type ActionLink = { label: string; url: string }

export type Frequency = "ONCE" | "DAILY" | "WEEKLY" | "MONTHLY"

export type ReminderUser = { id: string; name: string; email?: string | null }

export type DeliveryDTO = {
  id: string
  occurrenceKey: string
  status: string
  recipientCount: number
  detail: string | null
  sentAt: string | Date
}

export type ReminderDTO = {
  id: string
  title: string
  description: string | null
  category: string
  frequency: Frequency
  onceAt: string | Date | null
  timeOfDay: string | null
  daysOfWeek: number[]
  dayOfMonth: number | null
  enabled: boolean
  targetSelf: boolean
  targetUnitId: string | null
  targetUnit?: { id: string; name: string } | null
  targetModules: string[]
  actionLinks: unknown
  seedKey: string | null
  createdById: string
  createdBy?: { id: string; name: string } | null
  recipients: { userId: string; user: ReminderUser }[]
  deliveries: DeliveryDTO[]
}

export type Occurrence = {
  reminder: ReminderDTO
  /** minutes since midnight (MYT wall clock) */
  minutes: number
  timeLabel: string
}

/* ------------------------------------------------------------------ */
/*  Category theming (full Tailwind literals for JIT detection)        */
/* ------------------------------------------------------------------ */

export type ReminderTheme = {
  key: string
  label: string
  icon: any
  dot: string
  solid: string
  soft: string
  softText: string
  border: string
  bar: string
  text: string
}

export const REMINDER_THEMES: Record<string, ReminderTheme> = {
  general: {
    key: "general",
    label: "Umum",
    icon: BellRing,
    dot: "bg-indigo-500",
    solid: "bg-gradient-to-br from-indigo-500 to-violet-600",
    soft: "bg-indigo-50",
    softText: "text-indigo-700",
    border: "border-indigo-200",
    bar: "bg-indigo-500",
    text: "text-indigo-600",
  },
  maintenance: {
    key: "maintenance",
    label: "Maintenance",
    icon: Wrench,
    dot: "bg-amber-500",
    solid: "bg-gradient-to-br from-amber-500 to-orange-600",
    soft: "bg-amber-50",
    softText: "text-amber-700",
    border: "border-amber-200",
    bar: "bg-amber-500",
    text: "text-amber-600",
  },
  work: {
    key: "work",
    label: "Kerja",
    icon: Briefcase,
    dot: "bg-blue-500",
    solid: "bg-gradient-to-br from-blue-500 to-cyan-600",
    soft: "bg-blue-50",
    softText: "text-blue-700",
    border: "border-blue-200",
    bar: "bg-blue-500",
    text: "text-blue-600",
  },
  personal: {
    key: "personal",
    label: "Peribadi",
    icon: Heart,
    dot: "bg-emerald-500",
    solid: "bg-gradient-to-br from-emerald-500 to-teal-600",
    soft: "bg-emerald-50",
    softText: "text-emerald-700",
    border: "border-emerald-200",
    bar: "bg-emerald-500",
    text: "text-emerald-600",
  },
  urgent: {
    key: "urgent",
    label: "Penting",
    icon: AlarmClock,
    dot: "bg-rose-500",
    solid: "bg-gradient-to-br from-rose-500 to-pink-600",
    soft: "bg-rose-50",
    softText: "text-rose-700",
    border: "border-rose-200",
    bar: "bg-rose-500",
    text: "text-rose-600",
  },
}

export const THEME_ORDER = ["general", "maintenance", "work", "personal", "urgent"]

export function getReminderTheme(category: string): ReminderTheme {
  return REMINDER_THEMES[category] ?? REMINDER_THEMES.general
}

/* ------------------------------------------------------------------ */
/*  BM labels                                                          */
/* ------------------------------------------------------------------ */

export const WEEKDAY_SHORT_BM = ["Ahd", "Isn", "Sel", "Rab", "Kha", "Jum", "Sab"]
export const WEEKDAY_LONG_BM = ["Ahad", "Isnin", "Selasa", "Rabu", "Khamis", "Jumaat", "Sabtu"]
export const MONTH_BM = [
  "Januari", "Februari", "Mac", "April", "Mei", "Jun",
  "Julai", "Ogos", "September", "Oktober", "November", "Disember",
]

export const MODULE_TARGET_OPTIONS: { id: string; label: string }[] = [
  { id: "MAINTENANCE_FORMS", label: "Maintenance Forms" },
  { id: "MAINTENANCE_DASHBOARD", label: "Maintenance Dashboard" },
  { id: "MAINTENANCE_REPORTS", label: "Maintenance Reports" },
  { id: "FORMS", label: "Production Forms" },
  { id: "WAREHOUSE", label: "Warehouse" },
  { id: "TICKETS", label: "Tickets" },
]

/* ------------------------------------------------------------------ */
/*  MYT time helpers                                                   */
/* ------------------------------------------------------------------ */

const MYT_OFFSET_MS = 8 * 60 * 60 * 1000

/** MYT wall-clock parts of a UTC instant (read via getUTC* on the shifted date). */
export function mytParts(instant: string | Date) {
  const d = new Date(new Date(instant).getTime() + MYT_OFFSET_MS)
  return {
    y: d.getUTCFullYear(),
    m: d.getUTCMonth(),
    d: d.getUTCDate(),
    hh: d.getUTCHours(),
    mm: d.getUTCMinutes(),
    dow: d.getUTCDay(),
  }
}

export function fmtTime12(hh: number, mm: number): string {
  const suffix = hh >= 12 ? "PM" : "AM"
  const h12 = hh % 12 === 0 ? 12 : hh % 12
  return mm === 0 ? `${h12} ${suffix}` : `${h12}:${String(mm).padStart(2, "0")} ${suffix}`
}

export function fmtTimeOfDay(timeOfDay: string): string {
  const [hh, mm] = timeOfDay.split(":").map(Number)
  return fmtTime12(hh || 0, mm || 0)
}

/** Value for <input type="datetime-local"> representing a UTC instant in MYT. */
export function toMytLocalInput(instant: string | Date): string {
  const p = mytParts(instant)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${p.y}-${pad(p.m + 1)}-${pad(p.d)}T${pad(p.hh)}:${pad(p.mm)}`
}

/* ------------------------------------------------------------------ */
/*  Occurrence expansion (client mirror of the engine's due logic)     */
/* ------------------------------------------------------------------ */

function daysInMonth(y: number, m: number): number {
  return new Date(y, m + 1, 0).getDate()
}

/** Does this reminder fire on the given calendar day (MYT wall-date)? */
export function firesOnDay(reminder: ReminderDTO, day: Date): boolean {
  switch (reminder.frequency) {
    case "ONCE": {
      if (!reminder.onceAt) return false
      const p = mytParts(reminder.onceAt)
      return p.y === day.getFullYear() && p.m === day.getMonth() && p.d === day.getDate()
    }
    case "DAILY":
      return !!reminder.timeOfDay
    case "WEEKLY":
      return !!reminder.timeOfDay && reminder.daysOfWeek.includes(day.getDay())
    case "MONTHLY": {
      if (!reminder.timeOfDay || !reminder.dayOfMonth) return false
      const clamped = Math.min(reminder.dayOfMonth, daysInMonth(day.getFullYear(), day.getMonth()))
      return day.getDate() === clamped
    }
    default:
      return false
  }
}

function reminderMinutes(reminder: ReminderDTO): number {
  if (reminder.frequency === "ONCE" && reminder.onceAt) {
    const p = mytParts(reminder.onceAt)
    return p.hh * 60 + p.mm
  }
  if (reminder.timeOfDay) {
    const [hh, mm] = reminder.timeOfDay.split(":").map(Number)
    return (hh || 0) * 60 + (mm || 0)
  }
  return 0
}

export function reminderTimeLabel(reminder: ReminderDTO): string {
  const mins = reminderMinutes(reminder)
  return fmtTime12(Math.floor(mins / 60), mins % 60)
}

/** All reminders that fire on a day, sorted by wall-clock time. */
export function occurrencesOnDay(reminders: ReminderDTO[], day: Date): Occurrence[] {
  return reminders
    .filter((r) => firesOnDay(r, day))
    .map((r) => ({
      reminder: r,
      minutes: reminderMinutes(r),
      timeLabel: reminderTimeLabel(r),
    }))
    .sort((a, b) => a.minutes - b.minutes)
}

/** Human summary like "Setiap hari • 8:00 AM" / "Setiap Isnin & Jumaat • 9 AM". */
export function scheduleSummary(reminder: ReminderDTO): string {
  switch (reminder.frequency) {
    case "ONCE": {
      if (!reminder.onceAt) return "Sekali"
      const p = mytParts(reminder.onceAt)
      return `${p.d} ${MONTH_BM[p.m]} ${p.y} • ${fmtTime12(p.hh, p.mm)}`
    }
    case "DAILY":
      return `Setiap hari • ${reminder.timeOfDay ? fmtTimeOfDay(reminder.timeOfDay) : "-"}`
    case "WEEKLY": {
      const days = reminder.daysOfWeek.map((d) => WEEKDAY_LONG_BM[d]).join(", ")
      return `Setiap ${days || "minggu"} • ${reminder.timeOfDay ? fmtTimeOfDay(reminder.timeOfDay) : "-"}`
    }
    case "MONTHLY":
      return `Setiap bulan (hari ke-${reminder.dayOfMonth}) • ${reminder.timeOfDay ? fmtTimeOfDay(reminder.timeOfDay) : "-"}`
    default:
      return ""
  }
}

/** Short chips describing who receives the reminder. */
export function targetSummary(reminder: ReminderDTO): string[] {
  const chips: string[] = []
  if (reminder.targetSelf) chips.push("Saya")
  if (reminder.recipients.length) chips.push(`${reminder.recipients.length} pengguna`)
  if (reminder.targetUnit?.name) chips.push(`Unit: ${reminder.targetUnit.name}`)
  if (reminder.targetModules.length) chips.push(`${reminder.targetModules.length} modul`)
  return chips
}

export function parseActionLinks(raw: unknown): ActionLink[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((l: any) => l && typeof l.label === "string" && typeof l.url === "string")
    .map((l: any) => ({ label: l.label, url: l.url }))
}

export function initials(name?: string | null): string {
  if (!name) return "?"
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((n) => n[0]).join("").toUpperCase()
}

const AVATAR_GRADIENTS = [
  "bg-gradient-to-br from-blue-500 to-indigo-600",
  "bg-gradient-to-br from-emerald-500 to-teal-600",
  "bg-gradient-to-br from-violet-500 to-purple-600",
  "bg-gradient-to-br from-amber-500 to-orange-600",
  "bg-gradient-to-br from-rose-500 to-pink-600",
  "bg-gradient-to-br from-cyan-500 to-sky-600",
]

export function avatarGradient(seed: string): string {
  let h = 0
  for (let i = 0; i < (seed || "").length; i++) {
    h = (h << 5) - h + seed.charCodeAt(i)
    h |= 0
  }
  return AVATAR_GRADIENTS[Math.abs(h) % AVATAR_GRADIENTS.length]
}

export const DELIVERY_STATUS_THEME: Record<string, { label: string; dot: string; text: string }> = {
  SENT: { label: "Dihantar", dot: "bg-emerald-500", text: "text-emerald-700" },
  PARTIAL: { label: "Separa", dot: "bg-amber-500", text: "text-amber-700" },
  FAILED: { label: "Gagal", dot: "bg-rose-500", text: "text-rose-700" },
  SENDING: { label: "Menghantar", dot: "bg-blue-500", text: "text-blue-700" },
  SKIPPED_EMPTY: { label: "Tiada penerima", dot: "bg-slate-400", text: "text-slate-600" },
}
