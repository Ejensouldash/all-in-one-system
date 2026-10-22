"use client"

import { useCallback, useEffect, useRef, useState } from "react"

// Minimal slice of the Web Speech API — it isn't in TypeScript's DOM lib yet.
type SpeechRecognitionResultList = ArrayLike<ArrayLike<{ transcript: string }>>
type SpeechRecognitionLike = {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((event: { results: SpeechRecognitionResultList }) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null
  const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor }
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

const ERROR_MESSAGES: Record<string, string> = {
  "not-allowed": "Akses mikrofon ditolak. Benarkan mikrofon dalam tetapan browser.",
  "service-not-allowed": "Akses mikrofon ditolak. Benarkan mikrofon dalam tetapan browser.",
  "audio-capture": "Mikrofon tidak dijumpai.",
  "network": "Sambungan untuk pengecaman suara terganggu.",
}

// Speech-to-text for the chat input (Chrome/Edge). Fills the input as the
// user speaks; sending is still the user's call.
export function useSpeechInput(onText: (text: string) => void) {
  const [supported] = useState(() => getRecognitionCtor() !== null)
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const onTextRef = useRef(onText)

  useEffect(() => {
    onTextRef.current = onText
  }, [onText])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  const start = useCallback(async (baseText: string) => {
    const Ctor = getRecognitionCtor()
    if (!Ctor || recognitionRef.current) return

    // Explicitly prompt the user for microphone access if not yet granted.
    // On mobile browsers (especially Chrome Android), SpeechRecognition often fails
    // silently with 'not-allowed' without showing the browser's permission prompt.
    // Calling getUserMedia reliably triggers the native permission prompt.
    if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        // Immediately release tracks so SpeechRecognition has sole mic hardware access
        stream.getTracks().forEach(track => track.stop())
      } catch (err: any) {
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setError(ERROR_MESSAGES["not-allowed"])
          setListening(false)
          return
        }
      }
    }

    const recognition = new Ctor()
    recognition.lang = "ms-MY"
    recognition.interimResults = true
    recognition.continuous = false
    const prefix = baseText.trim() ? `${baseText.trim()} ` : ""

    recognition.onresult = event => {
      const transcript = Array.from(event.results).map(result => result[0]?.transcript ?? "").join("")
      onTextRef.current(prefix + transcript)
    }
    // Chrome on Android doesn't always fire onend after an error (e.g. a
    // blocked mic), which left the button stuck on "listening". Reset here too.
    const finish = () => {
      if (recognitionRef.current === recognition) recognitionRef.current = null
      setListening(false)
    }
    recognition.onerror = event => {
      if (event.error !== "no-speech" && event.error !== "aborted") {
        setError(ERROR_MESSAGES[event.error] || "Pengecaman suara gagal. Cuba lagi.")
      }
      finish()
    }
    recognition.onend = finish

    recognitionRef.current = recognition
    setError(null)
    setListening(true)
    try {
      recognition.start()
    } catch {
      recognitionRef.current = null
      setListening(false)
    }
  }, [])

  useEffect(() => () => recognitionRef.current?.abort(), [])

  return { supported, listening, error, start, stop }
}
