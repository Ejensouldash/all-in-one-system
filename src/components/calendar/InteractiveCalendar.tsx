// @ts-nocheck
"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  format,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isToday,
  isTomorrow,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
} from "date-fns"
// (isSameDay intentionally not imported here; day comparisons live in the views)
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  X,
  CalendarDays,
  LayoutGrid,
  CalendarRange,
  Clock,
  CalendarClock,
  Sparkles,
  Users,
  CalendarCheck,
  Check,
  CircleAlert,
  Zap,
} from "lucide-react"
import {
  normalizeEvents,
  getWeekDays,
  getTheme,
  fmtTimeShort,
  CATEGORY_ORDER,
  CATEGORY_THEMES,
} from "./calendar-utils"
import { MonthView, WeekView, DayView } from "./CalendarViews"
import { EventFormModal, EventViewModal, DeleteConfirmModal } from "./CalendarDialogs"
import {
  addEvent,
  updateEvent,
  deleteEvent,
  respondToInvite,
  testGoogleCalendarConnection,
} from "@/app/actions/calendar"
import "./CalendarCSS.css"

const cn = (...a) => a.filter(Boolean).join(" ")
const VIEWS = [
  { key: "month", label: "Month", icon: LayoutGrid },
  { key: "week", label: "Week", icon: CalendarRange },
  { key: "day", label: "Day", icon: CalendarClock },
]

function roundedNow() {
  const d = new Date()
  d.setMinutes(0, 0, 0)
  const end = new Date(d)
  end.setHours(end.getHours() + 1)
  return { start: d, end }
}

function relativeDayLabel(d) {
  if (isToday(d)) return "Today"
  if (isTomorrow(d)) return "Tomorrow"
  return format(d, "EEE, d MMM")
}

/** Animated count-up for the stat numbers. */
function CountUp({ value }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    let raf
    const start = performance.now()
    const dur = 650
    const tick = (t) => {
      const p = Math.min(1, (t - start) / dur)
      const eased = 1 - Math.pow(1 - p, 3)
      setN(Math.round(value * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return <>{n}</>
}

export function InteractiveCalendar({ events: rawEvents, itStaff, allUsers = [], currentUserId }: any) {
  const [view, setViewState] = useState("month")
  const [date, setDate] = useState(() => new Date())
  const [now, setNow] = useState(() => new Date())
  const [query, setQuery] = useState("")
  const [anim, setAnim] = useState("fade") // 'next' | 'prev' | 'fade'

  const [modal, setModal] = useState(null) // 'add' | 'edit' | 'view' | 'delete'
  const [selectedEventId, setSelectedEventId] = useState(null)
  const [slot, setSlot] = useState(null)

  const [syncWarning, setSyncWarning] = useState("")
  const [gTest, setGTest] = useState(null)
  const [gTesting, setGTesting] = useState(false)

  const dateInputRef = useRef(null)

  // Tick the current-time indicator every minute
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  const events = useMemo(() => normalizeEvents(rawEvents), [rawEvents])

  // Derive the open event from the live list so edits/RSVP reflect instantly
  const selectedEvent = useMemo(
    () => events.find((e) => e.id === selectedEventId) ?? null,
    [events, selectedEventId]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return events
    return events.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        (e.description || "").toLowerCase().includes(q) ||
        (e.assigneeName || "").toLowerCase().includes(q)
    )
  }, [events, query])

  const weekDays = useMemo(() => getWeekDays(date), [date])

  const upcoming = useMemo(
    () => filtered.filter((e) => e.end >= now).slice(0, 6),
    [filtered, now]
  )

  const stats = useMemo(() => {
    const monthCount = events.filter((e) => isSameMonth(e.start, date)).length
    const upcomingCount = events.filter((e) => e.end >= now).length
    return { total: events.length, monthCount, upcomingCount }
  }, [events, date, now])

  /* --------------------------- navigation --------------------------- */
  function navigate(dir) {
    if (dir === 0) {
      setAnim("fade")
      return setDate(new Date())
    }
    setAnim(dir > 0 ? "next" : "prev")
    const fns = {
      month: dir > 0 ? addMonths : subMonths,
      week: dir > 0 ? addWeeks : subWeeks,
      day: dir > 0 ? addDays : subDays,
    }
    setDate((d) => fns[view](d, 1))
  }

  function changeView(v) {
    setAnim("fade")
    setViewState(v)
  }

  function periodLabel() {
    if (view === "month") return format(date, "MMMM yyyy")
    if (view === "day") return format(date, "EEEE, d MMM yyyy")
    const ws = startOfWeek(date, { weekStartsOn: 0 })
    const we = endOfWeek(date, { weekStartsOn: 0 })
    if (isSameMonth(ws, we)) return `${format(ws, "d")} – ${format(we, "d MMM yyyy")}`
    const sameYear = ws.getFullYear() === we.getFullYear()
    return `${format(ws, sameYear ? "d MMM" : "d MMM yyyy")} – ${format(we, "d MMM yyyy")}`
  }

  /* ----------------------------- handlers --------------------------- */
  const openAdd = (start, end) => {
    setSlot({ start, end })
    setModal("add")
  }
  const openView = (event) => {
    setSelectedEventId(event.id)
    setModal("view")
  }
  const gotoDay = (day) => {
    setAnim("fade")
    setDate(day)
    setViewState("day")
  }
  const closeModal = () => setModal(null)

  const handleCreate = async (formData) => {
    const res = await addEvent(formData)
    if (res?.success) {
      closeModal()
      setSyncWarning(res.warning || "")
    }
    return res
  }
  const handleUpdate = async (formData) => {
    const res = await updateEvent(selectedEventId, formData)
    if (res?.success) {
      closeModal()
      setSyncWarning(res.warning || "")
    }
    return res
  }
  const handleDelete = async (event) => {
    const res = await deleteEvent(event.id)
    if (res?.success) closeModal()
    return res
  }
  const handleRespond = async (status) => {
    // Keep the view modal open; the RSVP reflects live via revalidation
    return await respondToInvite(selectedEventId, status)
  }

  const runGoogleTest = async () => {
    setGTesting(true)
    setGTest(null)
    try {
      const res = await testGoogleCalendarConnection()
      setGTest(res)
    } catch (e) {
      setGTest({ configured: true, ok: false, error: e?.message || "Test failed" })
    } finally {
      setGTesting(false)
    }
  }

  const manualAdd = () => {
    const { start, end } = roundedNow()
    openAdd(start, end)
  }

  return (
    <div className="flex flex-col gap-5 xl:flex-row">
      {/* ============================ Main ============================ */}
      <div className="min-w-0 flex-1">
        {syncWarning && (
          <div className="calendar-fade-in mb-3 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="flex-1">{syncWarning}</span>
            <button
              type="button"
              onClick={() => setSyncWarning("")}
              className="rounded-full p-1 text-amber-500 transition-colors hover:bg-amber-100"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
          {/* Toolbar */}
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate(0)}
                className="rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-bold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
              >
                Today
              </button>
              <div className="flex items-center rounded-xl border border-gray-200 bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="rounded-l-xl p-2 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-800"
                  aria-label="Previous"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="h-5 w-px bg-gray-200" />
                <button
                  type="button"
                  onClick={() => navigate(1)}
                  className="rounded-r-xl p-2 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-800"
                  aria-label="Next"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>

              <div className="relative flex items-center">
                <h2 className="ml-1 text-lg font-black tracking-tight text-gray-900 sm:text-xl">
                  {periodLabel()}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    try {
                      dateInputRef.current?.showPicker?.()
                    } catch {
                      dateInputRef.current?.focus?.()
                    }
                  }}
                  className="ml-1.5 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-blue-600"
                  aria-label="Jump to date"
                >
                  <CalendarDays className="h-4 w-4" />
                </button>
                <input
                  ref={dateInputRef}
                  type="date"
                  value={format(date, "yyyy-MM-dd")}
                  onChange={(e) => e.target.value && setDate(new Date(e.target.value))}
                  className="pointer-events-none absolute left-0 top-full h-0 w-0 opacity-0"
                  tabIndex={-1}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search events..."
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-8 text-sm outline-none transition-shadow focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 sm:w-48"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* View switcher */}
              <div className="flex items-center rounded-xl border border-gray-200 bg-gray-50 p-1">
                {VIEWS.map((v) => {
                  const Icon = v.icon
                  const active = view === v.key
                  return (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => changeView(v.key)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-all active:scale-95",
                        active
                          ? "bg-white text-blue-600 shadow-sm ring-1 ring-blue-100"
                          : "text-gray-500 hover:text-gray-800"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="hidden sm:inline">{v.label}</span>
                    </button>
                  )
                })}
              </div>

              <button
                type="button"
                onClick={manualAdd}
                className="calendar-btn-glow flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/25 active:scale-95"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Event</span>
              </button>
            </div>
          </div>

          {/* Views */}
          <div
            key={`${view}-${+date}`}
            className={cn(
              "calendar-view",
              anim === "next" && "calendar-in-right",
              anim === "prev" && "calendar-in-left",
              anim === "fade" && "calendar-in-fade"
            )}
          >
            {view === "month" && (
              <MonthView
                events={filtered}
                date={date}
                onSelectEvent={openView}
                onSelectSlot={openAdd}
                onNavigateDay={gotoDay}
              />
            )}
            {view === "week" && (
              <WeekView
                events={filtered}
                days={weekDays}
                now={now}
                onSelectEvent={openView}
                onSelectSlot={openAdd}
                onNavigateDay={gotoDay}
              />
            )}
            {view === "day" && (
              <DayView
                events={filtered}
                date={date}
                now={now}
                onSelectEvent={openView}
                onSelectSlot={openAdd}
                onNavigateDay={gotoDay}
              />
            )}
          </div>

          {query && filtered.length === 0 && (
            <div className="mt-4 rounded-2xl border border-dashed border-gray-200 py-8 text-center text-sm text-gray-400">
              No events match &ldquo;{query}&rdquo;
            </div>
          )}
        </div>
      </div>

      {/* ========================== Sidebar ========================== */}
      <aside className="w-full shrink-0 space-y-5 xl:w-80">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total", value: stats.total, icon: CalendarDays, tint: "text-blue-600 bg-blue-50" },
            { label: format(date, "MMM"), value: stats.monthCount, icon: LayoutGrid, tint: "text-violet-600 bg-violet-50" },
            { label: "Upcoming", value: stats.upcomingCount, icon: Sparkles, tint: "text-emerald-600 bg-emerald-50" },
          ].map((s, i) => {
            const Icon = s.icon
            return (
              <div
                key={s.label}
                className="calendar-list-in rounded-2xl border border-gray-100 bg-white p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <div className={cn("mb-2 flex h-8 w-8 items-center justify-center rounded-lg", s.tint)}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="text-xl font-black leading-none text-gray-900">
                  <CountUp value={s.value} />
                </div>
                <div className="mt-1 truncate text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  {s.label}
                </div>
              </div>
            )
          })}
        </div>

        {/* Upcoming */}
        <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-bold text-gray-900">Upcoming Events</h3>
          </div>
          {upcoming.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 py-6 text-center text-xs text-gray-400">
              Nothing scheduled ahead.
            </div>
          ) : (
            <div className="space-y-2">
              {upcoming.map((ev, i) => {
                const theme = getTheme(ev.category)
                return (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => openView(ev)}
                    style={{ animationDelay: `${i * 60}ms` }}
                    className="calendar-list-in group flex w-full items-stretch gap-3 rounded-2xl border border-gray-100 p-2.5 text-left transition-all hover:-translate-y-px hover:border-gray-200 hover:shadow-md"
                  >
                    <span className={cn("w-1 shrink-0 rounded-full", theme.bar)} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-gray-900 group-hover:text-blue-600">
                        {ev.title}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-gray-500">
                        <span className={cn("rounded-md px-1.5 py-0.5 font-semibold", theme.soft, theme.softText)}>
                          {relativeDayLabel(ev.start)}
                        </span>
                        <span className="tabular-nums">{fmtTimeShort(ev.start)}</span>
                        {ev.attendees.length > 0 && (
                          <span className="ml-auto flex items-center gap-0.5 text-gray-400">
                            <Users className="h-3 w-3" />
                            {ev.attendees.length}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-bold text-gray-900">Categories</h3>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_ORDER.map((key) => {
              const theme = CATEGORY_THEMES[key]
              const Icon = theme.icon
              return (
                <span
                  key={key}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                    theme.soft,
                    theme.softText
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {theme.label}
                </span>
              )
            })}
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-gray-400">
            Categories are auto-detected from the event title to keep the schedule colour-coded.
          </p>
        </div>

        {/* Google Calendar Sync */}
        <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-1.5 flex items-center gap-2">
            <CalendarCheck className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-bold text-gray-900">Google Calendar Sync</h3>
          </div>
          <p className="mb-3 text-[11px] leading-relaxed text-gray-400">
            New events sync to Google Calendar automatically. Test the connection to see its status.
          </p>
          <button
            type="button"
            onClick={runGoogleTest}
            disabled={gTesting}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-70"
          >
            {gTesting ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
            ) : (
              <Zap className="h-4 w-4 text-blue-600" />
            )}
            {gTesting ? "Testing..." : "Test connection"}
          </button>

          {gTest && (
            <div
              className={cn(
                "calendar-fade-in mt-3 rounded-xl border p-3 text-xs",
                gTest.ok ? "border-emerald-100 bg-emerald-50" : "border-rose-100 bg-rose-50"
              )}
            >
              <div
                className={cn(
                  "flex items-center gap-1.5 font-bold",
                  gTest.ok ? "text-emerald-700" : "text-rose-700"
                )}
              >
                {gTest.ok ? <Check className="h-4 w-4" /> : <CircleAlert className="h-4 w-4" />}
                {gTest.ok ? "Connected" : gTest.configured ? "Connection failed" : "Not configured"}
              </div>
              {gTest.calendarName && (
                <div className="mt-1 text-gray-600">
                  Calendar: <span className="font-semibold">{gTest.calendarName}</span>
                </div>
              )}
              {gTest.serviceAccount && (
                <div className="mt-0.5 break-all text-[10px] text-gray-500">{gTest.serviceAccount}</div>
              )}
              {gTest.error && <div className="mt-1 break-words text-rose-600">{gTest.error}</div>}
              {gTest.hint && (
                <div className="mt-2 rounded-lg bg-white/70 p-2 leading-relaxed text-gray-600">{gTest.hint}</div>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* ============================ Modals ============================ */}
      <EventFormModal
        open={modal === "add"}
        mode="add"
        slot={slot}
        itStaff={itStaff}
        allUsers={allUsers}
        currentUserId={currentUserId}
        onClose={closeModal}
        onSubmit={handleCreate}
      />
      <EventFormModal
        open={modal === "edit"}
        mode="edit"
        event={selectedEvent}
        itStaff={itStaff}
        allUsers={allUsers}
        currentUserId={currentUserId}
        onClose={closeModal}
        onSubmit={handleUpdate}
      />
      <EventViewModal
        open={modal === "view"}
        event={selectedEvent}
        currentUserId={currentUserId}
        onClose={closeModal}
        onEdit={() => setModal("edit")}
        onDelete={() => setModal("delete")}
        onRespond={handleRespond}
      />
      <DeleteConfirmModal
        open={modal === "delete"}
        event={selectedEvent}
        onClose={closeModal}
        onConfirm={handleDelete}
      />
    </div>
  )
}
