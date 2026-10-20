"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { GEMINI_MODEL, geminiUserMessage, runGeminiRequest } from "@/lib/ai/gemini"
import { revalidatePath } from "next/cache"

/**
 * Generate a comprehensive, professional Executive Project Report using Google Gemini.
 * Summarizes project objectives, timeline progress, financial BQ breakdown, UAT readiness, and recommendations.
 */
export async function generateNrhoProjectAiSummary(projectId: string) {
  try {
    const session = await auth()
    if (!session?.user) {
      return { success: false, error: "Unauthorized. Please sign in." }
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey || apiKey === "your-gemini-api-key") {
      return { success: false, error: "Gemini API key is not configured in server environment." }
    }

    const project = await prisma.nrhoProject.findUnique({
      where: { id: projectId },
      include: {
        bqItems: {
          orderBy: { orderIndex: "asc" },
        },
        tasks: {
          orderBy: [{ currentWeek: "asc" }, { createdAt: "asc" }],
          include: {
            rescheduleLogs: true,
          },
        },
        uatSessions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            items: true,
          },
        },
      },
    })

    if (!project) {
      return { success: false, error: "Project not found." }
    }

    const totalTasks = project.tasks.length
    const completedTasks = project.tasks.filter((t) => t.status === "COMPLETED").length
    const inProgressTasks = project.tasks.filter((t) => t.status === "IN_PROGRESS").length
    const delayedTasks = project.tasks.filter((t) => t.status === "DELAYED").length
    const pendingTasks = project.tasks.filter((t) => t.status === "PENDING").length
    const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    const totalBq = project.totalBqAmount || project.bqItems.reduce((acc, it) => acc + (it.amount || 0), 0)
    const bqCategories = Array.from(new Set(project.bqItems.map((it) => it.category)))

    const latestUat = project.uatSessions[0]
    const uatTotalItems = latestUat?.items.length || 0
    const uatPassedItems = latestUat?.items.filter((it) => it.testResult === "PASS").length || 0
    const uatFailedItems = latestUat?.items.filter((it) => it.testResult === "FAIL").length || 0

    const prompt = `
You are an expert Senior Project Manager and Technical Auditor at BubblesO2.
Generate an executive, professional, and well-structured Project Performance & Delivery Report in formal English.

Project Profile:
- Code: ${project.projectCode}
- Title: ${project.title}
- Department / Client: ${project.clientOrDepartment || "Internal"}
- Location: ${project.siteLocation || "BubblesO2 Facility"}
- Project Manager: ${project.projectManager || "Assigned PIC"}
- Schedule: ${project.startDate ? new Date(project.startDate).toLocaleDateString("en-US") : "TBD"} to ${project.targetCompletionDate ? new Date(project.targetCompletionDate).toLocaleDateString("en-US") : "TBD"}
- Current Status: ${project.status}

Timeline & Execution Metrics:
- Overall Physical Progress: ${progressPercent}%
- Total Tasks: ${totalTasks} (Completed: ${completedTasks}, In-Progress: ${inProgressTasks}, Delayed: ${delayedTasks}, Pending: ${pendingTasks})
- Rescheduled tasks / delay justifications recorded: ${project.tasks.filter((t) => t.rescheduleLogs.length > 0).length}

Bill of Quantities (BQ) Financial Overview:
- Total Budgeted / Estimated Amount: RM ${totalBq.toLocaleString("en-US", { minimumFractionDigits: 2 })}
- Number of Line Items: ${project.bqItems.length}
- Major Categories: ${bqCategories.join(", ") || "General Works"}

User Acceptance Testing (UAT) Overview:
- Overall UAT Status: ${latestUat?.overallResult || "Pending Testing"}
- Tested Checklist Items: ${uatTotalItems} (Passed: ${uatPassedItems}, Failed: ${uatFailedItems})

Format the output strictly with the following clear markdown sections:
### 1. Executive Summary
Brief high-level appraisal of the project's strategic objectives, scope, and current health status.

### 2. Timeline & Schedule Velocity
Detailed assessment of execution pace, milestones reached, delays/rescheduled tasks, and estimated completion timeline.

### 3. Financial & BQ Budget Analysis
Evaluation of the Bill of Quantities breakdown, trade allocations, and cost efficiency.

### 4. Quality & UAT Verification Status
Review of deliverable testing, installation verification, and operational readiness.

### 5. Risk Management & Key Recommendations
3-4 prioritized actionable recommendations for management to ensure flawless handover and operational stability.

Keep the language clear, authoritative, professional, and concise. Do not use generic filler words. Everything must be in English.
`

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL })

    const result = await runGeminiRequest(async () => {
      return await model.generateContent(prompt)
    })

    const aiSummary = result.response.text()

    // Save summary directly into the project
    await prisma.nrhoProject.update({
      where: { id: projectId },
      data: {
        aiSummary,
        aiGeneratedAt: new Date(),
      },
    })

    revalidatePath(`/nrho-project/${projectId}`)

    return {
      success: true,
      aiSummary,
      generatedAt: new Date().toISOString(),
    }
  } catch (err: any) {
    console.error("generateNrhoProjectAiSummary error:", err)
    return {
      success: false,
      error: geminiUserMessage(err, "Failed to generate AI project summary."),
    }
  }
}

/**
 * Manually update or refine the AI summary / executive notes
 */
export async function updateNrhoProjectAiSummary(projectId: string, aiSummary: string) {
  try {
    const session = await auth()
    if (!session?.user) {
      return { success: false, error: "Unauthorized" }
    }

    await prisma.nrhoProject.update({
      where: { id: projectId },
      data: {
        aiSummary,
        aiGeneratedAt: new Date(),
      },
    })

    revalidatePath(`/nrho-project/${projectId}`)
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update project summary." }
  }
}
