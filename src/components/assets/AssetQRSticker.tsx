"use client"

import { QRCodeSVG } from "qrcode.react"

interface AssetQRStickerProps {
  assetTag: string
  qrValue: string
}

export function AssetQRSticker({ assetTag, qrValue }: AssetQRStickerProps) {
  return (
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
        position: "relative",
        pageBreakInside: "avoid",
        breakInside: "avoid",
      }}
    >
      {/* Left Section */}
      <div
        style={{
          flex: "1 1 55%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "2mm 3mm",
          gap: "0.8mm",
        }}
      >
        {/* PROPERTY OF + Logo */}
        <div>
          <div
            style={{
              fontSize: "5pt",
              fontWeight: 400,
              color: "#94a3b8",
              letterSpacing: "0.5px",
              textTransform: "uppercase",
              marginBottom: "0.3mm",
            }}
          >
            PROPERTY OF
          </div>
          <img
            src="/assets/BubblesO2_Logo.png"
            alt="BubblesO2"
            style={{
              height: "5mm",
              width: "auto",
              objectFit: "contain",
              display: "block",
            }}
          />
        </div>

        {/* Separator */}
        <div
          style={{
            width: "100%",
            height: "0.3mm",
            background: "linear-gradient(90deg, transparent, #2dd4bf, transparent)",
            position: "relative",
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

        {/* Asset Tag */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "1mm",
            padding: "0.8mm 2mm",
            display: "inline-block",
            alignSelf: "flex-start",
          }}
        >
          <span
            style={{
              fontSize: "8pt",
              fontWeight: 900,
              color: "#000000",
              letterSpacing: "0.3px",
              whiteSpace: "nowrap",
            }}
          >
            {assetTag}
          </span>
        </div>

        {/* Contact Info */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.3mm", marginTop: "0.3mm" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1.2mm" }}>
            <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="#2dd4bf" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            <span style={{ fontSize: "5pt", color: "#e2e8f0", fontWeight: 500 }}>
              +60 19-608 9858 (HR)
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "1.2mm" }}>
            <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="#2dd4bf" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
            <span style={{ fontSize: "5pt", color: "#e2e8f0", fontWeight: 500 }}>
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
            borderRadius: "2mm",
            padding: "1.5mm",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "22mm",
            height: "22mm",
          }}
        >
          <QRCodeSVG
            value={qrValue}
            size={76}
            level="M"
            bgColor="#ffffff"
            fgColor="#000000"
            style={{ width: "100%", height: "100%", display: "block" }}
          />
        </div>
      </div>
    </div>
  )
}
