import { NextRequest, NextResponse } from "next/server"
import * as xlsx from "xlsx"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { GEMINI_MODEL, geminiUserMessage, generateGeminiJson } from "@/lib/ai/gemini"

const IMPORT_SYSTEM_INSTRUCTION = `You are an AI data parser. Your job is to convert raw Excel JSON rows into structured Asset objects.
Return a JSON array of objects. Each object MUST have:
- departmentName: String (Full department name)
- departmentCode: String (3 letter code, e.g. HRD, FIN, MKT, ITD)
- type: String (Must be EXACTLY one of: ICT_EQUIPMENT, OFFICE_EQUIPMENT, EVENT_EQUIPMENT, TOOLS, SAFETY_EQUIPMENT, MACHINE, ELECTRICAL_EQUIPMENT, FURNITURE, VEHICLE, OTHER)
- categoryCode: String (3 letter code, e.g. ICT, FUR, VEH, EVT, OTH)
- name: String (Item category or name)
- brand: String
- model: String
- serialNumber: String
- assignedTo: String
- location: String
- description: String (Combine any extra useful info here)

If a field is unknown, leave it empty. Extract details intelligently (e.g. separate Name and Brand from a single string if possible). Return JSON only.`

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) return NextResponse.json({ success: false, error: "No file uploaded" }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const workbook = xlsx.read(buffer, { type: "buffer" })
    const data = xlsx.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[workbook.SheetNames[0]])

    if (data.length === 0) return NextResponse.json({ success: false, error: "Excel file is empty" }, { status: 400 })

    const geminiKey = process.env.GEMINI_API_KEY?.trim()
    const geminiModel = geminiKey && geminiKey !== "your-gemini-api-key"
      ? new GoogleGenerativeAI(geminiKey).getGenerativeModel({
        model: GEMINI_MODEL,
        generationConfig: { responseMimeType: "application/json" },
        systemInstruction: IMPORT_SYSTEM_INSTRUCTION,
      })
      : null

    if (!geminiModel) {
      return NextResponse.json({ success: false, error: "Gemini AI belum dikonfigurasi." }, { status: 500 })
    }

    const parsedAssets: unknown[] = []
    const chunkSize = 50

    for (let index = 0; index < data.length; index += chunkSize) {
      const chunk = data.slice(index, index + chunkSize)
      const prompt = `Map these raw rows to the requested JSON schema:\n${JSON.stringify(chunk)}`
      const json = await generateGeminiJson<unknown>(async () => {
        const result = await geminiModel.generateContent(prompt)
        return result.response.text()
      })

      if (Array.isArray(json)) {
        parsedAssets.push(...json)
      } else if (json && typeof json === "object" && "assets" in json && Array.isArray(json.assets)) {
        parsedAssets.push(...json.assets)
      }
    }

    return NextResponse.json({ success: true, previewData: parsedAssets })
  } catch (error: unknown) {
    console.error("Import API Error:", error)
    return NextResponse.json({
      success: false,
      error: geminiUserMessage(error, "Import gagal diproses. Sila semak fail dan cuba lagi."),
    }, { status: 500 })
  }
}
