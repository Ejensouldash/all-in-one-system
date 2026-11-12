"use client"

import React from "react"
import { AlertTriangle, Info } from "lucide-react"
import {
  EVENT_SUCCESS_WEIGHTS,
  SCORE_FLAG_LABELS,
  formatScore,
  type EventScoreBreakdown,
} from "@/lib/marketing/event-success-rate"

interface EventSuccessScoreCardProps {
  breakdown: EventScoreBreakdown
  className?: string
}

export function EventSuccessScoreCard({ breakdown, className = "" }: EventSuccessScoreCardProps) {
  const { satisfaction, impact, budget, suggestion } = breakdown.components

  const components = [
    {
      key: "satisfaction",
      label: "Public Feedback Satisfaction",
      weight: EVENT_SUCCESS_WEIGHTS.satisfaction,
      earned: satisfaction.earned,
      bar: "bg-teal-500",
      detail:
        satisfaction.responses > 0
          ? `${satisfaction.responses} response(s) · satisfaction index ${formatScore(satisfaction.index)}/100`
          : "No feedback responses yet",
    },
    {
      key: "impact",
      label: "Expected Impact & Stock Distribution",
      weight: EVENT_SUCCESS_WEIGHTS.impact,
      earned: impact.earned,
      bar: "bg-sky-500",
      detail:
        impact.given > 0
          ? `Water ${formatScore(impact.waterUtilisation ?? 0)}% · Merch ${formatScore(impact.merchandiseUtilisation ?? 0)}% · ${formatScore(impact.achievement)}% achieved`
          : "No stock / impact items recorded",
    },
    {
      key: "budget",
      label: "Budget Performance (Finance & Claims)",
      weight: EVENT_SUCCESS_WEIGHTS.budget,
      earned: budget.earned,
      bar: "bg-amber-500",
      detail:
        budget.cap === null
          ? "Approved category budgets not set"
          : `RM ${budget.claims.toFixed(2)} claimed of RM ${budget.cap.toFixed(2)} budget · ${budget.totalCategoryScore ?? 0}/100 pts`,
    },
    {
      key: "suggestion",
      label: "Participants' Feedback Sentiment (Gemini)",
      weight: EVENT_SUCCESS_WEIGHTS.suggestion,
      earned: suggestion.earned,
      bar: "bg-violet-500",
      detail:
        suggestion.analyzed > 0
          ? `${suggestion.good} good · ${suggestion.neutral} neutral · ${suggestion.bad} bad`
          : suggestion.responses > 0
            ? "Analysis pending"
            : "No feedback responses yet",
    },
  ]

  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-4 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
            14. Event Success Rate
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Calculated automatically from four weighted components.
          </p>
        </div>
        <div className="text-right shrink-0">
          <span className="text-3xl font-black text-teal-800 font-mono leading-none">
            {formatScore(breakdown.total)}%
          </span>
          <span className="block text-[10px] font-bold text-slate-400 mt-0.5">of 100 points</span>
        </div>
      </div>

      <div className="mt-3 space-y-2.5">
        {components.map((component) => (
          <div key={component.key}>
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="font-bold text-slate-700">
                {component.label}{" "}
                <span className="text-slate-400 font-semibold">({component.weight}%)</span>
              </span>
              <span className="font-mono font-bold text-slate-800 shrink-0">
                {formatScore(component.earned)} / {component.weight}
              </span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full ${component.bar} transition-all duration-300`}
                style={{
                  width: `${Math.min(100, (component.earned / component.weight) * 100)}%`,
                }}
              />
            </div>
            <p className="mt-0.5 text-[10px] text-slate-400">{component.detail}</p>
          </div>
        ))}
      </div>

      {breakdown.flags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {breakdown.flags.map((flag) => (
            <span
              key={flag}
              className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800"
            >
              <AlertTriangle className="w-3 h-3 shrink-0" />
              {SCORE_FLAG_LABELS[flag]}
            </span>
          ))}
        </div>
      )}

      <p className="mt-3 flex items-center gap-1 text-[10px] text-slate-400">
        <Info className="w-3 h-3 shrink-0" />
        Recalculated on the server whenever the report is saved; submitting freezes the score.
      </p>
    </section>
  )
}
