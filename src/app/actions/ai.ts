"use server"

import { auth } from "@/auth"
import { GoogleGenerativeAI, SchemaType, type Tool } from "@google/generative-ai"
import { GEMINI_MODEL, geminiUserMessage, runGeminiRequest } from "@/lib/ai/gemini"
import { getAccessInfo, canAccessProductionChatbot } from "@/lib/access"
import { prisma } from "@/lib/prisma"
import {
  getStoreroomStock,
  getTransferInDeliveries,
  getDailyProductionSummary,
  getMalaysiaDateStr,
} from "@/lib/ai/production-tools"

const BASE_ARIA_INSTRUCTION = `You are Aria, the intelligent assistant for BubblesO2.
Personality: Friendly, modern, highly empathetic professional female assistant. Eager to assist, patient, knowledgeable.
Language Rules: You MUST perfectly understand and respond naturally in colloquial Malay ("bahasa pasar") or broken English. Adjust tone to be conversational, warm, approachable (e.g. "Hi awak!", "Boleh, saya tolong semakkan", "No worries!").
Format Rules:
- Use **bold** for emphasis on important numbers, DO numbers, batch numbers, or actions.
- Use bullet points (-) or numbered lists (1. 2. 3.) for step-by-step guides and summaries.
- Use clean markdown tables (| Column | Column |) when presenting inventory balances, DO lists, or comparison data.
- Keep responses concise, direct, and well-structured. Break content into short paragraphs.
- Use emojis sparingly to make it lively but professional (e.g. 📦, 🚚, 📊).`

const PRODUCTION_TOOLS: Tool[] = [
  {
    functionDeclarations: [
      {
        name: "getStoreroomStock",
        description: "Fetch live storeroom stock balance for raw materials (such as bottles 800ml/425ml, caps, labels, boxes/cartons) as of a given date (defaults to today).",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            itemFilter: {
              type: SchemaType.STRING,
              description: "Item name filter, e.g. 'bottle', '800ml', '425ml', 'cap', 'label', 'box'. Leave empty or 'ALL' for everything.",
            },
            date: {
              type: SchemaType.STRING,
              description: "Date in YYYY-MM-DD format. Default is today.",
            },
          },
        },
      },
      {
        name: "getTransferInDeliveries",
        description: "Fetch incoming raw material transfer-in (DO / deliveries) received on a specific date (defaults to today).",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            date: {
              type: SchemaType.STRING,
              description: "Date of delivery in YYYY-MM-DD format. Default is today.",
            },
            itemFilter: {
              type: SchemaType.STRING,
              description: "Optional item name filter, e.g. 'bottle', 'cap', 'box'.",
            },
          },
        },
      },
      {
        name: "getDailyProductionSummary",
        description: "Fetch daily production report insights including output quantities (boxes produced per SKU), scrap/reject counts, machine breakdowns, and report approval status.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            date: {
              type: SchemaType.STRING,
              description: "Date of the report in YYYY-MM-DD format. Default is today.",
            },
            line: {
              type: SchemaType.STRING,
              description: "Optional line filter, e.g. 'Line 1' or 'Line 2'.",
            },
          },
        },
      },
    ],
  },
]

// Older turns are dropped before calling Gemini so a long reopened chat
// doesn't keep growing the prompt.
const MAX_CONTEXT_MESSAGES = 20

// Saves one question + reply into the user's chat history and returns the
// session id. A sessionId that isn't the user's own starts a new session.
async function saveAriaExchange(
  userId: string,
  sessionId: string | null | undefined,
  question: string,
  reply: string,
  askedAt: Date,
) {
  const existing = sessionId
    ? await prisma.ariaChatSession.findFirst({ where: { id: sessionId, userId }, select: { id: true } })
    : null

  const session = existing
    ? await prisma.ariaChatSession.update({ where: { id: existing.id }, data: { updatedAt: new Date() }, select: { id: true } })
    : await prisma.ariaChatSession.create({
        data: { userId, title: question.replace(/\s+/g, " ").trim().slice(0, 60) || "Chat baru" },
        select: { id: true },
      })

  await prisma.ariaChatMessage.createMany({
    data: [
      { sessionId: session.id, role: "user", text: question, createdAt: askedAt },
      { sessionId: session.id, role: "bot", text: reply },
    ],
  })

  return session.id
}

export async function chatWithAria(history: { role: string, text: string }[], sessionId?: string | null) {
  const askedAt = new Date()
  const formattedHistory = history.slice(-MAX_CONTEXT_MESSAGES).map(msg => ({
    role: msg.role === "user" ? ("user" as const) : ("assistant" as const),
    content: msg.text,
  }))

  while (formattedHistory.length > 0 && formattedHistory[0].role === "assistant") {
    formattedHistory.shift()
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || apiKey === "your-gemini-api-key") {
    return {
      success: false,
      error: "Tetapan Gemini AI belum lengkap. Sila minta pentadbir menyemak GEMINI_API_KEY.",
    }
  }

  // Check module access server-side
  const access = await getAccessInfo()
  const hasProductionAccess = canAccessProductionChatbot(access)

  const todayStr = getMalaysiaDateStr()

  let systemInstruction = `${BASE_ARIA_INSTRUCTION}\nToday's date is: ${todayStr} (Malaysia time).\n`

  if (hasProductionAccess) {
    systemInstruction += `\nRole: Dual IT Support and Production Assistant.
You have live access to tools to query BubblesO2 database:
1. Storeroom raw material stock ('getStoreroomStock') for bottles, caps, labels, and cartons.
2. Transfer-In incoming delivery orders ('getTransferInDeliveries') for quantities received on any given date.
3. Daily production report performance ('getDailyProductionSummary') for produced boxes, line downtime, and scraps.
When the user asks questions such as "how much bottles are in the storeroom", "how much were delivered today", or questions about daily reports, call the respective tool first to get accurate figures before responding. Present the final quantities clearly with both bags/boxes and bottle pieces.`
  } else {
    systemInstruction += `\nRole: IT Support Assistant only.
If the user asks about production, storeroom balances, or transfer-in deliveries, politely explain that they do not currently have access to the 'Chatbot - Production' module, and encourage them to contact their system administrator to enable the toggle.`
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction,
      ...(hasProductionAccess ? { tools: PRODUCTION_TOOLS } : {}),
    })

    const geminiHistory = formattedHistory.map(message => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    }))
    const lastMessage = geminiHistory.pop()

    const chat = model.startChat({
      history: geminiHistory,
    })

    let result = await runGeminiRequest(() => chat.sendMessage(lastMessage?.parts[0].text || ""))
    let response = result.response

    // Handle tool execution loop (up to 3 turns)
    let functionCalls = response.functionCalls()
    let loopCount = 0

    while (hasProductionAccess && functionCalls && functionCalls.length > 0 && loopCount < 3) {
      loopCount++
      const call = functionCalls[0]
      let toolData: Record<string, unknown> = {}

      const args = (call.args || {}) as Record<string, string | undefined>
      if (call.name === "getStoreroomStock") {
        toolData = await getStoreroomStock(args)
      } else if (call.name === "getTransferInDeliveries") {
        toolData = await getTransferInDeliveries(args)
      } else if (call.name === "getDailyProductionSummary") {
        toolData = await getDailyProductionSummary(args)
      }

      result = await runGeminiRequest(() =>
        chat.sendMessage([
          {
            functionResponse: {
              name: call.name,
              response: toolData,
            },
          },
        ])
      )
      response = result.response
      functionCalls = response.functionCalls()
    }

    let text = ""
    try {
      text = response.text()
    } catch {
      text = "Maaf, Aria tidak dapat menghasilkan respons yang lengkap. Sila cuba lagi."
    }

    // Chat history is part of the production chatbot module. A failed save
    // must not lose the reply the user is waiting for.
    let savedSessionId: string | null = null
    if (hasProductionAccess && access && lastMessage) {
      try {
        savedSessionId = await saveAriaExchange(access.userId, sessionId, lastMessage.parts[0].text, text, askedAt)
      } catch (error) {
        console.error("Aria Chat History Save Error:", error)
        savedSessionId = sessionId ?? null
      }
    }

    return { success: true, text, sessionId: savedSessionId }
  } catch (error: unknown) {
    console.error("Aria Chat Error Details:", error)
    return {
      success: false,
      error: geminiUserMessage(error, "Aria tidak dapat menjawab sekarang. Sila cuba lagi sebentar nanti."),
    }
  }
}

export async function summarizeTicketWithAI(description: string) {
  const session = await auth()
  if (session?.user.role !== "SUPERADMIN") return { success: false, error: "Unauthorized access" }

  const prompt = `
    You are BubblesO2 IT Support Chatbot... Read the following ticket description and provide:
    1. A concise 1-sentence summary of the core issue.
    2. A bulleted list of extracted key pain points.
    3. A bulleted list of 3 suggested troubleshooting steps for the IT admin.

    Format the output cleanly in HTML with bold tags (e.g., <b>Summary:</b>) and <ul>/<li> tags for lists. Do not use Markdown backticks, just return raw HTML.
    
    Ticket Description:
    "${description}"
    `

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || apiKey === "your-gemini-api-key") {
    return { success: false, error: "Tetapan Gemini AI belum lengkap. Sila minta pentadbir menyemak GEMINI_API_KEY." }
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL })
    const result = await runGeminiRequest(() => model.generateContent(prompt))
    const text = result.response.text()

    return { success: true, summary: text }
  } catch (error: unknown) {
    console.error("AI Summarization Error:", error)
    return { success: false, error: geminiUserMessage(error, "AI gagal menganalisis tiket ini.") }
  }
}
