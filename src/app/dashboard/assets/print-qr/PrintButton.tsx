"use client"
import React from "react"

export default function PrintButton() {
  return (
    <button 
      onClick={() => {
        if (typeof window !== 'undefined') window.print();
      }}
      className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition"
    >
      Print Now
    </button>
  )
}
