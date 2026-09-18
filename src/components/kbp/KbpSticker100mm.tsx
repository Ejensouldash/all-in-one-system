"use client"

import React from "react"
import { QRCodeSVG } from "qrcode.react"
import { formatDateOnly, getMachine, getShiftLabel } from "@/lib/kbp/batchNumber"

export interface KbpStickerBatchData {
  id?: string
  batchNo: string
  sku: string
  machine?: string | null
  productCode?: string | null
  shift?: string | null
  productionDate?: string | null
  qtyPerBag: number
  totalBags: number
  totalQty?: number
  createdBy?: string
  createdAt?: string
  bagIndex?: number
  sheetBagIndices?: (number | null)[]
}

interface KbpSticker100mmProps {
  batch: KbpStickerBatchData
  mode?: "preview" | "print"
}

interface KbpSingleStripProps {
  batch: KbpStickerBatchData
  bagNumber: number | null
  isLast: boolean
  isPrint: boolean
}

function KbpSingleStrip({ batch, bagNumber, isLast, isPrint }: KbpSingleStripProps) {
  if (bagNumber === null) {
    return (
      <div
        className={`w-full flex-1 flex flex-col justify-between ${
          !isLast ? "border-b border-dashed border-gray-300" : ""
        }`}
        style={{ minHeight: isPrint ? "43mm" : "46mm" }}
      >
        <div className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl bg-gray-50/50 m-1 p-3">
          <span className="text-[8.5pt] font-black text-gray-400 uppercase tracking-widest">
            [ KOSONG / TIADA BEG ]
          </span>
          <span className="text-[6pt] text-gray-400 font-bold mt-1">
            Slot Tambahan · Saiz Kertas 100mm × 100mm
          </span>
        </div>
        {!isLast && (
          <div className="w-full flex items-center justify-center text-[4.5pt] text-gray-300 select-none py-0.5">
            <span>✂ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - ✂</span>
          </div>
        )}
      </div>
    )
  }

  const totalBagsCount = batch.totalBags > 0 ? batch.totalBags : 1
  const machineId = batch.machine || batch.batchNo.split("-")[0] || "—"
  const shiftNumber = batch.shift ? String(batch.shift).padStart(2, "0") : ""
  const shiftText = shiftNumber === "01" ? "01 (PAGI)" : shiftNumber === "02" ? "02 (MALAM)" : (batch.shift || "—")
  const formattedDate = formatDateOnly(batch.productionDate)

  // Standard payload compatible with TransferInForm & CreateDOForm
  const qrPayload = JSON.stringify({
    batch: batch.batchNo,
    bag: bagNumber,
    totalBags: totalBagsCount,
    qty: batch.qtyPerBag,
    bags: 1,
    sku: batch.sku,
    origin: "PEDAS",
  })

  return (
    <div
      className={`w-full flex-1 flex flex-col justify-between box-border ${
        !isLast ? "border-b-[0.4mm] border-dashed border-gray-400" : ""
      }`}
      style={{
        minHeight: isPrint ? "43.5mm" : "46.5mm",
        padding: isPrint ? "1mm 1.5mm" : "1.5mm 2mm",
        boxSizing: "border-box",
      }}
    >
      <div className="w-full h-full flex flex-col justify-between border-[0.7mm] border-black rounded-[1.6mm] p-1.5 bg-white relative box-border">
        {/* Decorative corner notches */}
        <div className="absolute top-[0.5mm] left-[0.5mm] w-[2mm] h-[2mm] border-t-[0.4mm] border-l-[0.4mm] border-black pointer-events-none" />
        <div className="absolute top-[0.5mm] right-[0.5mm] w-[2mm] h-[2mm] border-t-[0.4mm] border-r-[0.4mm] border-black pointer-events-none" />
        <div className="absolute bottom-[0.5mm] left-[0.5mm] w-[2mm] h-[2mm] border-b-[0.4mm] border-l-[0.4mm] border-black pointer-events-none" />
        <div className="absolute bottom-[0.5mm] right-[0.5mm] w-[2mm] h-[2mm] border-b-[0.4mm] border-r-[0.4mm] border-black pointer-events-none" />

        {/* 1. TOP HEADER BAR: Full width (~88mm) with machine, shift, date & NO. BEG badge */}
        <div className="w-full flex items-center justify-between border-b-[0.4mm] border-gray-300 pb-1 mb-1 leading-none">
          <div className="flex items-center gap-2 text-[5.8pt] font-black uppercase text-gray-700 tracking-tight">
            <span>MESIN: <strong className="text-black">{machineId}</strong></span>
            <span>·</span>
            <span>SYIF: <strong className="text-black">{shiftText}</strong></span>
            <span>·</span>
            <span>TARIKH: <strong className="text-black">{formattedDate}</strong></span>
          </div>

          <div className="inline-flex items-center gap-1.5 bg-black text-white px-2 py-0.5 rounded-[1mm] shrink-0">
            <span className="text-[4.5pt] font-extrabold text-gray-300 uppercase tracking-wider">NO. BEG</span>
            <span className="text-[8.5pt] font-black font-mono leading-none">{String(bagNumber).padStart(2, "0")}</span>
            <span className="text-[5pt] font-bold text-gray-300 leading-none">/ {totalBagsCount}</span>
          </div>
        </div>

        {/* 2. BODY SECTION: QR Code on Left, Info & COP QC on Right */}
        <div className="w-full flex-1 flex items-stretch gap-2.5 min-h-0">
          {/* 2A. LEFT: QR CODE (~28mm x 28mm) */}
          <div className="shrink-0 flex flex-col items-center justify-center">
            <div className="p-0.8 rounded-[1mm] bg-white border-[0.4mm] border-black flex items-center justify-center">
              <QRCodeSVG
                value={qrPayload}
                size={isPrint ? 74 : 80}
                level="M"
                includeMargin={false}
                bgColor="#ffffff"
                fgColor="#000000"
              />
            </div>
            <span className="text-[4.2pt] font-bold text-gray-400 uppercase tracking-wider mt-0.5">
              BEG #{bagNumber}
            </span>
          </div>

          {/* 2B. RIGHT AREA: Batch No across top, Details + COP QC on bottom */}
          <div className="flex-1 flex flex-col justify-between min-w-0">
            {/* Batch Number: Spans full width of the right area (~58mm) */}
            <div className="border-b-[0.3mm] border-gray-200 pb-0.5">
              <div className="text-[11pt] sm:text-[11.5pt] font-black font-mono tracking-wider text-black leading-none truncate">
                {batch.batchNo}
              </div>
            </div>

            {/* Bottom Row: Product details on Left, COP QC box on Right */}
            <div className="flex-1 flex items-end justify-between gap-2 pt-1">
              {/* Product Info */}
              <div className="flex-1 flex flex-col justify-between h-full min-w-0 py-0.5">
                <div>
                  <div className="text-[7.2pt] font-black uppercase text-gray-900 tracking-tight truncate leading-tight">
                    PRODUK: <span className="text-black font-mono">{batch.sku}</span>
                  </div>
                  <div className="text-[6.8pt] font-extrabold uppercase text-gray-800 tracking-tight leading-tight mt-0.5">
                    KUANTITI: <span className="text-black font-mono font-black">{batch.qtyPerBag.toLocaleString()} PCS/BEG</span>
                  </div>
                </div>
                <div className="text-[4.5pt] font-bold uppercase tracking-wider text-gray-400 mt-1">
                  ASAL: KBP PEDAS · BUBBLESO2
                </div>
              </div>

              {/* COP QC Box in the Bottom Right Corner */}
              <div
                className="shrink-0 border-[0.5mm] border-dashed border-black rounded-[1mm] bg-gray-50/70 p-1 flex flex-col justify-between text-center box-border"
                style={{ width: isPrint ? "25mm" : "27mm", height: isPrint ? "19mm" : "21mm" }}
              >
                <div className="text-[4.8pt] font-black uppercase tracking-wider text-black border-b-[0.3mm] border-gray-300 pb-0.5 leading-none">
                  [ COP QC ]
                </div>
                <div className="flex-1 flex items-center justify-center text-[4.8pt] text-gray-400 font-bold italic select-none leading-none">
                  Ruang Cop QC
                </div>
                <div className="text-[4.2pt] font-extrabold text-gray-700 text-left border-t-[0.3mm] border-gray-200 pt-0.5 leading-none">
                  Tarikh: ______
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dashed cut guide between stickers */}
      {!isLast && (
        <div className="w-full flex items-center justify-between text-[4.5pt] text-gray-400 select-none pt-0.5 leading-none">
          <span>✂ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - ✂</span>
        </div>
      )}
    </div>
  )
}

export function KbpSticker100mm({ batch, mode = "preview" }: KbpSticker100mmProps) {
  const isPrint = mode === "print"
  const totalBagsCount = Math.max(1, batch.totalBags || 1)

  // Determine which 2 bag numbers to show on this 100mm x 100mm sheet
  let bagNumbers: (number | null)[]
  if (batch.sheetBagIndices && batch.sheetBagIndices.length === 2) {
    bagNumbers = batch.sheetBagIndices
  } else {
    // Calculate the 2 bags of the sheet that contains the active bagIndex
    const activeBag = batch.bagIndex && batch.bagIndex > 0 ? batch.bagIndex : 1
    const sheetStart = Math.floor((activeBag - 1) / 2) * 2 + 1
    bagNumbers = [
      sheetStart <= totalBagsCount ? sheetStart : null,
      sheetStart + 1 <= totalBagsCount ? sheetStart + 1 : null,
    ]
  }

  return (
    <div
      className={`kbp-sticker-sheet select-none bg-white text-black font-sans leading-tight ${
        isPrint
          ? "w-[94mm] h-[92mm] max-h-[92mm]"
          : "w-[100mm] h-[100mm] max-w-full max-h-full rounded-2xl shadow-md border border-gray-300"
      }`}
      style={{
        width: isPrint ? "94mm" : "100mm",
        height: isPrint ? "92mm" : "100mm",
        maxHeight: isPrint ? "92mm" : "100mm",
        padding: isPrint ? "1mm" : "2mm",
        boxSizing: "border-box",
        pageBreakInside: "avoid",
        breakInside: "avoid",
        pageBreakAfter: "avoid",
        breakAfter: "avoid",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        overflow: "hidden",
        backgroundColor: "#ffffff",
      }}
    >
      {bagNumbers.map((bagNum, idx) => (
        <KbpSingleStrip
          key={idx}
          batch={batch}
          bagNumber={bagNum}
          isLast={idx === 1}
          isPrint={isPrint}
        />
      ))}
    </div>
  )
}
