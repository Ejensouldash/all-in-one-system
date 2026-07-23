"use client"

import dynamic from "next/dynamic"

// Chatbot pulls in react-markdown + remark-gfm and is closed by default on
// every route (MainLayout renders it globally) — defer it off the initial
// bundle entirely instead of shipping it eagerly on every page load.
export const Chatbot = dynamic(() => import("./Chatbot").then(mod => mod.Chatbot), {
  ssr: false,
})
