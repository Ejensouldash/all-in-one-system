"use client"

import { QRCodeSVG } from "qrcode.react"

export interface AssetQRStickerProps {
  assetTag?: string
  assetName?: string
  departmentCode?: string | null
  serialNumber?: string | null
  qrValue: string
  /**
   * Sticker dimensions:
   * - "40x20": Niimbot thermal sticker (40mm x 20mm) - monochrome, high-contrast
   * - "70x30": Standard asset card (70mm x 30mm) - with dark/cyan styling
   */
  size?: "40x20" | "70x30"
  /** Offset-print mode for 70x30mm: adds 2mm bleed around die line plus dashed cut guide */
  bleed?: boolean
  /** Force thermal black-and-white theme */
  theme?: "thermal" | "dark"
  className?: string
}

export function AssetQRSticker({
  assetTag,
  assetName,
  departmentCode,
  serialNumber,
  qrValue,
  size = "40x20",
  bleed = false,
  theme = "thermal",
  className = "",
}: AssetQRStickerProps) {
  // -------------------------------------------------------------
  // Format 1: 40x20mm Thermal Sticker (Optimized for Niimbot)
  // -------------------------------------------------------------
  if (size === "40x20") {
    const isBlank = assetName === "[Blank QR - Ready to Register]"

    return (
      <div
        className={`asset-qr-sticker-40x20 ${className}`}
        style={{
          width: "40mm",
          height: "20mm",
          backgroundColor: "#ffffff",
          color: "#000000",
          boxSizing: "border-box",
          padding: "1mm 1.5mm",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1.2mm",
          overflow: "hidden",
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          border: "0.25mm solid #000000",
          borderRadius: "1.2mm",
          position: "relative",
          pageBreakInside: "avoid",
          breakInside: "avoid",
          WebkitPrintColorAdjust: "exact",
          printColorAdjust: "exact",
        }}
      >
        {/* Left Column: Sharp QR Code */}
        <div
          style={{
            width: "15.5mm",
            height: "15.5mm",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#ffffff",
          }}
        >
          <QRCodeSVG
            value={qrValue}
            size={120}
            level="M"
            marginSize={0}
            bgColor="#ffffff"
            fgColor="#000000"
            style={{ width: "100%", height: "100%", display: "block" }}
          />
        </div>

        {/* Right Column: Asset Details */}
        <div
          style={{
            flex: "1 1 auto",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            minWidth: 0,
            overflow: "hidden",
            paddingTop: "0.2mm",
            paddingBottom: "0.2mm",
          }}
        >
          {/* Header Row: Company + Department Badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.5mm",
              width: "100%",
            }}
          >
            <span
              style={{
                fontSize: "4.8pt",
                fontWeight: 900,
                letterSpacing: "0.3px",
                textTransform: "uppercase",
                color: "#000000",
                lineHeight: 1,
              }}
            >
              BUBBLESO2
            </span>
            {departmentCode && (
              <span
                style={{
                  fontSize: "4.2pt",
                  fontWeight: 800,
                  fontFamily: "monospace",
                  border: "0.25mm solid #000000",
                  borderRadius: "0.5mm",
                  padding: "0.1mm 0.6mm",
                  lineHeight: 1,
                  color: "#000000",
                  whiteSpace: "nowrap",
                }}
              >
                {departmentCode}
              </span>
            )}
          </div>

          {/* Divider Line */}
          <div
            style={{
              width: "100%",
              height: "0.25mm",
              backgroundColor: "#000000",
              margin: "0.2mm 0",
            }}
          />

          {/* Asset Tag (Prominent) */}
          <div
            style={{
              fontSize: "6.5pt",
              fontWeight: 900,
              fontFamily: "monospace",
              letterSpacing: "0.2px",
              lineHeight: 1.1,
              color: "#000000",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {assetTag || "AST-0000"}
          </div>

          {/* Asset Name or Status */}
          <div
            style={{
              fontSize: isBlank ? "4.2pt" : "4.6pt",
              fontWeight: isBlank ? 800 : 600,
              fontStyle: isBlank ? "italic" : "normal",
              lineHeight: 1.1,
              color: isBlank ? "#000000" : "#1e293b",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            title={assetName}
          >
            {isBlank ? "[READY TO REGISTER]" : (assetName || "Physical Asset")}
          </div>

          {/* Footer: Serial Number or Tagline */}
          <div
            style={{
              fontSize: "3.8pt",
              fontWeight: 600,
              lineHeight: 1,
              color: "#334155",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {serialNumber ? `S/N: ${serialNumber}` : "PROPERTY OF BUBBLESO2"}
          </div>
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------
  // Format 2: 70x30mm Standard Asset Sticker
  // -------------------------------------------------------------
  const isDark = theme !== "thermal"
  const sticker = (
    <div
      className={`asset-qr-sticker ${className}`}
      style={{
        width: "70mm",
        height: "30mm",
        backgroundColor: isDark ? "#111827" : "#ffffff",
        color: isDark ? "#f1f5f9" : "#000000",
        borderRadius: "3mm",
        border: isDark ? "0.6mm solid #2dd4bf" : "0.4mm solid #000000",
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
          justifyContent: "space-between",
          padding: "2.4mm 3.4mm",
          minWidth: 0,
        }}
      >
        {/* Header: PROPERTY OF + Department Shortform Badge */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div
            style={{
              fontSize: "5.5pt",
              fontWeight: 600,
              color: isDark ? "#94a3b8" : "#64748b",
              letterSpacing: "0.8px",
              textTransform: "uppercase",
            }}
          >
            PROPERTY OF
          </div>
          {departmentCode && (
            <div
              style={{
                backgroundColor: isDark ? "rgba(45, 212, 191, 0.15)" : "#f1f5f9",
                border: isDark ? "0.35mm solid #2dd4bf" : "0.35mm solid #000000",
                borderRadius: "1.2mm",
                padding: "0.3mm 1.8mm",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: "5.5pt",
                  color: isDark ? "#2dd4bf" : "#000000",
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

        {/* Logo or Brand */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <img
            src="/assets/BubblesO2_Logo.png"
            alt="BubblesO2"
            style={{
              height: "6.8mm",
              width: "auto",
              objectFit: "contain",
              display: "block",
            }}
          />
          {assetTag && (
            <span
              style={{
                fontSize: "7pt",
                fontWeight: 900,
                fontFamily: "monospace",
                color: isDark ? "#2dd4bf" : "#000000",
              }}
            >
              {assetTag}
            </span>
          )}
        </div>

        {/* Separator */}
        <div
          style={{
            width: "100%",
            height: "0.35mm",
            background: isDark
              ? "linear-gradient(90deg, transparent, #2dd4bf, transparent)"
              : "#000000",
            position: "relative",
            margin: "0.3mm 0",
          }}
        />

        {/* Asset Name or Contact Info */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.4mm" }}>
          {assetName && assetName !== "[Blank QR - Ready to Register]" ? (
            <div
              style={{
                fontSize: "6pt",
                fontWeight: 700,
                color: isDark ? "#f1f5f9" : "#0f172a",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {assetName}
            </div>
          ) : (
            <div
              style={{
                fontSize: "5.5pt",
                fontWeight: 700,
                color: isDark ? "#2dd4bf" : "#000000",
                textTransform: "uppercase",
              }}
            >
              [Ready To Register]
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: "1.5mm" }}>
            <span style={{ fontSize: "5pt", color: isDark ? "#94a3b8" : "#475569", fontWeight: 600 }}>
              {serialNumber ? `S/N: ${serialNumber}` : "HR: +60 19-608 9858 | hr@bubbleso2.com"}
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

  return (
    <div
      className="asset-qr-sticker-bleed"
      style={{
        width: "74mm",
        height: "34mm",
        backgroundColor: isDark ? "#111827" : "#ffffff",
        position: "relative",
        pageBreakInside: "avoid",
        breakInside: "avoid",
      }}
    >
      {sticker}
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
