"use client"

import { useState, useRef, useEffect } from "react"
import { MessageSquare, X, Send, Bot, User } from "lucide-react"
import { chatWithAria } from "@/app/actions/ai"
import Image from "next/image"

type AvatarState = "idle" | "thinking" | "excited"

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [avatarState, setAvatarState] = useState<AvatarState>("idle")
  const [input, setInput] = useState("")
  const [isPending, setIsPending] = useState(false)
  const [messages, setMessages] = useState<{role: "user" | "bot", text: string}[]>([
    { role: "bot", text: "Hi! I'm Aria, your BubbleO2 IT Support Assistant. Ada apa-apa masalah IT yang saya boleh bantu hari ini? 👩‍💻✨" }
  ])
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!input.trim() || isPending) return

    const userMessage = input.trim()
    setInput("")
    
    // Add user message to UI
    const newHistory = [...messages, { role: "user" as const, text: userMessage }]
    setMessages(newHistory)
    
    // Switch avatar to thinking
    setAvatarState("thinking")
    setIsPending(true)

    // Call backend API
    try {
      const response = await chatWithAria(newHistory.map(m => ({ role: m.role, text: m.text })))
      
      setIsPending(false)
      
      if (response.success) {
        setMessages(prev => [...prev, { role: "bot", text: response.text! }])
        setAvatarState("excited")
        // Revert to idle after 4 seconds of being excited/talking
        setTimeout(() => {
          setAvatarState("idle")
        }, 4000)
      } else {
        setMessages(prev => [...prev, { role: "bot", text: "Oops, " + response.error }])
        setAvatarState("idle")
      }
    } catch (error: any) {
      setIsPending(false)
      setMessages(prev => [...prev, { role: "bot", text: "Maaf, connection Aria terputus. Boleh cuba sekali lagi? 😅" }])
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

  // Helper to safely render text formatting like bold from the AI if any, or just plain text
  const renderMessageText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return (
      <div className="whitespace-pre-wrap leading-relaxed space-y-1.5">
        {parts.map((part, i) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>
          }
          return <span key={i}>{part}</span>
        })}
      </div>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen ? (
        <div className="bg-white rounded-2xl shadow-2xl w-80 sm:w-96 overflow-hidden border border-gray-200 animate-in slide-in-from-bottom-5 fade-in duration-300 flex flex-col h-[600px] max-h-[80vh]">
          
          {/* Header & Avatar */}
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 p-4 text-white flex flex-col shadow-md relative shrink-0">
            <button onClick={() => setIsOpen(false)} className="absolute top-4 right-4 text-indigo-200 hover:text-white transition-colors">
              <X className="h-5 w-5" />
            </button>
            
            <div className="flex flex-col items-center justify-center space-y-2 mt-4 mb-2">
              <div className="relative w-28 h-28 rounded-2xl border-4 border-indigo-400 shadow-xl overflow-hidden bg-white">
                <Image 
                  src={getAvatarImage()} 
                  alt="Aria" 
                  fill 
                  className="object-cover object-top scale-110" 
                  sizes="112px"
                  unoptimized={true}
                />
              </div>
              <div className="text-center">
                <h3 className="font-bold text-lg leading-tight">Aria</h3>
                <p className="text-xs text-indigo-200 font-medium tracking-wide uppercase">BubbleO2 IT Support</p>
              </div>
            </div>
          </div>
          
          {/* Chat History */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "bot" && (
                  <div className="relative w-8 h-8 rounded-full overflow-hidden shrink-0 mr-2 border-2 border-white shadow-sm self-end mb-1">
                    <Image 
                      src={getAvatarImage()} 
                      alt="Aria" 
                      fill 
                      className="object-cover object-top" 
                      sizes="32px"
                      unoptimized={true}
                    />
                  </div>
                )}
                
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                  msg.role === "user" 
                  ? "bg-indigo-600 text-white rounded-br-none" 
                  : "bg-white text-gray-800 border border-gray-100 rounded-tl-none"
                }`}>
                  {renderMessageText(msg.text)}
                </div>
              </div>
            ))}
            
            {isPending && (
              <div className="flex justify-start items-center text-gray-400 space-x-2 pl-8">
                <span className="text-xs italic">Aria is thinking...</span>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
          
          {/* Input Area */}
          <div className="p-3 bg-white border-t border-gray-100 shrink-0">
            <form onSubmit={handleSend} className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Aria anything..."
                className="w-full bg-gray-100 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 rounded-full py-3 pl-4 pr-12 text-sm transition-all outline-none"
                disabled={isPending}
              />
              <button 
                type="submit"
                disabled={!input.trim() || isPending}
                className="absolute right-1.5 top-1.5 bottom-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-full p-2 transition-colors flex items-center justify-center shadow-sm"
              >
                <Send className="h-4 w-4 ml-0.5" />
              </button>
            </form>
          </div>

        </div>
      ) : (
        <button 
          onClick={() => setIsOpen(true)}
          className="bg-gradient-to-r from-indigo-600 to-indigo-800 hover:from-indigo-700 hover:to-indigo-900 text-white rounded-full p-4 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 group relative"
        >
          <div className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-pink-500"></span>
          </div>
          <MessageSquare className="h-6 w-6 group-hover:scale-110 transition-transform" />
        </button>
      )}
    </div>
  )
}
