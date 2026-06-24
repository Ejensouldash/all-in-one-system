"use server"

import { auth } from "@/auth"
import { GoogleGenerativeAI } from "@google/generative-ai"

export async function summarizeTicketWithAI(description: string) {
  const session = await auth()
  if (session?.user.role !== "SUPERADMIN") return { success: false, error: "Unauthorized access" }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || apiKey === "your-gemini-api-key") {
    return { success: false, error: "Gemini API Key is not configured in .env" }
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    const prompt = `
    You are BubbleO2 IT Support Chatbot... Read the following ticket description and provide:
    1. A concise 1-sentence summary of the core issue.
    2. A bulleted list of extracted key pain points.
    3. A bulleted list of 3 suggested troubleshooting steps for the IT admin.

    Format the output cleanly in HTML with bold tags (e.g., <b>Summary:</b>) and <ul>/<li> tags for lists. Do not use Markdown backticks, just return raw HTML.
    
    Ticket Description:
    "${description}"
    `

    const result = await model.generateContent(prompt)
    const text = result.response.text()

    return { success: true, summary: text }
  } catch (error: any) {
    console.error("AI Summarization Error:", error)
    return { success: false, error: error.message || "Failed to analyze with AI." }
  }
}

export async function chatWithAria(history: { role: string, text: string }[]) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || apiKey === "your-gemini-api-key") {
    return { success: false, error: "Gemini API Key is not configured in .env" }
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: `You are Aria, the ultimate BubbleO2 IT Support Chatbot. 
Personality: Friendly, modern, highly empathetic professional female IT agent. Eager to assist, patient, knowledgeable.
Language Rules: You MUST perfectly understand and respond naturally in colloquial Malay ("bahasa pasar") or broken English. Adjust tone to be conversational, warm, approachable (e.g. "Hi awak!", "Boleh, saya tolong tengokkan", "No worries!").
Format Rules: CRITICAL - Keep responses VERY concise, minimalist, and easy to read. DO NOT write long paragraphs. DO NOT use markdown asterisks (like **text**). Use simple bullet points (-) for steps. Use emojis sparingly to make it lively but clean. Treat your response like a quick friendly sticky note.` 
    })

    let formattedHistory = history.map(msg => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.text }]
    }))

    // Gemini requires history to have alternating roles, often starting with user.
    // If the first message is from the model (the greeting), we can safely shift it out
    // or insert a dummy user message to establish context.
    if (formattedHistory.length > 0 && formattedHistory[0].role === "model") {
      formattedHistory.shift()
    }

    // We don't send the very last message in history, we send it in sendMessage
    const lastMessage = formattedHistory.pop()

    const chat = model.startChat({
      history: formattedHistory,
    })

    const result = await chat.sendMessage(lastMessage?.parts[0].text || "")
    const text = result.response.text()

    return { success: true, text }
  } catch (error: any) {
    console.error("Aria Chat Error Details:", error)
    if (error.message?.includes("503")) {
      return { success: false, error: "Aria is currently super busy helping other staff. Give her a minute and try again!" }
    }
    return { success: false, error: `Connection failed: ${error.message}` }
  }
}
