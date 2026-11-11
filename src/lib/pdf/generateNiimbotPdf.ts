import jsPDF from "jspdf"
import { toPng } from "html-to-image"

export interface DownloadNiimbotPdfOptions {
  elements: HTMLElement[]
  filename?: string
  onProgress?: (current: number, total: number) => void
}

/**
 * Generates an exact 40mm x 20mm continuous multi-page PDF for Niimbot thermal printers.
 * Every single page is mathematically formatted to 40mm width and 20mm height.
 */
export async function downloadNiimbotPdf({
  elements,
  filename = "niimbot_stickers_40x20mm.pdf",
  onProgress,
}: DownloadNiimbotPdfOptions) {
  if (!elements || elements.length === 0) return

  const total = elements.length
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [20, 40], // 40mm width x 20mm height in landscape
    compress: true,
  })

  for (let i = 0; i < total; i++) {
    const el = elements[i]
    if (!el) continue

    if (onProgress) {
      onProgress(i + 1, total)
    }

    if (i > 0) {
      pdf.addPage([20, 40], "landscape")
    }

    // High resolution 4x capture produces ~384 DPI, razor sharp for thermal print heads
    const imgData = await toPng(el, {
      pixelRatio: 4,
      backgroundColor: "#ffffff",
      quality: 1,
      cacheBust: true,
    })

    pdf.addImage(imgData, "PNG", 0, 0, 40, 20, undefined, "FAST")
  }

  pdf.save(filename)
}
