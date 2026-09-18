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
        style={{ minHeight: isPrint ? "21mm" : "23mm" }}
      >
        <div className="w-full h-full flex items-center justify-center border border-dashed border-gray-200 rounded-md bg-gray-50/50 m-0.5">
          <span className="text-[5pt] font-bold text-gray-400 uppercase tracking-widest">
            [ KOSONG / TIADA BEG ]
          </span>
        </div>
        {!isLast && (
          <div className="w-full flex items-center justify-center text-[4pt] text-gray-300 select-none pb-0.5">
            <span>✂ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - ✂</span>
          </div>
        )}
      </div>
    )
  }

  const totalBagsCount = batch.totalBags > 0 ? batch.totalBags : 1
  const machineId = batch.machine || batch.batchNo.split("-")[0] || "—"
  const machineObj = getMachine(machineId)
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
        minHeight: isPrint ? "21.5mm" : "23.5mm",
        padding: isPrint ? "0.8mm 1.2mm" : "1.2mm 2mm",
        boxSizing: "border-box",
      }}
    >
      <div className="w-full h-full flex items-center justify-between border-[0.6mm] border-black rounded-[1.2mm] p-1 bg-white relative box-border">
        {/* Decorative corner notches */}
        <div className="absolute top-[0.4mm] left-[0.4mm] w-[1.5mm] h-[1.5mm] border-t-[0.3mm] border-l-[0.3mm] border-black pointer-events-none" />
        <div className="absolute top-[0.4mm] right-[0.4mm] w-[1.5mm] h-[1.5mm] border-t-[0.3mm] border-r-[0.3mm] border-black pointer-events-none" />
        <div className="absolute bottom-[0.4mm] left-[0.4mm] w-[1.5mm] h-[1.5mm] border-b-[0.3mm] border-l-[0.3mm] border-black pointer-events-none" />
        <div className="absolute bottom-[0.4mm] right-[0.4mm] w-[1.5mm] h-[1.5mm] border-b-[0.3mm] border-r-[0.3mm] border-black pointer-events-none" />

        {/* 1. LEFT: QR CODE (Approx 20mm x 20mm, crisp vector) */}
        <div className="flex flex-col items-center justify-center shrink-0 pr-1">
          <div className="p-0.5 rounded-[0.8mm] bg-white border-[0.3mm] border-black">
            <QRCodeSVG
              value={qrPayload}
              size={isPrint ? 56 : 60}
              level="M"
              includeMargin={false}
              bgColor="#ffffff"
              fgColor="#000000"
            />
          </div>
        </div>

        {/* 2. CENTER: BATCH INFORMATION (3 clean rows) */}
        <div className="flex-1 px-1.5 flex flex-col justify-center min-w-0 leading-tight">
          {/* Subheader: Machine, Shift, Date */}
          <div className="flex items-center gap-1.5 text-[5.2pt] font-black uppercase text-gray-700 tracking-tight whitespace-nowrap pb-0.5">
            <span>MESIN: <strong className="text-black">{machineId}</strong></span>
            <span>·</span>
            <span>SYIF: <strong className="text-black">{shiftText}</strong></span>
            <span>·</span>
            <span>TARIKH: <strong className="text-black">{formattedDate}</strong></span>
          </div>

          {/* Main Batch No (High-contrast Monospace) */}
          <div className="text-[9.5pt] sm:text-[10pt] font-black font-mono tracking-wider text-black leading-none my-0.5 truncate">
            {batch.batchNo}
          </div>

          {/* Product & Qty */}
          <div className="flex items-center gap-1 text-[5.2pt] font-black uppercase text-gray-800 tracking-tight truncate pt-0.5">
            <span>PRODUK: <strong className="text-black">{batch.sku}</strong></span>
            <span>·</span>
            <span className="text-black font-mono">{batch.qtyPerBag.toLocaleString()} PCS/BAG</span>
            {machineObj?.label && (
              <span className="hidden sm:inline text-gray-500">({machineObj.label.split("—")[0].trim()})</span>
            )}
          </div>
        </div>

        {/* 3. RIGHT: NO. BEG BADGE (Solid Black High-Contrast Banner) */}
        <div
          className="border-[0.5mm] border-black rounded-[1mm] bg-black text-white flex flex-col justify-center items-center shrink-0 px-1 py-0.5 text-center"
          style={{ minWidth: isPrint ? "17mm" : "18mm" }}
        >
          <span className="text-[4.2pt] font-extrabold uppercase tracking-widest text-gray-300 leading-none">
            NO. BEG
          </span>
          <span className="text-[10pt] font-black font-mono leading-tight mt-0.5 text-white tracking-tight">
            {String(bagNumber).padStart(2, "0")}
          </span>
          <span className="text-[4.5pt] font-bold text-gray-300 leading-none mt-0.2">
            / {totalBagsCount} BEG
          </span>
        </div>
      </div>

      {/* Dashed cut guide between strips */}
      {!isLast && (
        <div className="w-full flex items-center justify-between text-[4pt] text-gray-400 select-none pt-0.5 leading-none">
          <span>✂ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - ✂</span>
        </div>
      )}
    </div>
  )
}

export function KbpSticker100mm({ batch, mode = "preview" }: KbpSticker100mmProps) {
  const isPrint = mode === "print"
  const totalBagsCount = Math.max(1, batch.totalBags || 1)

  // Determine which 4 bag numbers to show on this 100mm x 100mm sheet
  let bagNumbers: (number | null)[]
  if (batch.sheetBagIndices && batch.sheetBagIndices.length === 4) {
    bagNumbers = batch.sheetBagIndices
  } else {
    // Calculate the 4 bags of the sheet that contains the active bagIndex
    const activeBag = batch.bagIndex && batch.bagIndex > 0 ? batch.bagIndex : 1
    const sheetStart = Math.floor((activeBag - 1) / 4) * 4 + 1
    bagNumbers = [
      sheetStart <= totalBagsCount ? sheetStart : null,
      sheetStart + 1 <= totalBagsCount ? sheetStart + 1 : null,
      sheetStart + 2 <= totalBagsCount ? sheetStart + 2 : null,
      sheetStart + 3 <= totalBagsCount ? sheetStart + 3 : null,
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
          isLast={idx === 3}
          isPrint={isPrint}
        />
      ))}
    </div>
  )
}
