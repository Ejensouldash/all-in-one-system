"use server"

import { prisma } from "@/lib/prisma"
import { getAccessInfo, canAccessProductionChatbot } from "@/lib/access"

// Chat history belongs to the production chatbot module. Every query is
// scoped to the caller's own userId, so not even a superadmin can open
// someone else's chats.
async function historyUserId() {
  const access = await getAccessInfo()
  return canAccessProductionChatbot(access) ? access!.userId : null
}

export async function listAriaChats() {
  const userId = await historyUserId()
  if (!userId) return { success: false as const, error: "Unauthorized" }

  const sessions = await prisma.ariaChatSession.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: { id: true, title: true, updatedAt: true },
  })

  return {
    success: true as const,
    sessions: sessions.map(s => ({ id: s.id, title: s.title, updatedAt: s.updatedAt.toISOString() })),
  }
}

export async function getAriaChat(id: string) {
  const userId = await historyUserId()
  if (!userId) return { success: false as const, error: "Unauthorized" }

  const session = await prisma.ariaChatSession.findFirst({
    where: { id, userId },
    select: {
      id: true,
      title: true,
      messages: {
        orderBy: { createdAt: "asc" },
        select: { role: true, text: true, createdAt: true },
      },
    },
  })
  if (!session) return { success: false as const, error: "Chat tidak dijumpai." }

  return {
    success: true as const,
    id: session.id,
    title: session.title,
    messages: session.messages.map(m => ({
      role: m.role === "user" ? ("user" as const) : ("bot" as const),
      text: m.text,
      createdAt: m.createdAt.toISOString(),
    })),
  }
}

export async function deleteAriaChat(id: string) {
  const userId = await historyUserId()
  if (!userId) return { success: false as const, error: "Unauthorized" }

  const { count } = await prisma.ariaChatSession.deleteMany({ where: { id, userId } })
  if (count === 0) return { success: false as const, error: "Chat tidak dijumpai." }
  return { success: true as const }
}
