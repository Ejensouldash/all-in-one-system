"use client"

import { useState } from "react"
import { Sparkles, Loader2, AlertTriangle } from "lucide-react"
import { summarizeTicketWithAI } from "@/app/actions/ai"

export function AIAnalysisButton({ description }: { description: string }) {
  const [summaryHtml, setSummaryHtml] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState("")

  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    setError("")
    try {
      const res = await summarizeTicketWithAI(description)
      if (res.success) {
        setSummaryHtml(res.summary!)
      } else {
        setError(res.error || "Failed to analyze")
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsAnalyzing(false)
    }
  }

  if (summaryHtml) {
    return (
      <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-8 rounded-xl shadow-sm border border-indigo-100 relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
        <div className="flex items-center space-x-2 mb-6 border-b border-indigo-100/50 pb-4">
          <div className="bg-indigo-100 p-2 rounded-lg">
            <Sparkles className="h-5 w-5 text-indigo-600" />
          </div>
          <h3 className="font-bold text-indigo-900 text-lg">AI Helpdesk Copilot Analysis</h3>
        </div>
        <div 
          className="prose prose-sm sm:prose-base max-w-none text-gray-800 prose-headings:text-indigo-900 prose-li:marker:text-indigo-500"
          dangerouslySetInnerHTML={{ __html: summaryHtml }}
        />
      </div>
    )
  }

  return (
    <div className="bg-white p-8 rounded-xl shadow-sm border border-indigo-100 flex flex-col items-center justify-center text-center group hover:border-indigo-300 transition-colors">
      <div className="bg-indigo-50 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform">
        <Sparkles className="h-8 w-8 text-indigo-500" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">Long description?</h3>
      <p className="text-sm text-gray-500 mb-6 max-w-sm leading-relaxed">
        Use Gemini AI to instantly summarize the issue, extract key pain points, and suggest 3 troubleshooting steps.
      </p>
      
      {error && (
        <div className="flex items-center text-red-600 bg-red-50 px-4 py-2 rounded-lg text-sm mb-4 border border-red-100">
          <AlertTriangle className="h-4 w-4 mr-2" />
          {error}
        </div>
      )}

      <button 
        onClick={handleAnalyze}
        disabled={isAnalyzing}
        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-all shadow-md hover:shadow-lg flex items-center disabled:opacity-70 disabled:hover:shadow-none"
      >
        {isAnalyzing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
        {isAnalyzing ? "Analyzing with Gemini..." : "Analyze with AI Copilot"}
      </button>
    </div>
  )
}
