"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getAccessInfo, canAccessMarketingEvents } from "@/lib/access"
import {
  SENTIMENT_BATCH_SIZE,
  SENTIMENT_MODEL,
  analyzeFeedbackBatch,
  buildFeedbackText,
  chunkArray,
  feedbackTextHash,
} from "@/lib/marketing/feedback-sentiment"
import { recomputeEventScore } from "@/lib/marketing/event-success-rate-server"
import type { EventScoreBreakdown, SentimentLabel } from "@/lib/marketing/event-success-rate"

export interface SentimentAnalysisResult {
  success: boolean
  analyzed: number
  skipped: number
  failed: number
  error?: string
  breakdown: EventScoreBreakdown | null
  feedbacks: Array<{
    id: string
    aiSentiment: string | null
    aiReason: string | null
    aiConfidence: number | null
  }>
}

/**
 * Runs (or re-runs) Gemini sentiment classification for every participant response that is
 * missing a classification or whose free text changed. Responses already analysed with the
 * same text hash are skipped to control API cost.
 */
export async function runFeedbackSentimentAnalysis(
  requisitionId: string,
  options?: { force?: boolean }
): Promise<SentimentAnalysisResult> {
  const empty: SentimentAnalysisResult = {
    success: false,
    analyzed: 0,
    skipped: 0,
    failed: 0,
    breakdown: null,
    feedbacks: [],
  }

  try {
    const access = await getAccessInfo()
    if (!canAccessMarketingEvents(access)) {
      return { ...empty, error: "You do not have permission to analyse this event feedback." }
    }

    const requisition = await prisma.marketingEventRequisition.findUnique({
      where: { id: requisitionId },
      select: { id: true },
    })

    if (!requisition) {
      return { ...empty, error: "Event requisition not found." }
    }

    const feedbacks = await prisma.marketingEventFeedback.findMany({
      where: { requisitionId },
      orderBy: { createdAt: "asc" },
    })

    if (feedbacks.length === 0) {
      return { ...empty, error: "No feedback responses to analyse yet." }
    }

    const force = options?.force === true

    const candidates = feedbacks
      .map((feedback) => {
        const text = buildFeedbackText(feedback)
        return { feedback, text, hash: feedbackTextHash(text) }
      })
      .filter((candidate) => candidate.text.length > 0)

    const pending = candidates.filter(
      (candidate) =>
        (force ||
          !candidate.feedback.aiSentiment ||
          candidate.feedback.aiTextHash !== candidate.hash) &&
        candidate.feedback.aiModel !== "MANUAL"
    )

    const emptyTextCount = feedbacks.length - candidates.length
    const skipped = feedbacks.length - pending.length - emptyTextCount

    let analyzed = 0
    let failed = 0
    let firstError: string | undefined

    for (const batch of chunkArray(pending, SENTIMENT_BATCH_SIZE)) {
      const inputs = batch.map((candidate, index) => ({ index: index + 1, text: candidate.text }))

      try {
        const results = await analyzeFeedbackBatch(inputs)

        await Promise.all(
          results.map((result) => {
            const candidate = batch[result.index - 1]
            if (!candidate) return Promise.resolve(null)
            return prisma.marketingEventFeedback.update({
              where: { id: candidate.feedback.id },
              data: {
                aiSentiment: result.sentiment,
                aiConfidence: result.confidence,
                aiReason: result.reason || null,
                aiModel: SENTIMENT_MODEL,
                aiTextHash: candidate.hash,
                aiAnalyzedAt: new Date(),
              },
            })
          })
        )

        analyzed += results.length
        failed += batch.length - results.length
      } catch (error) {
        failed += batch.length
        if (!firstError) {
          firstError = error instanceof Error ? error.message : "Gemini analysis failed."
        }
      }
    }

    const breakdown = await recomputeEventScore(requisitionId)

    const updated = await prisma.marketingEventFeedback.findMany({
      where: { requisitionId },
      select: { id: true, aiSentiment: true, aiReason: true, aiConfidence: true },
    })

    try {
      revalidatePath("/marketing/events")
    } catch {
      // safe fallback outside request scope
    }

    return {
      success: analyzed > 0,
      analyzed,
      skipped,
      failed,
      error:
        analyzed === 0
          ? firstError || "Gemini did not return a usable classification. Please try again."
          : undefined,
      breakdown,
      feedbacks: updated,
    }
  } catch (error) {
    console.error("Error in runFeedbackSentimentAnalysis:", error)
    return {
      ...empty,
      error: error instanceof Error ? error.message : "Failed to analyse participant feedback.",
    }
  }
}

/**
 * Manually updates the sentiment classification (GOOD, NEUTRAL, BAD) for a single feedback item.
 * Sets aiModel to 'MANUAL' so future automated runs won't overwrite the user's manual classification.
 */
export async function updateFeedbackSentiment(
  feedbackId: string,
  sentiment: SentimentLabel
): Promise<{
  success: boolean
  error?: string
  feedback?: {
    id: string
    aiSentiment: string | null
    aiReason: string | null
    aiConfidence: number | null
  }
  breakdown?: EventScoreBreakdown | null
}> {
  try {
    const access = await getAccessInfo()
    if (!canAccessMarketingEvents(access)) {
      return { success: false, error: "You do not have permission to update feedback classification." }
    }

    if (sentiment !== "GOOD" && sentiment !== "NEUTRAL" && sentiment !== "BAD") {
      return { success: false, error: "Invalid sentiment value." }
    }

    const feedback = await prisma.marketingEventFeedback.findUnique({
      where: { id: feedbackId },
      select: { id: true, requisitionId: true, comments: true },
    })

    if (!feedback) {
      return { success: false, error: "Feedback entry not found." }
    }

    const text = buildFeedbackText(feedback)
    const hash = feedbackTextHash(text)

    const updated = await prisma.marketingEventFeedback.update({
      where: { id: feedbackId },
      data: {
        aiSentiment: sentiment,
        aiConfidence: 1.0,
        aiReason: "Manually classified",
        aiModel: "MANUAL",
        aiTextHash: hash,
        aiAnalyzedAt: new Date(),
      },
      select: {
        id: true,
        aiSentiment: true,
        aiReason: true,
        aiConfidence: true,
      },
    })

    const breakdown = await recomputeEventScore(feedback.requisitionId)

    try {
      revalidatePath("/marketing/events")
    } catch {
      // safe fallback
    }

    return {
      success: true,
      feedback: updated,
      breakdown,
    }
  } catch (error) {
    console.error("Error updating feedback sentiment:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update feedback classification.",
    }
  }
}
