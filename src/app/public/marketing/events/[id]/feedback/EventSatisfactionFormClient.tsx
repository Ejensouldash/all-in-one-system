"use client"

import { useState } from "react"
import { submitMarketingEventFeedback } from "@/app/actions/marketing-feedback"
import { CheckCircle2, AlertCircle, Loader2, Sparkles, Building2, Calendar, MapPin, Send } from "lucide-react"

interface EventSatisfactionFormClientProps {
  requisitionId: string
  eventName: string
  organizer: string
  eventDates: string
  location?: string
}

export function EventSatisfactionFormClient({
  requisitionId,
  eventName,
  organizer,
  eventDates,
  location,
}: EventSatisfactionFormClientProps) {
  // Form fields
  const [name, setName] = useState("")
  const [likedMost, setLikedMost] = useState("")
  const [likedLeast, setLikedLeast] = useState("")
  const [satisfaction, setSatisfaction] = useState<string>("")
  const [wellOrganized, setWellOrganized] = useState<boolean | null>(null)
  const [comments, setComments] = useState("")

  // Form submission state
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    // Validate all required fields
    if (!name.trim()) {
      setErrorMessage("Please answer question 1: enter your name.")
      return
    }
    if (!likedMost.trim()) {
      setErrorMessage("Please answer question 2: what did you like most about the event.")
      return
    }
    if (!likedLeast.trim()) {
      setErrorMessage("Please answer question 3: what did you like least about the event.")
      return
    }
    if (!satisfaction) {
      setErrorMessage("Please answer question 4: select how satisfied you were with the event.")
      return
    }
    if (wellOrganized === null) {
      setErrorMessage("Please answer question 5: select whether you think the event was well organized.")
      return
    }
    if (!comments.trim()) {
      setErrorMessage("Please answer question 6: provide comments or suggestions for improvement.")
      return
    }

    setSubmitting(true)

    try {
      const res = await submitMarketingEventFeedback({
        requisitionId,
        respondentName: name.trim(),
        likedMost: likedMost.trim(),
        likedLeast: likedLeast.trim(),
        satisfaction,
        wellOrganized: Boolean(wellOrganized),
        comments: comments.trim(),
      })

      if (res.success) {
        setSubmitted(true)
      } else {
        setErrorMessage(res.error || "Failed to submit feedback. Please try again.")
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleReset = () => {
    setName("")
    setLikedMost("")
    setLikedLeast("")
    setSatisfaction("")
    setWellOrganized(null)
    setComments("")
    setSubmitted(false)
    setErrorMessage(null)
  }

  if (submitted) {
    return (
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl border border-slate-100 p-8 sm:p-12 text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 mb-6 shadow-sm">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-100/80 text-teal-800 text-xs font-bold uppercase tracking-wider mb-3">
          <Sparkles className="w-3.5 h-3.5 text-teal-600" />
          Submission Received
        </span>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-3">
          Thank you for your feedback!
        </h2>
        <p className="text-slate-600 text-sm leading-relaxed max-w-md mx-auto mb-8">
          Your responses for <span className="font-bold text-slate-900">{eventName}</span> have been recorded.
          Your feedback helps us deliver even better experiences for future Bubbles O2 events.
        </p>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-500 mb-8 max-w-sm mx-auto">
          Bubbles O2 Marketing &amp; Event Management Team
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center justify-center px-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition shadow-sm cursor-pointer"
        >
          Submit Another Response
        </button>
      </div>
    )
  }

  return (
    <div className="w-full max-w-3xl bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden">
      {/* Top Brand Banner */}
      <div className="bg-gradient-to-r from-teal-700 via-teal-600 to-cyan-600 p-6 sm:p-8 text-white relative">
        <div className="flex items-center justify-between gap-4 mb-3">
          <span className="text-[11px] font-bold uppercase tracking-widest text-teal-100 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Bubbles O2 Official Feedback
          </span>
          <span className="text-xs bg-white/20 backdrop-blur-xs px-2.5 py-1 rounded-lg font-bold text-white">
            Public Form
          </span>
        </div>

        <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight leading-snug">
          Bubbles O2 Event Satisfaction Feedback Form - {eventName}
        </h1>

        {/* Quick event meta */}
        <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-teal-100 mt-4 pt-4 border-t border-white/15">
          {organizer && (
            <span className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 opacity-80" />
              <span>Organizer: <strong className="text-white">{organizer}</strong></span>
            </span>
          )}
          {eventDates && (
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 opacity-80" />
              <span>Date: <strong className="text-white">{eventDates}</strong></span>
            </span>
          )}
          {location && (
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 opacity-80" />
              <span>{location}</span>
            </span>
          )}
        </div>
      </div>

      {/* Form Introductory Notice */}
      <div className="p-6 sm:p-8 pb-4 border-b border-slate-100 bg-slate-50/50 space-y-2">
        <p className="text-sm text-slate-700 font-medium leading-relaxed">
          Please complete this form to help us improve our future events.
        </p>
        <p className="text-xs text-slate-500 leading-relaxed">
          When you submit this form, it will not automatically collect your details like name and email address unless you provide it yourself.
        </p>
        <p className="text-xs font-bold text-rose-500 pt-1">
          * Required
        </p>
      </div>

      {/* Main Feedback Form */}
      <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8">
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Please check your inputs</p>
              <p className="font-normal mt-0.5 text-rose-700">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Question 1: Name */}
        <div className="space-y-2.5">
          <label htmlFor="q1-name" className="block text-sm sm:text-base font-bold text-slate-900">
            1. Please enter your name <span className="text-rose-500">*</span>
          </label>
          <input
            id="q1-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your answer"
            className="w-full px-4 py-3 rounded-2xl bg-slate-50/80 border border-slate-200 focus:bg-white focus:border-teal-600 focus:ring-4 focus:ring-teal-500/10 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition"
          />
        </div>

        {/* Question 2: Liked Most */}
        <div className="space-y-2.5">
          <label htmlFor="q2-liked-most" className="block text-sm sm:text-base font-bold text-slate-900">
            2. What did you like most about the event? <span className="text-rose-500">*</span>
          </label>
          <textarea
            id="q2-liked-most"
            required
            rows={3}
            value={likedMost}
            onChange={(e) => setLikedMost(e.target.value)}
            placeholder="Enter your answer"
            className="w-full px-4 py-3 rounded-2xl bg-slate-50/80 border border-slate-200 focus:bg-white focus:border-teal-600 focus:ring-4 focus:ring-teal-500/10 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition resize-y"
          />
        </div>

        {/* Question 3: Liked Least */}
        <div className="space-y-2.5">
          <label htmlFor="q3-liked-least" className="block text-sm sm:text-base font-bold text-slate-900">
            3. What did you like least about the event? <span className="text-rose-500">*</span>
          </label>
          <textarea
            id="q3-liked-least"
            required
            rows={3}
            value={likedLeast}
            onChange={(e) => setLikedLeast(e.target.value)}
            placeholder="Enter your answer"
            className="w-full px-4 py-3 rounded-2xl bg-slate-50/80 border border-slate-200 focus:bg-white focus:border-teal-600 focus:ring-4 focus:ring-teal-500/10 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition resize-y"
          />
        </div>

        {/* Question 4: Satisfaction Rating */}
        <div className="space-y-3">
          <label className="block text-sm sm:text-base font-bold text-slate-900">
            4. How satisfied were you with the event? <span className="text-rose-500">*</span>
          </label>
          <div className="space-y-2 pt-1">
            {[
              { value: "EXTREMELY_SATISFIED", label: "Extremely satisfied" },
              { value: "VERY_SATISFIED", label: "Very satisfied" },
              { value: "SOMEWHAT_SATISFIED", label: "Somewhat satisfied" },
              { value: "NOT_SO_SATISFIED", label: "Not so satisfied" },
              { value: "NOT_AT_ALL_SATISFIED", label: "Not at all satisfied" },
            ].map((opt) => (
              <label
                key={opt.value}
                className={`flex items-center gap-3.5 p-3.5 rounded-2xl border transition cursor-pointer ${
                  satisfaction === opt.value
                    ? "bg-teal-50/70 border-teal-500 text-teal-950 font-bold shadow-2xs"
                    : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700 font-medium"
                }`}
              >
                <input
                  type="radio"
                  name="satisfaction"
                  value={opt.value}
                  checked={satisfaction === opt.value}
                  onChange={() => setSatisfaction(opt.value)}
                  className="w-4 h-4 text-teal-600 focus:ring-teal-500 border-slate-300 accent-teal-600"
                />
                <span className="text-sm select-none">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Question 5: Well Organized */}
        <div className="space-y-3">
          <label className="block text-sm sm:text-base font-bold text-slate-900">
            5. Do you think the event was well organized? <span className="text-rose-500">*</span>
          </label>
          <div className="space-y-2 pt-1">
            {[
              { val: true, label: "Yes" },
              { val: false, label: "No" },
            ].map((opt) => (
              <label
                key={opt.label}
                className={`flex items-center gap-3.5 p-3.5 rounded-2xl border transition cursor-pointer ${
                  wellOrganized === opt.val
                    ? "bg-teal-50/70 border-teal-500 text-teal-950 font-bold shadow-2xs"
                    : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700 font-medium"
                }`}
              >
                <input
                  type="radio"
                  name="wellOrganized"
                  checked={wellOrganized === opt.val}
                  onChange={() => setWellOrganized(opt.val)}
                  className="w-4 h-4 text-teal-600 focus:ring-teal-500 border-slate-300 accent-teal-600"
                />
                <span className="text-sm select-none">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Question 6: Comments & Suggestions */}
        <div className="space-y-2.5">
          <label htmlFor="q6-comments" className="block text-sm sm:text-base font-bold text-slate-900">
            6. Comments/Suggestions for improvement <span className="text-rose-500">*</span>
          </label>
          <textarea
            id="q6-comments"
            required
            rows={3}
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Enter your answer"
            className="w-full px-4 py-3 rounded-2xl bg-slate-50/80 border border-slate-200 focus:bg-white focus:border-teal-600 focus:ring-4 focus:ring-teal-500/10 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition resize-y"
          />
        </div>

        {/* Form Actions Footer */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs text-slate-400 order-2 sm:order-1">
            Never submit passwords or sensitive credentials through this form.
          </span>

          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider transition shadow-md hover:shadow-teal-600/25 flex items-center justify-center gap-2 cursor-pointer order-1 sm:order-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Submitting Feedback...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Submit Response</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
