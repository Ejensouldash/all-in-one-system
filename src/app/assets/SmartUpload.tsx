"use client"

import { useState } from "react"
import { read, utils } from "xlsx"
import { UploadCloud, CheckCircle2, AlertCircle } from "lucide-react"
import { bulkImportAssets } from "../actions/asset"
import { useRouter } from "next/navigation"

export function SmartUpload() {
  const router = useRouter()
  const [dataPreview, setDataPreview] = useState<any[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [status, setStatus] = useState<{type: 'success' | 'error', message: string} | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      const bstr = evt.target?.result
      const wb = read(bstr, { type: 'binary' })
      const wsname = wb.SheetNames[0]
      const ws = wb.Sheets[wsname]
      const data = utils.sheet_to_json(ws)
      setDataPreview(data)
    }
    reader.readAsBinaryString(file)
  }

  const handleConfirmImport = async () => {
    setIsUploading(true)
    setStatus(null)
    try {
      const sanitizedData = JSON.parse(JSON.stringify(dataPreview))
      const result = await bulkImportAssets(sanitizedData)
      if (result.success) {
        setStatus({ type: 'success', message: `Successfully imported ${result.count} assets!` })
        setDataPreview([])
        router.refresh() // Refresh the server component to show new data
      } else {
        setStatus({ type: 'error', message: result.error || 'Failed to import assets' })
      }
    } catch (error) {
      setStatus({ type: 'error', message: 'An unexpected error occurred.' })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center text-sm font-semibold bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 hover:text-blue-600 transition-colors shadow-sm"
      >
        <UploadCloud className="h-4 w-4 mr-2" /> Bulk Upload Assets
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="font-bold text-lg flex items-center"><UploadCloud className="h-5 w-5 mr-2 text-blue-500" /> Smart Asset Importer</h2>
              <button onClick={() => { setIsOpen(false); setDataPreview([]); setStatus(null); }} className="text-gray-400 hover:text-gray-600">Close</button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {status && (
                <div className={`p-4 rounded-lg flex items-center animate-in slide-in-from-top-2 ${status.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                  {status.type === 'success' ? <CheckCircle2 className="h-5 w-5 mr-3 text-emerald-500" /> : <AlertCircle className="h-5 w-5 mr-3 text-red-500" />}
                  {status.message}
                </div>
              )}

              <div className="bg-gray-50 p-8 rounded-xl flex flex-col items-center justify-center border-dashed border-2 border-blue-200 hover:border-blue-400 transition-colors">
                <UploadCloud className="h-10 w-10 text-blue-500 mb-3" />
                <p className="text-sm text-gray-500 mb-4 text-center max-w-sm">
                  Upload your .xlsx or .csv file containing existing assets. The system will parse and map the columns automatically.
                </p>
                <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
                  Select Excel File
                  <input type="file" className="hidden" accept=".xlsx, .csv" onChange={handleFileUpload} />
                </label>
              </div>

              {dataPreview.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-semibold text-gray-800">Data Preview <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full ml-2">{dataPreview.length} records</span></h3>
                    <button 
                      onClick={handleConfirmImport}
                      disabled={isUploading}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-md text-sm font-medium transition-colors flex items-center shadow-sm disabled:opacity-50"
                    >
                      {isUploading ? "Importing..." : "Confirm & Import"}
                    </button>
                  </div>
                  <div className="overflow-x-auto max-h-64">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          {Object.keys(dataPreview[0]).map((key) => (
                            <th key={key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {dataPreview.slice(0, 5).map((row, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            {Object.values(row).map((val: any, j) => (
                              <td key={j} className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {val?.toString()}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {dataPreview.length > 5 && (
                    <div className="p-3 text-center text-xs text-gray-500 bg-gray-50 border-t border-gray-100 font-medium">
                      Showing first 5 rows. {dataPreview.length - 5} more records pending.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
