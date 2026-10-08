"use client"

import { QRCodeSVG } from "qrcode.react"

interface AssetQRStickerProps {
  assetTag?: string
  departmentCode?: string | null
  qrValue: string
  /** Offset-print mode: adds 2mm bleed around the 70x30mm die line plus a dashed magenta cut guide */
  bleed?: boolean
}

export function AssetQRSticker({ assetTag: _assetTag, departmentCode, qrValue, bleed = false }: AssetQRStickerProps) {
  const sticker = (
    <div
      className="asset-qr-sticker"
      style={{
        width: "70mm",
        height: "30mm",
        backgroundColor: "#111827",
        borderRadius: "3mm",
        border: "0.6mm solid #2dd4bf",
        display: "flex",
        alignItems: "stretch",
        overflow: "hidden",
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
        position: bleed ? "absolute" : "relative",
        ...(bleed ? { top: "2mm", left: "2mm" } : {}),
        pageBreakInside: "avoid",
        breakInside: "avoid",
      }}
    >
      {/* Left Section */}
      <div
        style={{
          flex: "1 1 60%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "2.8mm 3.8mm",
          gap: "1.2mm",
        }}
      >
        {/* Header: PROPERTY OF + Department Shortform Badge */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.4mm" }}>
          <div
            style={{
              fontSize: "5.5pt",
              fontWeight: 600,
              color: "#94a3b8",
              letterSpacing: "0.8px",
              textTransform: "uppercase",
            }}
          >
            PROPERTY OF
          </div>
          {departmentCode && (
            <div
              style={{
                backgroundColor: "rgba(45, 212, 191, 0.15)",
                border: "0.35mm solid #2dd4bf",
                borderRadius: "1.2mm",
                padding: "0.3mm 1.8mm",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: "5.5pt",
                  color: "#2dd4bf",
                  fontWeight: 800,
                  letterSpacing: "0.6px",
                  textTransform: "uppercase",
                  fontFamily: "monospace",
                }}
              >
                {departmentCode}
              </span>
            </div>
          )}
        </div>

        {/* Logo */}
        <img
          src="/assets/BubblesO2_Logo.png"
          alt="BubblesO2"
          style={{
            height: "7.2mm",
            width: "auto",
            objectFit: "contain",
            display: "block",
          }}
        />

        {/* Separator */}
        <div
          style={{
            width: "100%",
            height: "0.35mm",
            background: "linear-gradient(90deg, transparent, #2dd4bf, transparent)",
            position: "relative",
            margin: "0.5mm 0",
          }}
        >
          <div
            style={{
              width: "1.2mm",
              height: "1.2mm",
              backgroundColor: "#2dd4bf",
              borderRadius: "50%",
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            }}
          />
        </div>

        {/* Contact Info */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.8mm" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1.5mm" }}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#2dd4bf" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            <span style={{ fontSize: "6pt", color: "#f1f5f9", fontWeight: 600, letterSpacing: "0.2px" }}>
              +60 19-608 9858 (HR)
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "1.5mm" }}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#2dd4bf" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
            <span style={{ fontSize: "6pt", color: "#f1f5f9", fontWeight: 600, letterSpacing: "0.2px" }}>
              HR@bubbleso2.com
            </span>
          </div>
        </div>
      </div>

      {/* Right Section - QR Code */}
      <div
        style={{
          flex: "0 0 38%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2mm",
        }}
      >
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "2.5mm",
            padding: "1.5mm",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "24mm",
            height: "24mm",
          }}
        >
          <QRCodeSVG
            value={qrValue}
            size={84}
            level="M"
            bgColor="#ffffff"
            fgColor="#000000"
            style={{ width: "100%", height: "100%", display: "block" }}
          />
        </div>
      </div>
    </div>
  )

  if (!bleed) return sticker

  // Full bleed 74x34mm: background extends 2mm past the die line so no white
  // edge shows after cutting; corners stay square because they get trimmed off.
  return (
    <div
      className="asset-qr-sticker-bleed"
      style={{
        width: "74mm",
        height: "34mm",
        backgroundColor: "#111827",
        position: "relative",
        pageBreakInside: "avoid",
        breakInside: "avoid",
      }}
    >
      {sticker}
      {/* Die line (cut guide) at 70x30mm for the vendor */}
      <div
        style={{
          position: "absolute",
          inset: "2mm",
          border: "0.35mm dashed magenta",
          borderRadius: "3mm",
          pointerEvents: "none",
          zIndex: 10,
        }}
      />
    </div>
  )
}
