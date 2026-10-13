"use client"

import { useState, useRef } from "react"
import { uploadNrhoBlueprint, deleteNrhoBlueprint } from "@/app/actions/nrho-project"
import { 
  FileText, 
  Image as ImageIcon, 
  Upload, 
  Trash2, 
  Eye, 
  Download, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Maximize2,
  FileCode,
  Layers,
  Sparkles
} from "lucide-react"

interface ProjectBlueprintsTabProps {
  projectId: string
  blueprints: any[]
}

export function ProjectBlueprintsTab({ projectId, blueprints = [] }: ProjectBlueprintsTabProps) {
  const [blueprintList, setBlueprintList] = useState<any[]>(blueprints)
  const [isUploading, setIsUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Upload Form State
  const [title, setTitle] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fullscreen Preview Modal State
  const [previewBlueprint, setPreviewBlueprint] = useState<any | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setSelectedFile(file)
      if (!title) {
        // Auto populate title with clean filename without extension
        const cleanName = file.name.replace(/\.[^/.]+$/, "")
        setTitle(cleanName)
      }
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) {
      setStatusMsg({ type: "error", text: "Please select a floor plan or blueprint drawing file." })
      return
    }

    setIsUploading(true)
    setStatusMsg(null)

    const formData = new FormData()
    formData.append("title", title.trim() || selectedFile.name)
    formData.append("file", selectedFile)

    const res = await uploadNrhoBlueprint(projectId, formData)
    setIsUploading(false)

    if (res.success && res.blueprint) {
      setBlueprintList([res.blueprint, ...blueprintList])
      setTitle("")
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
      setStatusMsg({ type: "success", text: "Floor plan / blueprint uploaded successfully!" })
      setTimeout(() => window.location.reload(), 1000)
    } else {
      setStatusMsg({ type: "error", text: res.error || "Failed to upload blueprint." })
    }
  }

  const handleDelete = async (blueprintId: string) => {
    if (!confirm("Are you sure you want to delete this technical drawing?")) return

    setIsDeleting(blueprintId)
    setStatusMsg(null)

    const res = await deleteNrhoBlueprint(blueprintId, projectId)
    setIsDeleting(null)

    if (res.success) {
      setBlueprintList(blueprintList.filter((b) => b.id !== blueprintId))
      setStatusMsg({ type: "success", text: "Drawing removed successfully." })
    } else {
      setStatusMsg({ type: "error", text: res.error || "Failed to delete drawing." })
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "0 KB"
    const kb = bytes / 1024
    if (kb > 1024) {
      return `${(kb / 1024).toFixed(2)} MB`
    }
    return `${kb.toFixed(1)} KB`
  }

  return (
    <div className="space-y-6">
      {/* Upload Dropzone Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Upload className="w-4 h-4 text-emerald-600" />
              Upload Floor Plan / Blueprint / Architectural Drawing
            </h3>
            <p className="text-xs text-slate-500">
              Supports technical PDF documents (architectural drawings, schematics) and site photos (JPG, PNG).
            </p>
          </div>
        </div>

        <form onSubmit={handleUpload} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Drawing Title / Description <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Ground Floor Architectural Layout Plan"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select File (PDF / Image) <span className="text-rose-500">*</span>
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-700 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div className="text-[11px] text-slate-500">
              {selectedFile ? (
                <span className="text-emerald-700 font-medium">
                  ✓ Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </span>
              ) : (
                "Recommended formats: PDF for CAD architectural blueprints, JPG/PNG for site visuals."
              )}
            </div>

            <button
              type="submit"
              disabled={isUploading || !selectedFile}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold uppercase rounded-xl flex items-center gap-2 transition-all shadow-sm"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Uploading Drawing...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Upload Drawing</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Status Alert Banner */}
      {statusMsg && (
        <div className={`p-4 rounded-xl flex items-center justify-between border ${
          statusMsg.type === "success" 
            ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
            : "bg-rose-50 border-rose-200 text-rose-800"
        }`}>
          <div className="flex items-center gap-2">
            {statusMsg.type === "success" ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-rose-600" />}
            <span className="text-sm font-medium">{statusMsg.text}</span>
          </div>
          <button onClick={() => setStatusMsg(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Blueprints Gallery Grid */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              Project Blueprints &amp; Technical Drawings ({blueprintList.length})
            </h3>
            <p className="text-xs text-slate-500">
              Visual schematics and drawings for contractor reference and physical execution.
            </p>
          </div>
        </div>

        {blueprintList.length === 0 ? (
          <div className="p-12 text-center">
            <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-slate-700">No Drawings Uploaded Yet</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Use the upload panel above to attach floor plans, electrical single-line diagrams, or plumbing layouts.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {blueprintList.map((bp) => {
              const isPdf = bp.fileType === "PDF" || bp.fileUrl.startsWith("data:application/pdf") || bp.fileUrl.endsWith(".pdf")
              return (
                <div 
                  key={bp.id} 
                  className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl overflow-hidden transition-all flex flex-col group shadow-sm"
                >
                  {/* Thumbnail / Preview Area */}
                  <div 
                    onClick={() => setPreviewBlueprint(bp)}
                    className="h-44 bg-slate-100 relative flex items-center justify-center cursor-pointer overflow-hidden border-b border-slate-200"
                  >
                    {isPdf ? (
                      <div className="text-center p-4">
                        <FileText className="w-16 h-16 text-rose-500 mx-auto mb-2 opacity-80 group-hover:scale-110 transition-transform" />
                        <span className="text-[11px] font-mono font-bold text-rose-700 uppercase tracking-wider bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                          PDF Technical Drawing
                        </span>
                      </div>
                    ) : (
                      <img
                        src={bp.fileUrl}
                        alt={bp.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.currentTarget.style.display = "none"
                        }}
                      />
                    )}

                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <span className="px-3 py-1.5 bg-white text-slate-900 text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-md border border-slate-200">
                        <Maximize2 className="w-3.5 h-3.5 text-emerald-600" />
                        Fullscreen Preview
                      </span>
                    </div>

                    <div className="absolute top-2 left-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        isPdf 
                          ? "bg-rose-50 text-rose-700 border border-rose-200" 
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      }`}>
                        {bp.fileType || (isPdf ? "PDF" : "IMAGE")}
                      </span>
                    </div>
                  </div>

                  {/* Info & Metadata */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 line-clamp-1 mb-1" title={bp.title}>
                        {bp.title}
                      </h4>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <span>{formatFileSize(bp.fileSize)}</span>
                        <span>•</span>
                        <span>
                          {new Date(bp.createdAt).toLocaleDateString("en-US", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric"
                          })}
                        </span>
                      </div>
                      {bp.uploadedBy && (
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Uploaded by: {bp.uploadedBy}
                        </p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100">
                      <button
                        onClick={() => setPreviewBlueprint(bp)}
                        className="text-xs text-slate-700 hover:text-emerald-700 flex items-center gap-1 font-medium transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <a
                          href={bp.fileUrl}
                          download={bp.title}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Download"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>

                        <button
                          onClick={() => handleDelete(bp.id)}
                          disabled={isDeleting === bp.id}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Delete Drawing"
                        >
                          {isDeleting === bp.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* FULLSCREEN PREVIEW MODAL */}
      {previewBlueprint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden shadow-2xl relative">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-200">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{previewBlueprint.title}</h3>
                  <p className="text-xs text-slate-500">
                    Uploaded on {new Date(previewBlueprint.createdAt).toLocaleDateString("en-US")} • {formatFileSize(previewBlueprint.fileSize)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={previewBlueprint.fileUrl}
                  download={previewBlueprint.title}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors border border-slate-200"
                >
                  <Download className="w-4 h-4" />
                  <span>Open in New Tab / Download</span>
                </a>
                <button
                  onClick={() => setPreviewBlueprint(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content Preview Body */}
            <div className="flex-1 bg-slate-100 p-4 overflow-auto flex items-center justify-center">
              {previewBlueprint.fileType === "PDF" || previewBlueprint.fileUrl.startsWith("data:application/pdf") || previewBlueprint.fileUrl.endsWith(".pdf") ? (
                <iframe
                  src={previewBlueprint.fileUrl}
                  title={previewBlueprint.title}
                  className="w-full h-full rounded-xl border border-slate-200 bg-white"
                />
              ) : (
                <img
                  src={previewBlueprint.fileUrl}
                  alt={previewBlueprint.title}
                  className="max-w-full max-h-full object-contain rounded-xl shadow-md"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
