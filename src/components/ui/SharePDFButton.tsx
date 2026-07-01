"use client"

import { Share, Download } from "lucide-react"
import { useState } from "react"
import html2canvas from "html2canvas"
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

      // Generate canvas
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
      })

      // Calculate A4 size
      const imgWidth = 210 // A4 width in mm
      const pageHeight = 297 // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      
      const pdf = new jsPDF("p", "mm", "a4")
      
      // If content is longer than one page, we need to add pages
      let heightLeft = imgHeight
      let position = 0
      let pageCount = 1
      
      const imgData = canvas.toDataURL("image/jpeg", 0.95)

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
        await navigator.share({
          files: [file],
          title: filename,
          text: `Please find the attached report: ${filename}`,
        })
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
