"use client"

import { useState, useRef, useEffect } from "react"
import { MessageSquare, X, Send, Sparkles } from "lucide-react"
import { chatWithAria } from "@/app/actions/ai"
import Image from "next/image"
import { AriaMarkdown } from "./AriaMarkdown"

type AvatarState = "idle" | "thinking" | "excited"

export function Chatbot({ hasProductionAccess = false }: { hasProductionAccess?: boolean }) {
  const [isOpen, setIsOpen] = useState(false)
  const [avatarState, setAvatarState] = useState<AvatarState>("idle")
  const [input, setInput] = useState("")
  const [isPending, setIsPending] = useState(false)
  const [messages, setMessages] = useState<{ role: "user" | "bot"; text: string; time: string }[]>([
    {
      role: "bot",
      text: hasProductionAccess
        ? "Hi! I'm **Aria**, pembantu BubblesO2 IT & Production. Saya boleh tolong selesaikan isu IT atau semak **storeroom balance**, rekod **transfer-in**, dan **daily production reports**. Ada apa yang saya boleh bantu? 🏭✨"
        : "Hi! I'm **Aria**, your BubblesO2 IT Support Assistant. Ada apa-apa masalah IT yang saya boleh bantu hari ini? 👩‍💻✨",
      time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
    },
  ])
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isPending])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isOpen])

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!input.trim() || isPending) return

    const userMessage = input.trim()
    const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    setInput("")
    
    const newHistory = [...messages, { role: "user" as const, text: userMessage, time: now }]
    setMessages(newHistory)
    
    setAvatarState("thinking")
    setIsPending(true)

    try {
      const response = await chatWithAria(newHistory.map(m => ({ role: m.role, text: m.text })))
      
      setIsPending(false)
      const replyTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      
      if (response.success) {
        setMessages(prev => [...prev, { role: "bot", text: response.text!, time: replyTime }])
        setAvatarState("excited")
        setTimeout(() => setAvatarState("idle"), 4000)
      } else {
        setMessages(prev => [...prev, { role: "bot", text: "Oops, " + response.error, time: replyTime }])
        setAvatarState("idle")
      }
    } catch (error: any) {
      setIsPending(false)
      const replyTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      setMessages(prev => [...prev, { role: "bot", text: "Maaf, connection Aria terputus. Boleh cuba sekali lagi? 😅", time: replyTime }])
      setAvatarState("idle")
    }
  }

  const getAvatarImage = () => {
    switch(avatarState) {
      case "thinking": return "/avatars/aria_thinking.png?v=2"
      case "excited": return "/avatars/aria_excited.png?v=2"
      case "idle":
      default: return "/avatars/aria_idle.png?v=2"
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

            <button 
              onClick={() => setIsOpen(false)} 
              className="relative z-10 text-slate-400 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-all"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          {/* ── Chat Messages ── */}
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
                      src="/avatars/aria_idle.png?v=2" 
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
                  <span className={`text-[9px] font-medium mt-1 px-1 ${msg.role === "user" ? "text-slate-400 text-right" : "text-slate-300"}`}>
                    {msg.time}
                  </span>
                </div>
              </div>
            ))}
            
            {/* Typing Indicator */}
            {isPending && (
              <div className="flex justify-start" style={{ animation: 'msgFadeIn 0.3s ease-out' }}>
                <div className="relative w-7 h-7 rounded-lg overflow-hidden shrink-0 mr-2 border border-indigo-100 shadow-sm self-end mb-1 bg-white">
                  <Image 
                    src="/avatars/aria_thinking.png?v=2" 
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
          
          {/* ── Input Area ── */}
          <div className="px-3 py-3 bg-white border-t border-slate-100 shrink-0">
            <form onSubmit={handleSend} className="relative">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Tanya Aria apa sahaja..."
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-xl py-3 pl-4 pr-12 text-sm transition-all outline-none placeholder:text-slate-400"
                disabled={isPending}
              />
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
          onClick={() => setIsOpen(true)}
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
