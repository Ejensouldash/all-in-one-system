"use client"
// @ts-nocheck

import { useState } from 'react'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { enUS } from 'date-fns/locale/en-US'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import './CalendarCSS.css'
import { X, Calendar as CalendarIcon, Clock, User } from 'lucide-react'
import { addEvent } from '@/app/actions/calendar'

const locales = {
  'en-US': enUS,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

type InteractiveCalendarProps = {
  events: any[]
  itStaff: { id: string, name: string }[]
}

function CustomToolbar(toolbar: any) {
  const date = toolbar.date

  return (
    <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
      <div className="flex rounded-lg overflow-hidden border border-gray-200 shadow-sm">
        <button type="button" onClick={() => toolbar.onNavigate('TODAY')} className="px-4 py-2 bg-white hover:bg-gray-50 text-sm font-bold text-gray-700 border-r border-gray-200 transition-colors">Today</button>
        <button type="button" onClick={() => toolbar.onNavigate('PREV')} className="px-4 py-2 bg-white hover:bg-gray-50 text-sm font-bold text-gray-700 border-r border-gray-200 transition-colors">Back</button>
        <button type="button" onClick={() => toolbar.onNavigate('NEXT')} className="px-4 py-2 bg-white hover:bg-gray-50 text-sm font-bold text-gray-700 transition-colors">Next</button>
      </div>

      <div className="flex-1 flex justify-center">
        <div className="relative group">
          <input 
            type="month" 
            value={format(date, 'yyyy-MM')}
            onChange={(e) => {
              if (!e.target.value) return
              const [year, month] = e.target.value.split('-')
              const newDate = new Date(Number(year), Number(month) - 1, 1)
              toolbar.onNavigate('DATE', newDate)
            }}
            className="text-xl font-black text-gray-900 bg-transparent border-none outline-none cursor-pointer hover:bg-gray-50 px-4 py-2 rounded-xl transition-colors text-center w-auto appearance-none"
            title="Click to jump to a specific month/year"
          />
        </div>
      </div>

      <div className="flex rounded-lg overflow-hidden border border-gray-200 shadow-sm">
        <button type="button" className={`px-4 py-2 text-sm font-bold border-r border-gray-200 transition-colors ${toolbar.view === 'month' ? 'bg-blue-50 text-blue-700' : 'bg-white hover:bg-gray-50 text-gray-700'}`} onClick={() => toolbar.onView('month')}>Month</button>
        <button type="button" className={`px-4 py-2 text-sm font-bold border-r border-gray-200 transition-colors ${toolbar.view === 'week' ? 'bg-blue-50 text-blue-700' : 'bg-white hover:bg-gray-50 text-gray-700'}`} onClick={() => toolbar.onView('week')}>Week</button>
        <button type="button" className={`px-4 py-2 text-sm font-bold transition-colors ${toolbar.view === 'day' ? 'bg-blue-50 text-blue-700' : 'bg-white hover:bg-gray-50 text-gray-700'}`} onClick={() => toolbar.onView('day')}>Day</button>
      </div>

      <button type="button" onClick={toolbar.onAddClick} className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-sm transition-colors mt-2 sm:mt-0">
        + Add Event
      </button>
    </div>
  )
}

export function InteractiveCalendar({ events, itStaff }: InteractiveCalendarProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date, end: Date } | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<any>(null)
  const [isPending, setIsPending] = useState(false)
  
  // Controlled Calendar State
  const [view, setView] = useState<any>('month')
  const [date, setDate] = useState<Date>(new Date())

  // Define a set of tailwind background colors for events
  const EVENT_COLORS = [
    'bg-blue-500 hover:bg-blue-600 border-blue-600',
    'bg-emerald-500 hover:bg-emerald-600 border-emerald-600',
    'bg-violet-500 hover:bg-violet-600 border-violet-600',
    'bg-amber-500 hover:bg-amber-600 border-amber-600',
    'bg-rose-500 hover:bg-rose-600 border-rose-600',
    'bg-cyan-500 hover:bg-cyan-600 border-cyan-600',
  ]

  // Map events to react-big-calendar format
  const calendarEvents = events.map((event, index) => ({
    id: event.id,
    title: event.title,
    start: new Date(event.startDateTime),
    end: new Date(event.endDateTime),
    resource: event,
    colorClass: EVENT_COLORS[index % EVENT_COLORS.length]
  }))

  const handleSelectSlot = (slotInfo: { start: Date, end: Date }) => {
    setSelectedSlot(slotInfo)
    setIsAddModalOpen(true)
  }

  const handleManualAddClick = () => {
    const now = new Date()
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000)
    setSelectedSlot({ start: now, end: oneHourLater })
    setIsAddModalOpen(true)
  }

  const eventStyleGetter = (event: any) => {
    return {
      className: `${event.colorClass} border-0 shadow-sm`,
      style: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: '0.75rem',
        borderRadius: '6px'
      }
    }
  }

  const handleSelectEvent = (event: any) => {
    setSelectedEvent(event.resource)
    setIsViewModalOpen(true)
  }

  const handleAddSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsPending(true)
    try {
      const formData = new FormData(e.currentTarget)
      await addEvent(formData)
      setIsAddModalOpen(false)
    } catch (error) {
      console.error(error)
      alert("Failed to add event")
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
      
      <Calendar
        localizer={localizer}
        events={calendarEvents}
        startAccessor="start"
        endAccessor="end"
        style={{ height: '70vh', minHeight: 500 }}
        selectable
        onSelectSlot={handleSelectSlot}
        onSelectEvent={handleSelectEvent}
        view={view}
        onView={setView}
        date={date}
        onNavigate={setDate}
        views={['month', 'week', 'day']}
        popup
        eventPropGetter={eventStyleGetter}
        components={{
          toolbar: (props) => <CustomToolbar {...props} onAddClick={handleManualAddClick} />
        }}
        className="font-sans"
      />

      {/* Add Event Modal */}
      {isAddModalOpen && selectedSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-gray-900 text-lg">Add New Event</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-full p-2 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Event Title</label>
                <input name="title" required type="text" className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Server Maintenance" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Start Time</label>
                  <input name="startDateTime" required type="datetime-local" defaultValue={format(selectedSlot.start, "yyyy-MM-dd'T'HH:mm")} className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">End Time</label>
                  <input name="endDateTime" required type="datetime-local" defaultValue={format(selectedSlot.end, "yyyy-MM-dd'T'HH:mm")} className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Assign To (Optional)</label>
                <select name="assigneeId" className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 outline-none">
                  <option value="">-- Unassigned --</option>
                  {itStaff.map(staff => (
                    <option key={staff.id} value={staff.id}>{staff.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Description</label>
                <textarea name="description" rows={3} className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 outline-none resize-none" placeholder="Details..."></textarea>
              </div>

              <button disabled={isPending} type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-colors disabled:opacity-70 mt-4">
                {isPending ? "Saving..." : "Save Event"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* View Event Modal */}
      {isViewModalOpen && selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100">
            <div className="p-6 border-b border-gray-100 flex justify-between items-start">
              <div>
                <h3 className="font-black text-gray-900 text-xl">{selectedEvent.title}</h3>
                <span className="inline-flex items-center text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full mt-2">
                  <CalendarIcon className="w-3 h-3 mr-1" /> Scheduled Event
                </span>
              </div>
              <button onClick={() => setIsViewModalOpen(false)} className="text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-full p-2 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-5 bg-gray-50/50">
              <div className="flex items-center text-gray-700">
                <Clock className="w-5 h-5 mr-3 text-gray-400" />
                <div>
                  <div className="text-sm font-medium">
                    {new Date(selectedEvent.startDateTime).toLocaleDateString()} at {new Date(selectedEvent.startDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Until {new Date(selectedEvent.endDateTime).toLocaleDateString()} at {new Date(selectedEvent.endDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>

              <div className="flex items-center text-gray-700">
                <User className="w-5 h-5 mr-3 text-gray-400" />
                <div>
                  <div className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-0.5">Assigned To</div>
                  <div className="text-sm font-medium">{selectedEvent.assignee?.name || "Unassigned"}</div>
                </div>
              </div>

              {selectedEvent.description && (
                <div className="bg-white p-4 rounded-xl border border-gray-200">
                  <div className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2">Description</div>
                  <p className="text-sm text-gray-700">{selectedEvent.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
