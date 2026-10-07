"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Camera, RefreshCw, X, Check, Image as ImageIcon, AlertCircle, Loader2 } from "lucide-react"

interface CameraCaptureModalProps {
  isOpen: boolean
  onClose: () => void
  onCapture: (file: File, previewUrl: string) => void
  title?: string
}

export function CameraCaptureModal({
  isOpen,
  onClose,
  onCapture,
  title = "Capture Asset Photo"
}: CameraCaptureModalProps) {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null)
  const [capturedFile, setCapturedFile] = useState<File | null>(null)
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Stop camera tracks cleanly
  const stopStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
  }, [stream])

  // Start camera stream
  const startCamera = useCallback(async (mode: "environment" | "user") => {
    setIsLoading(true)
    setError(null)
    try {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }

      // Check available devices to see if multiple video cameras exist
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoInputs = devices.filter((d) => d.kind === "videoinput")
      setHasMultipleCameras(videoInputs.length > 1)

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      }

      const newStream = await navigator.mediaDevices.getUserMedia(constraints)
      setStream(newStream)

      if (videoRef.current) {
        videoRef.current.srcObject = newStream
        videoRef.current.play().catch(() => {})
      }
    } catch (err: any) {
      console.error("Camera access error:", err)
      setError(
        err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
          ? "Camera permission was denied. Please allow camera permissions in your browser or choose a file from your device below."
          : "Unable to access camera on this device. You can choose a photo from your device instead."
      )
    } finally {
      setIsLoading(false)
    }
  }, [stream])

  useEffect(() => {
    if (isOpen) {
      setCapturedPhotoUrl(null)
      setCapturedFile(null)
      setError(null)
      startCamera(facingMode)
    } else {
      stopStream()
    }

    return () => {
      stopStream()
    }
  }, [isOpen])

  // Attach stream when video element mounts
  useEffect(() => {
    if (videoRef.current && stream && !capturedPhotoUrl) {
      videoRef.current.srcObject = stream
      videoRef.current.play().catch(() => {})
    }
  }, [stream, capturedPhotoUrl])

  // Switch between front and rear cameras
  const toggleCamera = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment"
    setFacingMode(nextMode)
    startCamera(nextMode)
  }

  // Snap a photo from video frame
  const takeSnapshot = () => {
    if (!videoRef.current) return

    const video = videoRef.current
    const canvas = document.createElement("canvas")
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const filename = `asset-photo-${Date.now()}.jpg`
        const file = new File([blob], filename, { type: "image/jpeg" })
        const previewUrl = URL.createObjectURL(blob)

        setCapturedFile(file)
        setCapturedPhotoUrl(previewUrl)
      },
      "image/jpeg",
      0.88
    )
  }

  // Handle fallback file upload from disk/gallery
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const previewUrl = URL.createObjectURL(file)
    setCapturedFile(file)
    setCapturedPhotoUrl(previewUrl)
    e.target.value = ""
  }

  // Retake photo
  const handleRetake = () => {
    if (capturedPhotoUrl) {
      URL.revokeObjectURL(capturedPhotoUrl)
    }
    setCapturedPhotoUrl(null)
    setCapturedFile(null)
    startCamera(facingMode)
  }

  // Confirm and use the captured photo
  const handleConfirm = () => {
    if (capturedFile && capturedPhotoUrl) {
      onCapture(capturedFile, capturedPhotoUrl)
      stopStream()
      onClose()
    }
  }

  const handleClose = () => {
    if (capturedPhotoUrl) {
      URL.revokeObjectURL(capturedPhotoUrl)
    }
    stopStream()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl flex flex-col text-white">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-teal-500/10 text-teal-400 rounded-lg">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight">{title}</h3>
              <p className="text-xs text-slate-400">Position the asset clearly within the frame</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder / Preview Body */}
        <div className="relative aspect-[4/3] bg-black flex items-center justify-center overflow-hidden">
          {isLoading && !capturedPhotoUrl && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20 gap-3">
              <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
              <p className="text-xs font-semibold text-slate-300">Starting camera...</p>
            </div>
          )}

          {error && !capturedPhotoUrl ? (
            <div className="p-6 text-center z-10 max-w-sm">
              <AlertCircle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
              <p className="text-xs text-slate-300 font-medium leading-relaxed">{error}</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                <ImageIcon className="w-4 h-4" /> Choose from Device
              </button>
            </div>
          ) : capturedPhotoUrl ? (
            <img
              src={capturedPhotoUrl}
              alt="Captured asset"
              className="w-full h-full object-contain"
            />
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="w-full h-full object-cover"
              />
              {/* Viewfinder guideline overlay */}
              <div className="absolute inset-6 border border-white/30 rounded-xl pointer-events-none flex flex-col justify-between p-3">
                <div className="flex justify-between">
                  <div className="w-4 h-4 border-t-2 border-l-2 border-teal-400" />
                  <div className="w-4 h-4 border-t-2 border-r-2 border-teal-400" />
                </div>
                <div className="flex justify-between">
                  <div className="w-4 h-4 border-b-2 border-l-2 border-teal-400" />
                  <div className="w-4 h-4 border-b-2 border-r-2 border-teal-400" />
                </div>
              </div>
            </>
          )}

          {/* Camera switch toggle button */}
          {!capturedPhotoUrl && !error && hasMultipleCameras && (
            <button
              type="button"
              onClick={toggleCamera}
              className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/90 text-white rounded-full backdrop-blur-sm border border-white/20 transition z-10"
              title="Switch camera"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Action Controls */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-3">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          {!capturedPhotoUrl ? (
            <>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <ImageIcon className="w-4 h-4" /> Gallery
              </button>

              <button
                type="button"
                disabled={isLoading || !!error}
                onClick={takeSnapshot}
                className="flex-1 py-3 bg-teal-500 hover:bg-teal-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-black text-sm rounded-xl transition shadow-md flex items-center justify-center gap-2"
              >
                <Camera className="w-5 h-5" /> Capture Photo
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleRetake}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Retake
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                className="flex-1 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs rounded-xl transition shadow-md flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" /> Use Photo
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  )
}
