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
}

interface KbpSticker100mmProps {
  batch: KbpStickerBatchData
  mode?: "preview" | "print"
}

export function KbpSticker100mm({ batch, mode = "preview" }: KbpSticker100mmProps) {
  // Pure standard JSON payload compatible with TransferInForm & CreateDOForm
  const qrPayload = JSON.stringify({
    batch: batch.batchNo,
    sku: batch.sku,
    qty: batch.qtyPerBag,
    bags: batch.totalBags,
    origin: "PEDAS",
  })

  const machineObj = batch.machine ? getMachine(batch.machine) : undefined
  const totalQuantity = batch.totalQty ?? (batch.qtyPerBag * batch.totalBags)
  const shiftText = batch.shift ? getShiftLabel(batch.shift).toUpperCase() : "—"
  const formattedDate = formatDateOnly(batch.productionDate)

  const isPrint = mode === "print"

  return (
    <div
      className={`kbp-sticker-100mm select-none bg-white text-black font-sans leading-tight ${
        isPrint
          ? "w-[94mm] h-[92mm] max-h-[92mm]"
          : "w-[100mm] h-[100mm] max-w-full max-h-full rounded-2xl shadow-md border border-gray-300"
      }`}
      style={{
        width: isPrint ? "94mm" : "100mm",
        height: isPrint ? "92mm" : "100mm",
        maxHeight: isPrint ? "92mm" : "100mm",
        padding: isPrint ? "2mm" : "3.5mm",
        boxSizing: "border-box",
        pageBreakInside: "avoid",
        breakInside: "avoid",
        pageBreakAfter: "avoid",
        breakAfter: "avoid",
        display: "flex",
        flexDirection: "column",
        justifyContent: "stretch",
        overflow: "hidden",
        backgroundColor: "#ffffff",
      }}
    >
      {/* Inner Technical Border Frame (Border Outline - Works without Background Graphics) */}
      <div
        className="w-full h-full flex flex-col justify-between border-[1.2mm] border-black rounded-[2.5mm] bg-white relative box-border"
        style={{
          border: "1.2mm solid #000000",
          borderRadius: "2.5mm",
          padding: isPrint ? "1.8mm 2.2mm" : "2.5mm 3mm",
          boxSizing: "border-box",
          backgroundColor: "#ffffff",
          color: "#000000",
        }}
      >
        {/* Subtle Decorative Technical Corner Notches */}
        <div className="absolute top-[0.8mm] left-[0.8mm] w-[2mm] h-[2mm] border-t-[0.4mm] border-l-[0.4mm] border-black pointer-events-none" />
        <div className="absolute top-[0.8mm] right-[0.8mm] w-[2mm] h-[2mm] border-t-[0.4mm] border-r-[0.4mm] border-black pointer-events-none" />
        <div className="absolute bottom-[0.8mm] left-[0.8mm] w-[2mm] h-[2mm] border-b-[0.4mm] border-l-[0.4mm] border-black pointer-events-none" />
        <div className="absolute bottom-[0.8mm] right-[0.8mm] w-[2mm] h-[2mm] border-b-[0.4mm] border-r-[0.4mm] border-black pointer-events-none" />

        {/* 1. HEADER: Crisp Vector Typography (No raster PNG) */}
        <div>
          <div className="flex items-center justify-between pb-1 border-b-[0.6mm] border-black">
            <div className="flex flex-col">
              <span className="text-[13pt] font-black tracking-tight uppercase leading-none text-black font-sans">
                BUBBLESO2
              </span>
              <span className="text-[5.5pt] font-black tracking-wider uppercase text-black mt-0.5 leading-none">
                KILANG BOTOL PEDAS (KBP)
              </span>
            </div>

            <div className="border-[0.5mm] border-black px-1.5 py-0.5 rounded-[1mm] text-center bg-white">
              <span className="text-[6pt] font-black uppercase tracking-wider block text-black leading-tight">
                BATCH TAG
              </span>
              <span className="text-[4.5pt] font-bold tracking-tight block text-black leading-tight">
                TRACEABILITY
              </span>
            </div>
          </div>

          {/* Subheader: Date & Shift Info Pill */}
          <div className="flex items-center justify-between text-[5.8pt] font-black uppercase tracking-wider py-0.8 border-b-[0.3mm] border-black">
            <div className="flex items-center gap-1">
              <span className="text-gray-700">TARIKH:</span>
              <span className="text-black font-black">{formattedDate}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-gray-700">SYIF:</span>
              <span className="border border-black px-1 py-0.2 rounded-[0.5mm] text-black font-black">
                {shiftText}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-gray-700">MESIN:</span>
              <span className="text-black font-black">{batch.machine || "—"}</span>
            </div>
          </div>
        </div>

        {/* 2. HERO: Center Viewfinder Framed QR Code (Pure B&W, No Center Image Hole) */}
        <div className="flex flex-col items-center justify-center my-auto py-0.5">
          <div className="relative p-1 rounded-[1.5mm] bg-white border-[0.3mm] border-black">
            {/* Viewfinder Target Brackets (Camera HUD Aesthetic) */}
            <div className="absolute -top-[1mm] -left-[1mm] w-[2.5mm] h-[2.5mm] border-t-[0.5mm] border-l-[0.5mm] border-black" />
            <div className="absolute -top-[1mm] -right-[1mm] w-[2.5mm] h-[2.5mm] border-t-[0.5mm] border-r-[0.5mm] border-black" />
            <div className="absolute -bottom-[1mm] -left-[1mm] w-[2.5mm] h-[2.5mm] border-b-[0.5mm] border-l-[0.5mm] border-black" />
            <div className="absolute -bottom-[1mm] -right-[1mm] w-[2.5mm] h-[2.5mm] border-b-[0.5mm] border-r-[0.5mm] border-black" />

            <QRCodeSVG
              value={qrPayload}
              size={isPrint ? 100 : 115}
              level="M"
              includeMargin={false}
              bgColor="#ffffff"
              fgColor="#000000"
            />
          </div>

          <div className="flex items-center justify-center gap-1 mt-0.8 text-[4.8pt] font-black uppercase tracking-[0.6px] text-black">
            <span className="inline-block w-1 h-1 bg-black rounded-full" />
            <span>SCAN UNTUK REKOD WAREHOUSE & DO</span>
            <span className="inline-block w-1 h-1 bg-black rounded-full" />
          </div>
        </div>

        {/* 3. BATCH IDENTIFIER & PRODUCT BANNER (High-Contrast Border Outline) */}
        <div className="border-[0.6mm] border-black rounded-[1.5mm] bg-white px-2 py-1 text-center">
          <div className="text-[5pt] font-extrabold uppercase tracking-widest text-gray-800">
            NO. BATCH PRODUKSI
          </div>
          <div className="text-[12pt] sm:text-[13pt] font-black tracking-wider font-mono text-black leading-tight my-0.5">
            {batch.batchNo}
          </div>
          <div className="border-t-[0.3mm] border-black pt-0.5 flex items-center justify-between text-[5.8pt] font-black uppercase tracking-wider text-black">
            <span>PRODUK: {batch.sku}</span>
            <span>
              {machineObj?.label ? machineObj.label.split("—")[0].trim() : (batch.machine || "KBP")}
            </span>
          </div>
        </div>

        {/* 4. METRICS MATRIX: QTY / BAG, TOTAL BAGS, TOTAL QUANTITY (Pure Outline) */}
        <div className="grid grid-cols-3 gap-1 pt-0.5">
          <div className="border-[0.5mm] border-black rounded-[1.2mm] p-0.8 text-center bg-white">
            <div className="text-[4.5pt] font-extrabold uppercase tracking-wider text-black">
              QTY / BAG
            </div>
            <div className="text-[8pt] font-black tracking-tight text-black font-mono leading-tight mt-0.2">
              {batch.qtyPerBag.toLocaleString()}
              <span className="text-[4.5pt] font-bold ml-0.5">PCS</span>
            </div>
          </div>

          <div className="border-[0.5mm] border-black rounded-[1.2mm] p-0.8 text-center bg-white">
            <div className="text-[4.5pt] font-extrabold uppercase tracking-wider text-black">
              TOTAL BAGS
            </div>
            <div className="text-[8pt] font-black tracking-tight text-black font-mono leading-tight mt-0.2">
              {batch.totalBags}
              <span className="text-[4.5pt] font-bold ml-0.5">BAG</span>
            </div>
          </div>

          <div className="border-[0.6mm] border-black rounded-[1.2mm] p-0.8 text-center bg-white">
            <div className="text-[4.5pt] font-black uppercase tracking-wider text-black">
              JUMLAH BESAR
            </div>
            <div className="text-[8pt] font-black tracking-tight text-black font-mono leading-tight mt-0.2">
              {totalQuantity.toLocaleString()}
              <span className="text-[4.5pt] font-bold ml-0.5">PCS</span>
            </div>
          </div>
        </div>

        {/* 5. MICRO AUTHENTICITY FOOTER */}
        <div className="flex items-center justify-between text-[4.2pt] font-bold uppercase tracking-wider text-black pt-0.5 border-t-[0.3mm] border-black">
          <span>ASAL: PEDAS PLANT (KBP)</span>
          <span>DIGITAL VERIFIED LOT</span>
          <span>BUBBLESO2 MALAYSIA</span>
        </div>
      </div>
    </div>
  )
}
