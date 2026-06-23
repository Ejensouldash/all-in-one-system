import { GoogleGenerativeAI } from "@google/generative-ai"
import fs from "fs"
import path from "path"

const envFile = fs.readFileSync(path.join(process.cwd(), ".env"), "utf-8")
const match = envFile.match(/GEMINI_API_KEY=(.*)/)
const apiKey = match ? match[1].trim() : ""

if (!apiKey) {
  console.log("No API key found")
  process.exit(1)
}

const genAI = new GoogleGenerativeAI(apiKey)

async function list() {
  try {
    const models = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`).then(res => res.json())
    console.log(models.models.map(m => m.name).filter(n => n.includes("gemini")))
  } catch (err) {
    console.error(err)
  }
}

list()
