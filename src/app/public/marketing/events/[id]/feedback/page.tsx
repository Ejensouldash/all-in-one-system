import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { EventSatisfactionFormClient } from "./EventSatisfactionFormClient"
import { AlertCircle, Clock, ShieldAlert } from "lucide-react"

interface Props {
  params: Promise<{ id: string }>
}

function formatDateDisplay(d: Date | string | null | undefined): string {
  if (!d) return ""
  const dateObj = typeof d === "string" ? new Date(d) : d
  if (isNaN(dateObj.getTime())) return ""
  return dateObj.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export async function generateMetadata(props: Props) {
  const { id } = await props.params
  const event = await prisma.marketingEventRequisition.findUnique({
    where: { id },
    select: { eventName: true, organizer: true },
  })

  if (!event) {
    return {
      title: "Event Satisfaction Form | Bubbles O2",
    }
  }

  return {
    title: `Event Satisfaction Form - ${event.eventName} | Bubbles O2`,
    description: `Official satisfaction feedback form for ${event.eventName} organized by ${event.organizer}.`,
  }
}

export default async function PublicEventFeedbackPage(props: Props) {
  const { id } = await props.params

  const event = await prisma.marketingEventRequisition.findUnique({
    where: { id },
    select: {
      id: true,
      eventName: true,
      organizer: true,
      eventDateFrom: true,
      eventDateTo: true,
      tentative: true,
      status: true,
    },
  })

  if (!event) {
    return notFound()
  }

  // If event is not approved yet, display a polite message
  if (event.status !== "APPROVED") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-teal-50/40 to-cyan-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl border border-slate-200/80 p-8 sm:p-10 text-center">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-5">
            <Clock className="w-8 h-8" />
          </div>
          <span className="inline-block px-3 py-1 rounded-full bg-amber-100/80 text-amber-800 text-xs font-bold uppercase tracking-wider mb-3">
            Form Not Available
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 mb-2">
            Feedback Form Currently Closed
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed mb-6">
            The satisfaction feedback form for <strong className="text-slate-900">{event.eventName}</strong> is only
            accessible once the event requisition has been reviewed and officially approved by Bubbles O2 Marketing.
          </p>
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
            Current Status: <span className="font-bold uppercase text-slate-700">{event.status}</span>
          </div>
        </div>
      </div>
    )
  }

  const dateFromStr = formatDateDisplay(event.eventDateFrom)
  const dateToStr = formatDateDisplay(event.eventDateTo)
  const eventDates = dateFromStr && dateToStr 
    ? (dateFromStr === dateToStr ? dateFromStr : `${dateFromStr} - ${dateToStr}`)
    : dateFromStr || dateToStr || ""

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-teal-50/30 to-cyan-50/50 py-8 sm:py-16 px-4 sm:px-6 flex items-center justify-center">
      <EventSatisfactionFormClient
        requisitionId={event.id}
        eventName={event.eventName}
        organizer={event.organizer}
        eventDates={eventDates}
        location={event.tentative?.split("\n")[0]?.slice(0, 80)}
      />
    </div>
  )
}
