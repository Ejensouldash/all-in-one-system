"use client"

import { useState, useRef, useEffect } from "react"
import { MessageSquare, X, Send, History, SquarePen, Volume2, VolumeX, Mic, Square, Loader2 } from "lucide-react"
import { chatWithAria } from "@/app/actions/ai"
import { getAriaChat } from "@/app/actions/ariaChat"
import Image from "next/image"
import { AriaMarkdown } from "./AriaMarkdown"
import { ChatHistoryPanel } from "./ChatHistoryPanel"
import { useAriaVoice } from "./useAriaVoice"
import { useSpeechInput } from "./useSpeechInput"

type AvatarState = "idle" | "thinking" | "excited" | "apologetic" | "greeting"
type ChatMessage = { role: "user" | "bot"; text: string; time: string }

const timeOf = (date = new Date()) => date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })

// Reopened chats can be days old, so show the date for anything not from today.
const stampOf = (iso: string) => {
  const date = new Date(iso)
  if (date.toDateString() === new Date().toDateString()) return timeOf(date)
  return `${date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}, ${timeOf(date)}`
}

const greetingMessage = (hasProductionAccess: boolean): ChatMessage => ({
  role: "bot",
  text: hasProductionAccess
    ? "Hi! I'm **Aria**, pembantu BubblesO2 IT & Production. Saya boleh tolong selesaikan isu IT atau semak **storeroom balance**, rekod **transfer-in**, dan **daily production reports**. Ada apa yang saya boleh bantu? 🏭✨"
    : "Hi! I'm **Aria**, your BubblesO2 IT Support Assistant. Ada apa-apa masalah IT yang saya boleh bantu hari ini? 👩‍💻✨",
  time: timeOf(),
})

export function Chatbot({ hasProductionAccess = false }: { hasProductionAccess?: boolean }) {
  const [isOpen, setIsOpen] = useState(false)
  const [avatarState, setAvatarState] = useState<AvatarState>("idle")
  const [input, setInput] = useState("")
  const [isPending, setIsPending] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>(() => [greetingMessage(hasProductionAccess)])
  // Chat history (CHATBOT_PRODUCTION / superadmin only): the saved session the
  // current conversation belongs to, and whether the history list is showing.
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [loadingChat, setLoadingChat] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)

  const voice = useAriaVoice()
  const speech = useSpeechInput(setInput)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const avatarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Show a pose, optionally reverting to idle afterwards. Clears any pending
  // revert so an old timer can't override a newer pose (e.g. thinking).
  const showAvatar = (state: AvatarState, revertAfterMs?: number) => {
    if (avatarTimerRef.current) clearTimeout(avatarTimerRef.current)
    avatarTimerRef.current = null
    setAvatarState(state)
    if (revertAfterMs) {
      avatarTimerRef.current = setTimeout(() => setAvatarState("idle"), revertAfterMs)
    }
  }

  useEffect(() => () => {
    if (avatarTimerRef.current) clearTimeout(avatarTimerRef.current)
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isPending, showHistory])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isOpen])

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!input.trim() || isPending) return

    speech.stop()
    voice.stop()
    const userMessage = input.trim()
    setInput("")

    const newHistory = [...messages, { role: "user" as const, text: userMessage, time: timeOf() }]
    setMessages(newHistory)

    showAvatar("thinking")
    setIsPending(true)

    try {
      const response = await chatWithAria(newHistory.map(m => ({ role: m.role, text: m.text })), sessionId)

      setIsPending(false)
      const replyTime = timeOf()

      if (response.success) {
        setMessages(prev => [...prev, { role: "bot", text: response.text!, time: replyTime }])
        if (response.sessionId) setSessionId(response.sessionId)
        showAvatar("excited", 4000)
        if (voice.autoSpeak) void voice.speak(`msg-${newHistory.length}`, response.text!)
      } else {
        setMessages(prev => [...prev, { role: "bot", text: "Oops, " + response.error, time: replyTime }])
        showAvatar("apologetic", 4000)
      }
    } catch {
      setIsPending(false)
      setMessages(prev => [...prev, { role: "bot", text: "Maaf, connection Aria terputus. Boleh cuba sekali lagi? 😅", time: timeOf() }])
      showAvatar("apologetic", 4000)
    }
  }

  const startNewChat = () => {
    voice.stop()
    speech.stop()
    setMessages([greetingMessage(hasProductionAccess)])
    setSessionId(null)
    setShowHistory(false)
    setHistoryError(null)
    showAvatar("greeting", 3000)
  }

  const openChat = async (id: string) => {
    voice.stop()
    setLoadingChat(true)
    setHistoryError(null)
    const res = await getAriaChat(id).catch(() => null)
    setLoadingChat(false)
    if (!res?.success) {
      setHistoryError(res?.error || "Gagal membuka chat.")
      return
    }
    setMessages(res.messages.map(m => ({ role: m.role, text: m.text, time: stampOf(m.createdAt) })))
    setSessionId(res.id)
    setShowHistory(false)
  }

  const handleChatDeleted = (id: string) => {
    if (id !== sessionId) return
    voice.stop()
    setMessages([greetingMessage(hasProductionAccess)])
    setSessionId(null)
  }

  const closeChat = () => {
    voice.stop()
    speech.stop()
    setIsOpen(false)
  }

  const statusMessage = historyError || voice.error || speech.error

  const getAvatarImage = () => {
    switch(avatarState) {
      case "thinking": return "/avatars/aria_thinking.png?v=3"
      case "excited": return "/avatars/aria_excited.png?v=3"
      case "apologetic": return "/avatars/aria_apologetic.png?v=3"
      case "greeting": return "/avatars/aria_greeting.png?v=3"
      case "idle":
      default: return "/avatars/aria_idle.png?v=3"
    }
  }

  const quickActions = hasProductionAccess
  ? [
    "Berapa baki botol dalam storeroom?",
    "Berapa banyak barang transfer-in masuk hari ini?",
    "Ringkasan laporan production semalam",
    "Laptop saya slow / Masalah IT lain",
  ]
: [
    "Laptop saya slow",
    "Tak boleh print",
    "WiFi problem",
    "Password reset"
  ]

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-end">
      {isOpen ? (
        <div className="flex items-end gap-2">

          <div 
            className="bg-white rounded-2xl shadow-2xl w-[360px] sm:w-[420px] overflow-hidden border border-slate-200/80 flex flex-col h-[640px] max-h-[85vh] relative z-20"
            style={{ animation: 'chatSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}
          >
          
          {/* ── Compact Header ── */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-4 py-3 flex items-center gap-3 shrink-0 relative overflow-hidden">
            {/* Subtle shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent" style={{ animation: 'shimmer 3s infinite' }} />
            
            <div className="relative w-10 h-10 rounded-xl overflow-hidden border-2 border-indigo-400/50 shadow-lg shadow-indigo-500/20 shrink-0 bg-white">
              <Image 
                src={getAvatarImage()} 
                alt="Aria" 
                fill 
                className="object-cover object-top scale-110" 
                sizes="40px"
                unoptimized={true}
              />
            </div>
            
            <div className="flex-1 min-w-0 relative z-10">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-sm">Aria</h3>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                </span>
              </div>
                <p className="text-[10px] text-indigo-300 font-medium tracking-wider uppercase">
                  {isPending
                  ? "Typing..."
                  : hasProductionAccess
                  ? "BubblesO2 IT & Production · Online"
                  : "BubblesO2 IT Support · Online"}
                </p>
            </div>

            <div className="relative z-10 flex items-center gap-0.5">
              {hasProductionAccess && (
                <>
                  <button
                    onClick={() => { setHistoryError(null); setShowHistory(v => !v) }}
                    disabled={isPending}
                    title="Sejarah chat"
                    aria-label="Sejarah chat"
                    className={`p-1.5 rounded-lg transition-all disabled:opacity-40 ${showHistory ? "text-white bg-white/15" : "text-slate-400 hover:text-white hover:bg-white/10"}`}
                  >
                    <History className="h-4 w-4" />
                  </button>
                  <button
                    onClick={startNewChat}
                    disabled={isPending}
                    title="Chat baru"
                    aria-label="Chat baru"
                    className="text-slate-400 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-all disabled:opacity-40"
                  >
                    <SquarePen className="h-4 w-4" />
                  </button>
                </>
              )}
              <button
                onClick={() => voice.setAutoSpeak(!voice.autoSpeak)}
                title={voice.autoSpeak ? "Matikan suara automatik Aria" : "Aria baca jawapan secara automatik"}
                aria-label="Suara automatik"
                aria-pressed={voice.autoSpeak}
                className={`p-1.5 rounded-lg transition-all ${voice.autoSpeak ? "text-emerald-300 bg-white/10" : "text-slate-400 hover:text-white hover:bg-white/10"}`}
              >
                {voice.autoSpeak ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>
              <button
                onClick={closeChat}
                aria-label="Tutup chat"
                className="text-slate-400 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {loadingChat && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/60 backdrop-blur-[1px]">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
            </div>
          )}

          {/* ── Chat Messages / History ── */}
          {showHistory ? (
            <ChatHistoryPanel
              activeSessionId={sessionId}
              onOpen={openChat}
              onDeleted={handleChatDeleted}
              onBack={() => setShowHistory(false)}
            />
          ) : (
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gradient-to-b from-slate-50 to-white">
            
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                style={{ animation: 'msgFadeIn 0.3s ease-out' }}
              >
                {msg.role === "bot" && (
                  <div className="relative w-7 h-7 rounded-lg overflow-hidden shrink-0 mr-2 border border-indigo-100 shadow-sm self-end mb-5 bg-white">
                    <Image 
                      src="/avatars/aria_idle.png?v=3"
                      alt="Aria" 
                      fill 
                      className="object-cover object-top" 
                      sizes="28px"
                      unoptimized={true}
                    />
                  </div>
                )}
                
                <div className="flex flex-col max-w-[80%]">
                  <div className={`rounded-2xl px-4 py-3 text-[13px] leading-relaxed shadow-sm ${
                    msg.role === "user" 
                    ? "bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-br-md" 
                    : "bg-white text-slate-700 border border-slate-100 rounded-tl-md"
                  }`}>
                    {msg.role === "bot" ? (
                      <AriaMarkdown>{msg.text}</AriaMarkdown>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    )}
                  </div>
                  {msg.role === "user" ? (
                    <span className="text-[9px] font-medium mt-1 px-1 text-slate-400 text-right">{msg.time}</span>
                  ) : (
                    <div className="flex items-center gap-1.5 mt-1 px-1">
                      <span className="text-[9px] font-medium text-slate-300">{msg.time}</span>
                      <button
                        onClick={() => voice.toggle(`msg-${idx}`, msg.text)}
                        title={voice.speakingKey === `msg-${idx}` ? "Berhenti" : "Dengar Aria"}
                        aria-label={voice.speakingKey === `msg-${idx}` ? "Berhenti" : "Dengar Aria"}
                        className={`rounded-md p-0.5 transition-all ${
                          voice.speakingKey === `msg-${idx}` || voice.loadingKey === `msg-${idx}`
                            ? "text-indigo-500"
                            : "text-slate-300 hover:text-indigo-500"
                        }`}
                      >
                        {voice.loadingKey === `msg-${idx}` ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : voice.speakingKey === `msg-${idx}` ? (
                          <Square className="h-3 w-3 fill-current" />
                        ) : (
                          <Volume2 className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {/* Typing Indicator */}
            {isPending && (
              <div className="flex justify-start" style={{ animation: 'msgFadeIn 0.3s ease-out' }}>
                <div className="relative w-7 h-7 rounded-lg overflow-hidden shrink-0 mr-2 border border-indigo-100 shadow-sm self-end mb-1 bg-white">
                  <Image 
                    src="/avatars/aria_thinking.png?v=3"
                    alt="Aria Thinking" 
                    fill 
                    className="object-cover object-top" 
                    sizes="28px"
                    unoptimized={true}
                  />
                </div>
                <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-md px-5 py-3 shadow-sm">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-indigo-400 rounded-full" style={{ animation: 'typingBounce 1.4s ease-in-out infinite' }} />
                    <span className="w-2 h-2 bg-indigo-400 rounded-full" style={{ animation: 'typingBounce 1.4s ease-in-out 0.2s infinite' }} />
                    <span className="w-2 h-2 bg-indigo-400 rounded-full" style={{ animation: 'typingBounce 1.4s ease-in-out 0.4s infinite' }} />
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions — show only at the start */}
            {messages.length === 1 && !isPending && (
              <div className="flex flex-wrap gap-2 pt-1" style={{ animation: 'msgFadeIn 0.5s ease-out' }}>
                {quickActions.map((action) => (
                  <button
                    key={action}
                    onClick={() => { setInput(action); }}
                    className="text-[11px] font-semibold px-3 py-1.5 rounded-full border border-indigo-200 text-indigo-600 bg-indigo-50/50 hover:bg-indigo-100 hover:border-indigo-300 transition-all"
                  >
                    {action}
                  </button>
                ))}
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
          )}

          {/* ── Input Area ── */}
          <div className="px-3 py-3 bg-white border-t border-slate-100 shrink-0">
            {statusMessage && (
              <p className="mb-2 rounded-lg bg-rose-50 px-3 py-1.5 text-[11px] font-semibold text-rose-700">{statusMessage}</p>
            )}
            <form onSubmit={handleSend} className="relative">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={speech.listening ? "Aria sedang mendengar..." : "Tanya Aria apa sahaja..."}
                className={`w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-xl py-3 pl-4 text-sm transition-all outline-none placeholder:text-slate-400 ${speech.supported ? "pr-[5.5rem]" : "pr-12"}`}
                disabled={isPending}
              />
              {speech.supported && (
                <button
                  type="button"
                  onClick={() => (speech.listening ? speech.stop() : speech.start(input))}
                  disabled={isPending}
                  title={speech.listening ? "Berhenti mendengar" : "Cakap dengan Aria"}
                  aria-label={speech.listening ? "Berhenti mendengar" : "Cakap dengan Aria"}
                  className={`absolute right-12 top-1.5 bottom-1.5 rounded-lg p-2.5 transition-all flex items-center justify-center disabled:opacity-40 ${
                    speech.listening
                      ? "bg-rose-500 text-white animate-pulse"
                      : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                  }`}
                >
                  <Mic className="h-4 w-4" />
                </button>
              )}
              <button 
                type="submit"
                disabled={!input.trim() || isPending}
                className="absolute right-1.5 top-1.5 bottom-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:cursor-not-allowed text-white rounded-lg p-2.5 transition-all flex items-center justify-center shadow-sm disabled:shadow-none"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
            <p className="text-center text-[9px] text-slate-300 font-medium mt-2 tracking-wide">Powered by Gemini AI · BubblesO2 2026</p>
          </div>
          </div>
        </div>
      ) : (
        <button 
          onClick={() => {
            setIsOpen(true)
            if (!isPending) showAvatar("greeting", 3000)
          }}
          className="bg-gradient-to-br from-slate-900 to-indigo-900 hover:from-indigo-800 hover:to-indigo-900 text-white rounded-2xl p-4 shadow-xl hover:shadow-2xl hover:shadow-indigo-500/20 transition-all hover:-translate-y-1 group relative"
        >
          <div className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400"></span>
          </div>
          <MessageSquare className="h-6 w-6 group-hover:scale-110 transition-transform" />
        </button>
      )}

      {/* ── Animations ── */}
      <style jsx global>{`
        @keyframes chatSlideUp {
          0% { opacity: 0; transform: translateY(20px) scale(0.96); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes msgFadeIn {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  )
}
