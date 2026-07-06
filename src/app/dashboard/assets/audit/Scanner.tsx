"use client"

import { QRScannerModal } from "@/components/forms/QRScannerModal"
import { useState } from "react"
import { Camera } from "lucide-react"

interface ScannerProps {
  onScan: (decodedText: string) => void
}

export function Scanner({ onScan }: ScannerProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white font-bold rounded-lg hover:bg-teal-700 transition-colors"
      >
        <Camera className="w-4 h-4" />
        Scan QR Code
      </button>
      <QRScannerModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onScan={(text) => {
          setIsOpen(false)
          onScan(text)
        }}
      />
    </>
  )
}