import { NextRequest, NextResponse } from 'next/server';
import * as xlsx from 'xlsx';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GEMINI_MODEL, geminiUserMessage, generateGeminiJson } from "@/lib/ai/gemini";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const wb = xlsx.read(buffer, { type: 'buffer' });
    const data = xlsx.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]]);

    if (data.length === 0) {
      return NextResponse.json({ success: false, error: 'Excel file is empty' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "your-gemini-api-key") {
      return NextResponse.json({ success: false, error: 'Gemini API Key is missing' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: GEMINI_MODEL,
      generationConfig: { responseMimeType: "application/json" },
      systemInstruction: `You are an AI data parser. Your job is to convert raw Excel JSON rows into structured Asset objects.
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

If a field is unknown, leave it empty. Extract details intelligently (e.g. separate Name and Brand from a single string if possible).`
    });

    const parsedAssets = [];
    const chunkSize = 50;

    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      
      const prompt = `Map these raw rows to the requested JSON schema:\n${JSON.stringify(chunk)}`;
      try {
        const json = await generateGeminiJson<unknown>(async () => {
          const result = await model.generateContent(prompt);
          return result.response.text();
        });
        if (Array.isArray(json)) {
          parsedAssets.push(...json);
        } else if (json && typeof json === "object" && "assets" in json && Array.isArray(json.assets)) {
          parsedAssets.push(...json.assets);
        }
      } catch (e) {
        console.error("AI import chunk failed:", e);
        throw e;
      }
    }

    return NextResponse.json({ success: true, previewData: parsedAssets });
  } catch (error: unknown) {
    console.error("Import API Error:", error);
    return NextResponse.json({ success: false, error: geminiUserMessage(error, "Import gagal diproses. Sila semak fail dan cuba lagi.") }, { status: 500 });
  }
}
