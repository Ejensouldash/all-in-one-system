"use client"

import { useCallback, useEffect, useRef, useState } from "react"

const AUTO_SPEAK_KEY = "aria:autoSpeak"
const MAX_CACHED_CLIPS = 20

function readAutoSpeak() {
  try {
    return localStorage.getItem(AUTO_SPEAK_KEY) === "1"
  } catch {
    return false
  }
}

// Plays Aria's replies through /api/aria/tts. One clip plays at a time, and
// generated clips are cached by text so replaying a reply doesn't hit Gemini
// (and its quota) again.
export function useAriaVoice() {
  const [autoSpeak, setAutoSpeakState] = useState(readAutoSpeak)
  const [speakingKey, setSpeakingKey] = useState<string | null>(null)
  const [loadingKey, setLoadingKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const requestRef = useRef<AbortController | null>(null)
  const cacheRef = useRef(new Map<string, string>())
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showError = useCallback((message: string) => {
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
    setError(message)
    errorTimerRef.current = setTimeout(() => setError(null), 5000)
  }, [])

  const stop = useCallback(() => {
    requestRef.current?.abort()
    requestRef.current = null
    if (audioRef.current) {
      audioRef.current.onended = null
      audioRef.current.pause()
      audioRef.current = null
    }
    setSpeakingKey(null)
    setLoadingKey(null)
  }, [])

  const fetchClip = useCallback(async (text: string, signal: AbortSignal) => {
    const cached = cacheRef.current.get(text)
    if (cached) return cached

    const res = await fetch("/api/aria/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal,
    })
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      throw new Error(body?.error || "Aria tidak dapat bercakap sekarang.")
    }

    const url = URL.createObjectURL(await res.blob())
    const cache = cacheRef.current
    cache.set(text, url)
    if (cache.size > MAX_CACHED_CLIPS) {
      const [oldestText, oldestUrl] = cache.entries().next().value!
      URL.revokeObjectURL(oldestUrl)
      cache.delete(oldestText)
    }
    return url
  }, [])

  const speak = useCallback(async (key: string, text: string) => {
    stop()
    const controller = new AbortController()
    requestRef.current = controller
    setLoadingKey(key)

    try {
      const url = await fetchClip(text, controller.signal)
      if (controller.signal.aborted) return

      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => {
        if (audioRef.current === audio) {
          audioRef.current = null
          setSpeakingKey(null)
        }
      }
      setLoadingKey(null)
      setSpeakingKey(key)
      await audio.play()
    } catch (err: unknown) {
      if (controller.signal.aborted) return
      setLoadingKey(null)
      setSpeakingKey(null)
      audioRef.current = null
      // Autoplay blocked by the browser is not worth an error banner.
      if (err instanceof DOMException && err.name === "NotAllowedError") return
      showError(err instanceof Error ? err.message : "Aria tidak dapat bercakap sekarang.")
    } finally {
      if (requestRef.current === controller) requestRef.current = null
    }
  }, [fetchClip, showError, stop])

  // Tapping the speaker of the clip that's loading/playing stops it.
  const toggle = useCallback((key: string, text: string) => {
    if (speakingKey === key || loadingKey === key) stop()
    else void speak(key, text)
  }, [loadingKey, speak, speakingKey, stop])

  const setAutoSpeak = useCallback((value: boolean) => {
    setAutoSpeakState(value)
    if (!value) stop()
    try {
      localStorage.setItem(AUTO_SPEAK_KEY, value ? "1" : "0")
    } catch {}
  }, [stop])

  useEffect(() => {
    const cache = cacheRef.current
    return () => {
      requestRef.current?.abort()
      audioRef.current?.pause()
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
      cache.forEach(url => URL.revokeObjectURL(url))
      cache.clear()
    }
  }, [])

  return { autoSpeak, setAutoSpeak, speak, toggle, stop, speakingKey, loadingKey, error }
}
