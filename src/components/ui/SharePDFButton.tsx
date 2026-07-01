"use client"

import { Share, Download } from "lucide-react"
import { useState } from "react"
import { toJpeg } from "html-to-image"
import jsPDF from "jspdf"

interface SharePDFButtonProps {
  elementId: string;
  filename: string;
}

export function SharePDFButton({ elementId, filename }: SharePDFButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  const handleShare = async () => {
    setIsGenerating(true)
    try {
      const element = document.getElementById(elementId)
      if (!element) throw new Error("Element not found")

      // Temporarily force desktop width so mobile doesn't squish the PDF
      const originalWidth = element.style.width;
      const originalMaxWidth = element.style.maxWidth;
      element.style.width = '794px'; // A4 width in pixels at 96 DPI
      element.style.maxWidth = 'none';
      
      // Wait a tiny bit for browser to reflow layout
      await new Promise(resolve => setTimeout(resolve, 50));

      // Generate image using html-to-image
      const imgData = await toJpeg(element, {
        quality: 0.95,
        backgroundColor: '#ffffff',
        pixelRatio: 2
      })

      // Restore original styling
      element.style.width = originalWidth;
      element.style.maxWidth = originalMaxWidth;

      // Get image dimensions
      const img = new Image();
      img.src = imgData;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      // Calculate A4 size
      const imgWidth = 210 // A4 width in mm
      const pageHeight = 297 // A4 height in mm
      const imgHeight = (img.height * imgWidth) / img.width
      
      const pdf = new jsPDF("p", "mm", "a4")
      
      // If content is longer than one page, we need to add pages
      let heightLeft = imgHeight
      let position = 0
      let pageCount = 1

      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
        pageCount++
      }

      // Convert PDF to blob
      const pdfBlob = pdf.output("blob")

      // Attempt to share if supported
      if (navigator.canShare && navigator.canShare({ files: [new File([pdfBlob], filename, { type: "application/pdf" })] })) {
        const file = new File([pdfBlob], filename, { type: "application/pdf" })
        try {
          await navigator.share({
            files: [file],
            title: filename,
            text: `Please find the attached report: ${filename}`,
          })
        } catch (shareError: any) {
          console.warn("Share failed or cancelled:", shareError)
          // If the gesture expired (NotAllowedError) or something else failed, fallback to download
          if (shareError.name !== 'AbortError') {
            pdf.save(filename)
          }
        }
      } else {
        // Fallback to download
        pdf.save(filename)
      }
    } catch (error) {
      console.error("Failed to generate PDF:", error)
      alert("Failed to generate PDF. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <button 
      onClick={handleShare}
      disabled={isGenerating}
      className={`inline-flex items-center text-sm font-black uppercase tracking-wider border-2 border-green-600 text-green-700 px-4 py-2 bg-green-50 hover:bg-green-600 hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(22,163,74,1)] hover:shadow-none hover:translate-y-[2px] hover:translate-x-[2px] print:hidden ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {isGenerating ? (
        <span className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        <Share className="w-4 h-4 mr-2" />
      )}
      {isGenerating ? "Processing..." : "Share / PDF"}
    </button>
  )
}
