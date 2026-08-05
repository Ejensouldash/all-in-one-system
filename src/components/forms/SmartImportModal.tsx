"use client"

import { useState } from "react"
import { CheckCircle2, Sparkles, AlertCircle, RefreshCw } from "lucide-react"

interface SmartImportModalProps {
  isOpen: boolean
  isProcessing: boolean
  previewData: any[]
  onConfirm: () => void
  onCancel: () => void
  isConfirming: boolean
}

export function SmartImportModal({ isOpen, isProcessing, previewData, onConfirm, onCancel, isConfirming }: SmartImportModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-300">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-500 to-emerald-600 px-8 py-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-white opacity-10 rounded-full blur-3xl"></div>
          <h2 className="text-2xl font-black flex items-center gap-3">
            <Sparkles className="w-6 h-6" />
            Smart AI Asset Import
          </h2>
          <p className="text-teal-50 mt-1 opacity-90 font-medium">
            Powered by NVIDIA Kimi · Gemini fallback
          </p>
        </div>

        {/* Body */}
        <div className="p-8 overflow-y-auto flex-1 bg-slate-50">
          
          {isProcessing ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-teal-400 blur-xl opacity-20 rounded-full animate-pulse"></div>
                <div className="w-24 h-24 border-4 border-teal-100 border-t-teal-500 rounded-full animate-spin"></div>
                <Sparkles className="absolute inset-0 m-auto text-teal-500 animate-bounce w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-2">AI is analyzing your Excel file...</h3>
              <p className="text-slate-500 font-medium max-w-sm text-center">
                Gemini is mapping columns, detecting categories, and structuring your assets automatically. This might take a few seconds for cute perfection! 💖
              </p>
            </div>
          ) : previewData.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-800">No Assets Found</h3>
              <p className="text-slate-500">The AI couldn't find any valid assets in your file.</p>
            </div>
          ) : (
            <div className="animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-teal-100 text-teal-700 px-3 py-1 rounded-full text-sm font-bold flex items-center">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {previewData.length} Assets Mapped
                </div>
                <p className="text-slate-500 text-sm font-medium">Please review the AI's mapping before confirming.</p>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto max-h-[40vh]">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 font-bold text-slate-600">Asset Name</th>
                        <th className="px-4 py-3 font-bold text-slate-600">Department</th>
                        <th className="px-4 py-3 font-bold text-slate-600">Category</th>
                        <th className="px-4 py-3 font-bold text-slate-600">Brand / Model</th>
                        <th className="px-4 py-3 font-bold text-slate-600">Serial No</th>
                        <th className="px-4 py-3 font-bold text-slate-600">Assignee</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-teal-50/30 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-800">{row.name || <span className="text-rose-400 italic">Unknown</span>}</td>
                          <td className="px-4 py-3">
                            <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold mr-2">
                              {row.departmentCode || '???'}
                            </span>
                            <span className="text-slate-600">{row.departmentName}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="bg-teal-100 text-teal-700 px-2 py-1 rounded text-xs font-bold mr-2">
                              {row.categoryCode || '???'}
                            </span>
                            <span className="text-slate-600">{row.type}</span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {row.brand} {row.brand && row.model ? '/' : ''} {row.model}
                          </td>
                          <td className="px-4 py-3 text-slate-600 font-mono text-xs">{row.serialNumber || '-'}</td>
                          <td className="px-4 py-3 text-slate-600">{row.assignedTo || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-white border-t border-slate-100 px-8 py-5 flex items-center justify-end gap-3">
          <button 
            onClick={onCancel}
            disabled={isProcessing || isConfirming}
            className="px-6 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            disabled={isProcessing || previewData.length === 0 || isConfirming}
            className="px-6 py-2.5 rounded-xl font-bold bg-teal-500 text-white hover:bg-teal-600 shadow-lg shadow-teal-500/30 transition-all flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isConfirming ? (
              <><RefreshCw className="w-5 h-5 mr-2 animate-spin" /> Saving...</>
            ) : (
              <><Sparkles className="w-5 h-5 mr-2" /> Confirm & Import</>
            )}
          </button>
        </div>

      </div>
    </div>
  )
}
