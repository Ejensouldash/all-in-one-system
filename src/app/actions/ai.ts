"use server"

import { auth } from "@/auth"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { GEMINI_MODEL, geminiUserMessage, runGeminiRequest } from "@/lib/ai/gemini"
import { generateNvidiaText, hasNvidiaAi } from "@/lib/ai/nvidia"

const ARIA_SYSTEM_INSTRUCTION = `You are Aria, the ultimate BubblesO2 IT Support Chatbot.
Personality: Friendly, modern, highly empathetic professional female IT agent. Eager to assist, patient, knowledgeable.
Language Rules: You MUST perfectly understand and respond naturally in colloquial Malay ("bahasa pasar") or broken English. Adjust tone to be conversational, warm, approachable (e.g. "Hi awak!", "Boleh, saya tolong tengokkan", "No worries!").
Format Rules:
- Use **bold** for emphasis on important terms or actions.
- Use bullet points (-) or numbered lists (1. 2. 3.) for step-by-step guides.
- Use markdown tables (| Column | Column |) when comparing items, listing specifications, or presenting structured data.
- Keep responses concise and well-structured. Break content into short paragraphs.
- Use emojis sparingly to make it lively but professional.
- For troubleshooting steps, always use numbered lists.
- NEVER use code blocks unless discussing actual code or commands.`

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

  let nvidiaError: unknown
  if (hasNvidiaAi()) {
    try {
      const result = await generateNvidiaText([{ role: "user", content: prompt }], 2048)
      return { success: true, summary: result.value }
    } catch (error) {
      nvidiaError = error
      console.warn("NVIDIA ticket summarization failed; trying Gemini", error)
    }
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || apiKey === "your-gemini-api-key") {
    return { success: false, error: geminiUserMessage(nvidiaError, "Semua perkhidmatan AI tidak tersedia sekarang.") }
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

export async function chatWithAria(history: { role: string, text: string }[]) {
  const formattedHistory = history.map(msg => ({
    role: msg.role === "user" ? "user" as const : "assistant" as const,
    content: msg.text,
  }))

  if (formattedHistory.length > 0 && formattedHistory[0].role === "assistant") formattedHistory.shift()

  let nvidiaError: unknown
  if (hasNvidiaAi()) {
    try {
      const result = await generateNvidiaText([
        { role: "system", content: ARIA_SYSTEM_INSTRUCTION },
        ...formattedHistory,
      ], 4096)
      return { success: true, text: result.value }
    } catch (error) {
      nvidiaError = error
      console.warn("NVIDIA Aria chat failed; trying Gemini", error)
    }
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || apiKey === "your-gemini-api-key") {
    return { success: false, error: geminiUserMessage(nvidiaError, "Aria tidak dapat menjawab sekarang. Sila cuba lagi sebentar nanti.") }
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ 
      model: GEMINI_MODEL,
      systemInstruction: ARIA_SYSTEM_INSTRUCTION,
    })

    const geminiHistory = formattedHistory.map(message => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    }))
    const lastMessage = geminiHistory.pop()

    const chat = model.startChat({
      history: geminiHistory,
    })

    const result = await runGeminiRequest(() => chat.sendMessage(lastMessage?.parts[0].text || ""))
    const text = result.response.text()

    return { success: true, text }
  } catch (error: unknown) {
    console.error("Aria Chat Error Details:", error)
    return { success: false, error: geminiUserMessage(error, "Aria tidak dapat menjawab sekarang. Sila cuba lagi sebentar nanti.") }
  }
}
