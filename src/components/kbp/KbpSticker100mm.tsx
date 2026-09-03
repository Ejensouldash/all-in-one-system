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
  // Same JSON payload expected by TransferInForm & CreateDOForm
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

  return (
    <div
      className={`kbp-sticker-100mm select-none bg-white text-black font-sans leading-tight ${
        mode === "preview"
          ? "w-[100mm] h-[100mm] max-w-full max-h-full rounded-2xl shadow-md border border-gray-300"
          : "w-[100mm] h-[100mm]"
      }`}
      style={{
        width: "100mm",
        height: "100mm",
        padding: "3.5mm", // Safe margin: avoids feed misalignment & edge clipping on thermal rolls
        boxSizing: "border-box",
        pageBreakInside: "avoid",
        breakInside: "avoid",
        display: "flex",
        flexDirection: "column",
        justifyContent: "stretch",
      }}
    >
      {/* Inner Technical Border Frame with Safe Margin */}
      <div
        className="w-full h-full flex flex-col justify-between border-[1.2mm] border-black rounded-[2.5mm] p-[2.2mm] bg-white relative box-border"
        style={{
          border: "1.2mm solid #000000",
          borderRadius: "2.5mm",
          padding: "2mm 2.5mm",
          boxSizing: "border-box",
        }}
      >
        {/* Subtle Decorative Technical Corner Notches */}
        <div className="absolute top-[1mm] left-[1mm] w-[2mm] h-[2mm] border-t-[0.4mm] border-l-[0.4mm] border-black pointer-events-none" />
        <div className="absolute top-[1mm] right-[1mm] w-[2mm] h-[2mm] border-t-[0.4mm] border-r-[0.4mm] border-black pointer-events-none" />
        <div className="absolute bottom-[1mm] left-[1mm] w-[2mm] h-[2mm] border-b-[0.4mm] border-l-[0.4mm] border-black pointer-events-none" />
        <div className="absolute bottom-[1mm] right-[1mm] w-[2mm] h-[2mm] border-b-[0.4mm] border-r-[0.4mm] border-black pointer-events-none" />

        {/* 1. HEADER: Official BubblesO2 Logo & Plant Identity */}
        <div>
          <div className="flex items-center justify-between gap-2 pb-1 border-b-[0.5mm] border-black">
            <div className="flex items-center gap-1.5">
              <img
                src="/assets/BubblesO2_Logo.png"
                alt="BubblesO2"
                className="h-[6.5mm] w-auto object-contain block"
              />
              <div className="flex flex-col">
                <span className="text-[6.5pt] font-black tracking-wider uppercase leading-none text-black">
                  KILANG BOTOL PEDAS
                </span>
                <span className="text-[5pt] font-bold text-gray-700 tracking-tight leading-none mt-0.5">
                  BUBBLESO2 MANUFACTURING
                </span>
              </div>
            </div>

            <div className="flex flex-col items-end">
              <span className="bg-black text-white text-[5.5pt] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-[0.8mm]">
                BATCH TAG
              </span>
              <span className="text-[5pt] font-extrabold text-black tracking-wider mt-0.5">
                TRACEABILITY
              </span>
            </div>
          </div>

          {/* Subheader: Date & Shift Info Pill */}
          <div className="flex items-center justify-between text-[5.5pt] font-black uppercase tracking-wider py-1 border-b-[0.3mm] border-black/80">
            <div className="flex items-center gap-1">
              <span className="text-gray-600">TARIKH:</span>
              <span className="text-black font-extrabold">{formattedDate}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-gray-600">SYIF:</span>
              <span className="bg-gray-100 border border-black/40 px-1 py-0.2 rounded-[0.5mm] text-black">
                {shiftText}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-gray-600">MESIN:</span>
              <span className="text-black font-extrabold">{batch.machine || "—"}</span>
            </div>
          </div>
        </div>

        {/* 2. HERO: Center Viewfinder Framed QR Code */}
        <div className="flex flex-col items-center justify-center my-auto py-0.5">
          <div className="relative p-1.5 rounded-[2mm] bg-white border border-black/30">
            {/* Viewfinder Target Brackets (Camera HUD Aesthetic) */}
            <div className="absolute -top-[1.2mm] -left-[1.2mm] w-[3mm] h-[3mm] border-t-[0.6mm] border-l-[0.6mm] border-black" />
            <div className="absolute -top-[1.2mm] -right-[1.2mm] w-[3mm] h-[3mm] border-t-[0.6mm] border-r-[0.6mm] border-black" />
            <div className="absolute -bottom-[1.2mm] -left-[1.2mm] w-[3mm] h-[3mm] border-b-[0.6mm] border-l-[0.6mm] border-black" />
            <div className="absolute -bottom-[1.2mm] -right-[1.2mm] w-[3mm] h-[3mm] border-b-[0.6mm] border-r-[0.6mm] border-black" />

            <QRCodeSVG
              value={qrPayload}
              size={135}
              level="H"
              includeMargin={false}
              bgColor="#ffffff"
              fgColor="#000000"
              imageSettings={{
                src: "/assets/BubblesO2_Logo.png",
                height: 22,
                width: 22,
                excavate: true,
              }}
            />
          </div>

          <div className="flex items-center justify-center gap-1 mt-1 text-[5pt] font-black uppercase tracking-[0.8px] text-gray-700">
            <span className="inline-block w-1 h-1 bg-black rounded-full" />
            <span>SCAN UNTUK REKOD WAREHOUSE & DO</span>
            <span className="inline-block w-1 h-1 bg-black rounded-full" />
          </div>
        </div>

        {/* 3. BATCH IDENTIFIER & PRODUCT BANNER */}
        <div className="border-[0.6mm] border-black rounded-[1.8mm] overflow-hidden">
          {/* Main Batch Number */}
          <div className="bg-black text-white px-2 py-1 flex items-center justify-between">
            <span className="text-[5pt] font-bold uppercase tracking-widest text-gray-300">
              NO. BATCH:
            </span>
            <span className="text-[10pt] font-black tracking-wider font-mono text-white">
              {batch.batchNo}
            </span>
          </div>

          {/* SKU / Product Info */}
          <div className="bg-gray-100 px-2 py-0.8 flex items-center justify-between border-t border-black/30">
            <span className="text-[5.5pt] font-black uppercase tracking-wider text-black">
              PRODUK: {batch.sku}
            </span>
            <span className="text-[5.5pt] font-black uppercase text-black bg-white px-1 py-0.2 border border-black/40 rounded">
              {machineObj?.label ? machineObj.label.split("—")[0].trim() : (batch.machine || "KBP")}
            </span>
          </div>
        </div>

        {/* 4. METRICS MATRIX: QTY / BAG, TOTAL BAGS, TOTAL QUANTITY */}
        <div className="grid grid-cols-3 gap-1 pt-1">
          <div className="border-[0.4mm] border-black rounded-[1.2mm] p-1 text-center bg-white">
            <div className="text-[4.5pt] font-bold uppercase tracking-wider text-gray-600">
              QTY / BAG
            </div>
            <div className="text-[8pt] font-black tracking-tight text-black font-mono mt-0.2">
              {batch.qtyPerBag.toLocaleString()}
              <span className="text-[5pt] font-bold ml-0.5">PCS</span>
            </div>
          </div>

          <div className="border-[0.4mm] border-black rounded-[1.2mm] p-1 text-center bg-white">
            <div className="text-[4.5pt] font-bold uppercase tracking-wider text-gray-600">
              TOTAL BAGS
            </div>
            <div className="text-[8pt] font-black tracking-tight text-black font-mono mt-0.2">
              {batch.totalBags}
              <span className="text-[5pt] font-bold ml-0.5">BAG</span>
            </div>
          </div>

          <div className="border-[0.4mm] border-black rounded-[1.2mm] p-1 text-center bg-black text-white">
            <div className="text-[4.5pt] font-bold uppercase tracking-wider text-gray-300">
              JUMLAH BESAR
            </div>
            <div className="text-[8pt] font-black tracking-tight text-white font-mono mt-0.2">
              {totalQuantity.toLocaleString()}
              <span className="text-[5pt] font-bold ml-0.5 text-gray-200">PCS</span>
            </div>
          </div>
        </div>

        {/* 5. MICRO AUTHENTICITY FOOTER */}
        <div className="flex items-center justify-between text-[4.2pt] font-bold uppercase tracking-wider text-gray-500 pt-0.8 border-t-[0.3mm] border-black/40">
          <span>ASAL: PEDAS PLANT (KBP)</span>
          <span>DIGITAL VERIFIED LOT</span>
          <span>BUBBLESO2 MALAYSIA</span>
        </div>
      </div>
    </div>
  )
}
