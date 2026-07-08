import {
  Users,
  Wrench,
  Rocket,
  AlarmClock,
  GraduationCap,
  ClipboardCheck,
  Tag,
  CircleCheck,
  CircleDot,
  CircleX,
  Hourglass,
} from "lucide-react"
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  startOfDay,
  endOfDay,
  differenceInMinutes,
  format,
  isSameDay,
} from "date-fns"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type RawAttendee = {
  id: string
  userId: string
  status: string
  user?: { id: string; name?: string | null; email?: string | null } | null
}

export type RawEvent = {
  id: string
  title: string
  description?: string | null
  startDateTime: string | Date
  endDateTime: string | Date
  assignee?: { id?: string; name?: string | null } | null
  createdBy?: { id?: string; name?: string | null; email?: string | null } | null
  attendees?: RawAttendee[] | null
}

export type RsvpStatus = "PENDING" | "GOING" | "MAYBE" | "DECLINED"

export type Attendee = {
  id: string
  userId: string
  name: string
  email: string | null
  status: RsvpStatus
}

export type DirectoryUser = {
  id: string
  name: string
  email?: string | null
  role?: string | null
}

export type CategoryKey =
  | "meeting"
  | "maintenance"
  | "deployment"
  | "deadline"
  | "training"
  | "review"
  | "general"

export type CalEvent = {
  id: string
  title: string
  description: string | null
  start: Date
  end: Date
  assigneeName: string | null
  createdByName: string | null
  organizerId: string | null
  category: CategoryKey
  attendees: Attendee[]
  raw: RawEvent
}

export type CalendarView = "month" | "week" | "day"

export type CategoryTheme = {
  key: CategoryKey
  label: string
  icon: any
  dot: string
  solid: string
  soft: string
  softText: string
  border: string
  ring: string
  bar: string
  text: string
}

/* ------------------------------------------------------------------ */
/*  Category theming (full Tailwind literals for JIT detection)        */
/* ------------------------------------------------------------------ */

export const CATEGORY_THEMES: Record<CategoryKey, CategoryTheme> = {
  meeting: {
    key: "meeting",
    label: "Meeting",
    icon: Users,
    dot: "bg-blue-500",
    solid: "bg-gradient-to-br from-blue-500 to-blue-600",
    soft: "bg-blue-50",
    softText: "text-blue-700",
    border: "border-blue-200",
    ring: "ring-blue-500/30",
    bar: "bg-blue-500",
    text: "text-blue-600",
  },
  maintenance: {
    key: "maintenance",
    label: "Maintenance",
    icon: Wrench,
    dot: "bg-amber-500",
    solid: "bg-gradient-to-br from-amber-500 to-amber-600",
    soft: "bg-amber-50",
    softText: "text-amber-700",
    border: "border-amber-200",
    ring: "ring-amber-500/30",
    bar: "bg-amber-500",
    text: "text-amber-600",
  },
  deployment: {
    key: "deployment",
    label: "Deployment",
    icon: Rocket,
    dot: "bg-violet-500",
    solid: "bg-gradient-to-br from-violet-500 to-violet-600",
    soft: "bg-violet-50",
    softText: "text-violet-700",
    border: "border-violet-200",
    ring: "ring-violet-500/30",
    bar: "bg-violet-500",
    text: "text-violet-600",
  },
  deadline: {
    key: "deadline",
    label: "Deadline",
    icon: AlarmClock,
    dot: "bg-rose-500",
    solid: "bg-gradient-to-br from-rose-500 to-rose-600",
    soft: "bg-rose-50",
    softText: "text-rose-700",
    border: "border-rose-200",
    ring: "ring-rose-500/30",
    bar: "bg-rose-500",
    text: "text-rose-600",
  },
  training: {
    key: "training",
    label: "Training",
    icon: GraduationCap,
    dot: "bg-emerald-500",
    solid: "bg-gradient-to-br from-emerald-500 to-emerald-600",
    soft: "bg-emerald-50",
    softText: "text-emerald-700",
    border: "border-emerald-200",
    ring: "ring-emerald-500/30",
    bar: "bg-emerald-500",
    text: "text-emerald-600",
  },
  review: {
    key: "review",
    label: "Review",
    icon: ClipboardCheck,
    dot: "bg-cyan-500",
    solid: "bg-gradient-to-br from-cyan-500 to-cyan-600",
    soft: "bg-cyan-50",
    softText: "text-cyan-700",
    border: "border-cyan-200",
    ring: "ring-cyan-500/30",
    bar: "bg-cyan-500",
    text: "text-cyan-600",
  },
  general: {
    key: "general",
    label: "General",
    icon: Tag,
    dot: "bg-indigo-500",
    solid: "bg-gradient-to-br from-indigo-500 to-indigo-600",
    soft: "bg-indigo-50",
    softText: "text-indigo-700",
    border: "border-indigo-200",
    ring: "ring-indigo-500/30",
    bar: "bg-indigo-500",
    text: "text-indigo-600",
  },
}

export const CATEGORY_ORDER: CategoryKey[] = [
  "meeting",
  "maintenance",
  "deployment",
  "deadline",
  "training",
  "review",
  "general",
]

const CATEGORY_KEYWORDS: Record<Exclude<CategoryKey, "general">, string[]> = {
  meeting: ["meeting", "meet", "sync", "call", "discuss", "standup", "stand-up", "catch up", "catchup", "kickoff", "kick-off", "1:1", "briefing"],
  maintenance: ["maintenance", "maintain", "patch", "upgrade", "server", "backup", "migration", "downtime", "install", "update", "repair"],
  deployment: ["deploy", "release", "launch", "rollout", "go-live", "go live", "ship", "production", "cutover"],
  deadline: ["deadline", "due", "submit", "submission", "delivery", "deliver", "cutoff", "cut-off", "expiry", "expire"],
  training: ["training", "train", "workshop", "onboarding", "onboard", "seminar", "course", "learn", "session"],
  review: ["review", "audit", "retro", "retrospective", "demo", "presentation", "report", "assessment", "inspection"],
}

/** Derive a category from the event title using keyword heuristics. */
export function detectCategory(title: string): CategoryKey {
  const t = (title || "").toLowerCase()
  for (const key of Object.keys(CATEGORY_KEYWORDS) as Array<Exclude<CategoryKey, "general">>) {
    if (CATEGORY_KEYWORDS[key].some((kw) => t.includes(kw))) return key
  }
  return "general"
}

export function getTheme(category: CategoryKey): CategoryTheme {
  return CATEGORY_THEMES[category] ?? CATEGORY_THEMES.general
}

/* ------------------------------------------------------------------ */
/*  Event normalization                                                */
/* ------------------------------------------------------------------ */

export function normalizeEvents(raw: RawEvent[]): CalEvent[] {
  return (raw || [])
    .map((e) => {
      const start = new Date(e.startDateTime)
      const end = new Date(e.endDateTime)
      return {
        id: e.id,
        title: e.title,
        description: e.description ?? null,
        start,
        end: end < start ? start : end,
        assigneeName: e.assignee?.name ?? null,
        createdByName: e.createdBy?.name ?? null,
        organizerId: e.createdBy?.id ?? null,
        category: detectCategory(e.title),
        attendees: (e.attendees ?? []).map((a) => ({
          id: a.id,
          userId: a.userId,
          name: a.user?.name ?? "Unknown",
          email: a.user?.email ?? null,
          status: (["GOING", "MAYBE", "DECLINED", "PENDING"].includes(a.status)
            ? a.status
            : "PENDING") as RsvpStatus,
        })),
        raw: e,
      } as CalEvent
    })
    .sort((a, b) => a.start.getTime() - b.start.getTime())
}

/* ------------------------------------------------------------------ */
/*  Date helpers                                                       */
/* ------------------------------------------------------------------ */

/** A 6x7 (or fitting) matrix of days covering the month grid, week starts Sunday. */
export function getMonthMatrix(date: Date): Date[][] {
  const gridStart = startOfWeek(startOfMonth(date), { weekStartsOn: 0 })
  const gridEnd = endOfWeek(endOfMonth(date), { weekStartsOn: 0 })
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })
  const weeks: Date[][] = []
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7))
  return weeks
}

export function getWeekDays(date: Date): Date[] {
  const start = startOfWeek(date, { weekStartsOn: 0 })
  return eachDayOfInterval({ start, end: endOfWeek(date, { weekStartsOn: 0 }) })
}

/** Events that intersect a given calendar day. */
export function eventsOnDay(events: CalEvent[], day: Date): CalEvent[] {
  const dayStart = startOfDay(day)
  const dayEnd = endOfDay(day)
  return events.filter((e) => e.start <= dayEnd && e.end >= dayStart)
}

export function isMultiDay(e: CalEvent): boolean {
  return !isSameDay(e.start, e.end)
}

export function fmtTime(d: Date): string {
  return format(d, "h:mm a")
}

export function fmtTimeShort(d: Date): string {
  return format(d, d.getMinutes() === 0 ? "h a" : "h:mm a")
}

export function fmtTimeRange(start: Date, end: Date): string {
  return `${fmtTime(start)} - ${fmtTime(end)}`
}

export function fmtDateLong(d: Date): string {
  return format(d, "EEEE, d MMMM yyyy")
}

export function fmtDuration(start: Date, end: Date): string {
  const mins = Math.max(0, differenceInMinutes(end, start))
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`
}

/** Value for <input type="datetime-local">. */
export function toLocalInput(d: Date): string {
  return format(d, "yyyy-MM-dd'T'HH:mm")
}

/* ------------------------------------------------------------------ */
/*  Time-grid layout (week / day views)                                */
/* ------------------------------------------------------------------ */

export type PositionedEvent = {
  event: CalEvent
  top: number
  height: number
  leftPct: number
  widthPct: number
}

/**
 * Position events inside a single day's time grid, resolving overlaps
 * into side-by-side columns (classic calendar packing algorithm).
 */
export function layoutDay(
  events: CalEvent[],
  day: Date,
  hourHeight: number,
  minHeight = 24
): PositionedEvent[] {
  const dayStart = startOfDay(day).getTime()
  const dayEnd = endOfDay(day).getTime()

  const items = events
    .map((event) => {
      const s = Math.max(event.start.getTime(), dayStart)
      const e = Math.min(event.end.getTime(), dayEnd)
      const startMin = (s - dayStart) / 60000
      const endMin = Math.max((e - dayStart) / 60000, startMin + 1)
      return { event, startMin, endMin }
    })
    .sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin)

  const positioned: PositionedEvent[] = []
  let cluster: typeof items = []
  let clusterEnd = -Infinity

  const flush = () => {
    if (!cluster.length) return
    const colEnds: number[] = []
    const cols: number[] = []
    cluster.forEach((it, idx) => {
      let placed = -1
      for (let c = 0; c < colEnds.length; c++) {
        if (colEnds[c] <= it.startMin) {
          placed = c
          break
        }
      }
      if (placed === -1) {
        placed = colEnds.length
        colEnds.push(it.endMin)
      } else {
        colEnds[placed] = it.endMin
      }
      cols[idx] = placed
    })
    const total = colEnds.length
    cluster.forEach((it, idx) => {
      const top = (it.startMin / 60) * hourHeight
      const rawHeight = ((it.endMin - it.startMin) / 60) * hourHeight
      positioned.push({
        event: it.event,
        top,
        height: Math.max(rawHeight, minHeight),
        leftPct: (cols[idx] / total) * 100,
        widthPct: (1 / total) * 100,
      })
    })
    cluster = []
    clusterEnd = -Infinity
  }

  for (const it of items) {
    if (cluster.length && it.startMin >= clusterEnd) flush()
    cluster.push(it)
    clusterEnd = Math.max(clusterEnd, it.endMin)
  }
  flush()

  return positioned
}

export const HOURS: number[] = Array.from({ length: 24 }, (_, i) => i)

export function hourLabel(h: number): string {
  if (h === 0) return "12 AM"
  if (h === 12) return "12 PM"
  return h < 12 ? `${h} AM` : `${h - 12} PM`
}

/* ------------------------------------------------------------------ */
/*  Attendees / RSVP                                                   */
/* ------------------------------------------------------------------ */

export type RsvpTheme = {
  key: RsvpStatus
  label: string
  short: string
  icon: any
  dot: string
  soft: string
  softText: string
  solid: string
  ring: string
}

export const RSVP_STATUS: Record<RsvpStatus, RsvpTheme> = {
  GOING: {
    key: "GOING",
    label: "Going",
    short: "Going",
    icon: CircleCheck,
    dot: "bg-emerald-500",
    soft: "bg-emerald-50",
    softText: "text-emerald-700",
    solid: "bg-emerald-500",
    ring: "ring-emerald-500/40",
  },
  MAYBE: {
    key: "MAYBE",
    label: "Maybe",
    short: "Maybe",
    icon: CircleDot,
    dot: "bg-amber-500",
    soft: "bg-amber-50",
    softText: "text-amber-700",
    solid: "bg-amber-500",
    ring: "ring-amber-500/40",
  },
  DECLINED: {
    key: "DECLINED",
    label: "Can't go",
    short: "Declined",
    icon: CircleX,
    dot: "bg-rose-500",
    soft: "bg-rose-50",
    softText: "text-rose-700",
    solid: "bg-rose-500",
    ring: "ring-rose-500/40",
  },
  PENDING: {
    key: "PENDING",
    label: "Invited",
    short: "Awaiting",
    icon: Hourglass,
    dot: "bg-slate-400",
    soft: "bg-slate-100",
    softText: "text-slate-600",
    solid: "bg-slate-400",
    ring: "ring-slate-400/40",
  },
}

export function guestSummary(attendees: Attendee[]) {
  const s = { GOING: 0, MAYBE: 0, DECLINED: 0, PENDING: 0, total: attendees.length }
  for (const a of attendees) s[a.status] = (s[a.status] || 0) + 1
  return s
}

export function findUserStatus(event: CalEvent, userId?: string | null): RsvpStatus | null {
  if (!userId) return null
  const a = event.attendees.find((x) => x.userId === userId)
  return a ? a.status : null
}

export function initials(name?: string | null): string {
  if (!name) return "?"
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
}

const AVATAR_GRADIENTS = [
  "bg-gradient-to-br from-blue-500 to-indigo-600",
  "bg-gradient-to-br from-emerald-500 to-teal-600",
  "bg-gradient-to-br from-violet-500 to-purple-600",
  "bg-gradient-to-br from-amber-500 to-orange-600",
  "bg-gradient-to-br from-rose-500 to-pink-600",
  "bg-gradient-to-br from-cyan-500 to-sky-600",
  "bg-gradient-to-br from-fuchsia-500 to-purple-600",
  "bg-gradient-to-br from-lime-500 to-emerald-600",
]

export function avatarGradient(seed: string): string {
  let h = 0
  for (let i = 0; i < (seed || "").length; i++) {
    h = (h << 5) - h + seed.charCodeAt(i)
    h |= 0
  }
  return AVATAR_GRADIENTS[Math.abs(h) % AVATAR_GRADIENTS.length]
}
