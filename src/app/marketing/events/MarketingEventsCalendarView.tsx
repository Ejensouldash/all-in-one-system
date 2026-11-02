"use client"

import { useState, useMemo } from "react"
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isToday, 
  addMonths, 
  subMonths 
} from "date-fns"
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  Building2, 
  User, 
  Phone, 
  Tag, 
  Sparkles, 
  LayoutList, 
  Eye, 
  Paperclip,
  Check
} from "lucide-react"
import { EventRequisitionItem } from "./MarketingEventsClient"

interface MarketingEventsCalendarViewProps {
  events: EventRequisitionItem[]
  onSelectEvent: (event: EventRequisitionItem) => void
  onSwitchToList: () => void
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function parseEventDate(d: Date | string | null | undefined): Date | null {
  if (!d) return null
  const dateObj = typeof d === "string" ? new Date(d) : d
  return isNaN(dateObj.getTime()) ? null : dateObj
}

function formatDateDisplay(d: Date | string | null | undefined): string {
  if (!d) return "-"
  const dateObj = parseEventDate(d)
  if (!dateObj) return "-"
  return dateObj.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

/** Check if an event falls on or spans across a given day */
function doesEventSpanDay(item: EventRequisitionItem, targetDay: Date): boolean {
  const from = parseEventDate(item.eventDateFrom)
  const to = parseEventDate(item.eventDateTo) || from

  if (!from && !to) {
    // Fallback to createdAt if event dates were not specified
    const created = parseEventDate(item.createdAt)
    return created ? isSameDay(created, targetDay) : false
  }

  const startDay = new Date(from!.getFullYear(), from!.getMonth(), from!.getDate(), 0, 0, 0, 0)
  const endDay = new Date(to!.getFullYear(), to!.getMonth(), to!.getDate(), 23, 59, 59, 999)
  const targetTime = targetDay.getTime()

  return targetTime >= startDay.getTime() && targetTime <= endDay.getTime()
}

export function MarketingEventsCalendarView({
  events,
  onSelectEvent,
  onSwitchToList,
}: MarketingEventsCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  // Filter only APPROVED events for calendar display
  const approvedEvents = useMemo(() => {
    return events.filter(e => e.status === "APPROVED")
  }, [events])

  // Calendar dates computation
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
  const daysInCalendar = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  // Approved events scheduled in current month
  const monthEvents = useMemo(() => {
    return approvedEvents.filter(e => {
      const from = parseEventDate(e.eventDateFrom)
      const to = parseEventDate(e.eventDateTo) || from
      if (!from && !to) {
        const created = parseEventDate(e.createdAt)
        return created && isSameMonth(created, currentDate)
      }
      const s = from || to!
      const end = to || from!
      return isSameMonth(s, currentDate) || isSameMonth(end, currentDate) || (s <= monthEnd && end >= monthStart)
    })
  }, [approvedEvents, currentDate, monthStart, monthEnd])

  // Events on the selected day (if any)
  const selectedDayEvents = useMemo(() => {
    if (!selectedDay) return []
    return approvedEvents.filter(e => doesEventSpanDay(e, selectedDay))
  }, [approvedEvents, selectedDay])

  const handlePrevMonth = () => setCurrentDate(prev => subMonths(prev, 1))
  const handleNextMonth = () => setCurrentDate(prev => addMonths(prev, 1))
  const handleToday = () => {
    const today = new Date()
    setCurrentDate(today)
    setSelectedDay(today)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Calendar Header Controls */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Month Title & Nav */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {format(currentDate, "MMMM yyyy")}
              </h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                <CheckCircle2 className="w-3 h-3" />
                {monthEvents.length} Approved
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Scheduled departmental event activations and logistics
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            onClick={handleToday}
            className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer"
          >
            Today
          </button>

          <div className="flex items-center rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-2 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="h-4 w-px bg-slate-200" />
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-2 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={onSwitchToList}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
          >
            <LayoutList className="w-3.5 h-3.5" />
            <span>List View</span>
          </button>
        </div>
      </div>

      {/* Main Calendar Grid */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 text-[11px] font-black uppercase tracking-wider text-slate-500 text-center py-3">
          {WEEKDAYS.map((wd, i) => (
            <div key={wd} className={i === 0 || i === 6 ? "text-slate-400" : ""}>
              {wd}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 bg-slate-100/30">
          {daysInCalendar.map((day) => {
            const inCurrentMonth = isSameMonth(day, currentDate)
            const isDayToday = isToday(day)
            const isDaySelected = selectedDay ? isSameDay(day, selectedDay) : false
            const dayEvents = approvedEvents.filter(e => doesEventSpanDay(e, day))
            const hasEvents = dayEvents.length > 0

            return (
              <div
                key={day.toISOString()}
                onClick={() => setSelectedDay(day)}
                className={`min-h-[110px] sm:min-h-[125px] p-2 flex flex-col justify-between transition-all cursor-pointer group relative ${
                  inCurrentMonth ? "bg-white" : "bg-slate-50/50 text-slate-400"
                } ${
                  isDaySelected 
                    ? "ring-2 ring-indigo-600 bg-indigo-50/20 z-10 shadow-xs" 
                    : "hover:bg-slate-50/80"
                }`}
              >
                {/* Cell Header: Day Number & Count */}
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all ${
                      isDayToday
                        ? "bg-indigo-600 text-white shadow-xs font-black"
                        : isDaySelected
                        ? "bg-slate-900 text-white font-bold"
                        : inCurrentMonth
                        ? "text-slate-800 group-hover:text-indigo-600"
                        : "text-slate-400"
                    }`}
                  >
                    {format(day, "d")}
                  </span>

                  {hasEvents && (
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                      {dayEvents.length}
                    </span>
                  )}
                </div>

                {/* Event Pills */}
                <div className="mt-1.5 space-y-1 flex-1 overflow-y-auto max-h-[85px] no-scrollbar">
                  {dayEvents.slice(0, 3).map((ev) => (
                    <div
                      key={ev.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelectEvent(ev)
                      }}
                      className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 text-[10px] font-bold transition-all shadow-2xs flex items-center justify-between gap-1 group/pill cursor-pointer"
                      title={`${ev.eventName} (${ev.department} - ${ev.organizer})`}
                    >
                      <span className="truncate">{ev.eventName}</span>
                      <Check className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                    </div>
                  ))}

                  {dayEvents.length > 3 && (
                    <div className="text-[10px] text-slate-500 font-bold px-1.5 text-center">
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Agenda Section: Events for Selected Day or Selected Month */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-black text-slate-900">
              {selectedDay
                ? `Events Scheduled for ${format(selectedDay, "EEEE, d MMMM yyyy")}`
                : `Approved Events in ${format(currentDate, "MMMM yyyy")} (${monthEvents.length})`}
            </h3>
          </div>

          {selectedDay && (
            <button
              type="button"
              onClick={() => setSelectedDay(null)}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer self-start sm:self-auto"
            >
              Show all for {format(currentDate, "MMMM")} &rarr;
            </button>
          )}
        </div>

        {/* Event Cards List */}
        {((selectedDay ? selectedDayEvents : monthEvents).length === 0) ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Calendar className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-700">
              {selectedDay
                ? `No approved events scheduled on ${format(selectedDay, "d MMM yyyy")}`
                : `No approved events scheduled for ${format(currentDate, "MMMM yyyy")}`}
            </h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Incoming department event requisitions will automatically appear here once accepted and approved.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(selectedDay ? selectedDayEvents : monthEvents).map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectEvent(item)}
                className="p-5 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/20 transition-all cursor-pointer flex flex-col justify-between gap-4 group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-xs px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700">
                      {item.requestNumber}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                      <CheckCircle2 className="w-3 h-3" />
                      Approved
                    </span>
                  </div>

                  <h4 className="text-base font-black text-slate-900 group-hover:text-emerald-700 transition-colors">
                    {item.eventName}
                  </h4>

                  <div className="space-y-1 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="font-semibold text-slate-800">
                        {formatDateDisplay(item.eventDateFrom)} &rarr; {formatDateDisplay(item.eventDateTo)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{item.department} <span className="text-slate-400">({item.name})</span></span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Org: <span className="font-medium text-slate-800">{item.organizer}</span></span>
                      {item.picContactNumber && (
                        <span className="text-slate-400">&bull; {item.picContactNumber}</span>
                      )}
                    </div>
                  </div>

                  {item.requirements && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {item.requirements.split(",").slice(0, 3).map((r) => (
                        <span
                          key={r.trim()}
                          className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold"
                        >
                          {r.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <span className="text-[11px] text-slate-400">Click to inspect full details</span>
                  <span className="font-bold text-emerald-700 group-hover:underline flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    Details
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
