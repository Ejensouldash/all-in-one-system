import ExcelJS from "exceljs"
import { createHash } from "node:crypto"
import { frequencyRule, normalizeEquipment, validDate, type PMGroup, type PMSourceRow } from "./pm-core"

const hash = (text: string) => createHash("sha256").update(text).digest("hex")
export function suggestGroups(rows: PMSourceRow[]): PMGroup[] {
  const groups = new Map<string, PMGroup>()
  for (const row of rows) {
    const equipment = normalizeEquipment(row.equipment)
    const rule = frequencyRule(row.frequency)
    const sourceKey = hash(JSON.stringify([equipment.toLowerCase(), row.srs, rule]))
    const group = groups.get(sourceKey) || { sourceKey, equipment, srs: row.srs, ...rule, startDate: row.date, checklist: [], picIds: [], sourceRows: [], reviewed: false }
    group.startDate = group.startDate < row.date ? group.startDate : row.date
    if (!group.checklist.includes(row.task)) group.checklist.push(row.task)
    group.sourceRows.push(row)
    groups.set(sourceKey, group)
  }
  return [...groups.values()]
}

function getCellString(cell: ExcelJS.Cell | null | undefined): string {
  if (!cell) return ""
  const m = cell.master || cell
  if (m.value === null || m.value === undefined) return ""
  if (typeof m.value === "object" && "richText" in m.value && Array.isArray((m.value as any).richText)) {
    return (m.value as any).richText.map((t: any) => t.text).join("")
  }
  if (typeof m.text === "string") return m.text
  return String(m.value || "")
}

export async function parsePMWorkbook(buffer: Buffer): Promise<PMSourceRow[]> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0])
  const output: PMSourceRow[] = []
  for (const sheet of workbook.worksheets) {
    if (sheet.rowCount > 10000 || sheet.columnCount > 100) throw new Error("Fail terlalu besar. Had 10,000 baris dan 100 lajur setiap helaian.")
    let columns: number[] | null = null
    sheet.eachRow((row, number) => {
      const text = (col: number) => getCellString(row.getCell(col)).trim()
      const headers = new Map<string, number>()
      row.eachCell((cell, col) => {
        const txt = getCellString(cell).toUpperCase().replace(/\s+/g, " ").trim()
        if (txt) headers.set(txt, col)
      })
      const names = ["DATE", "EQUIPMENT NAME", "SRS NUMBER", "FREQUENCY", "MAINTENANCE PERSONNAL RESPONSIBLE", "STATUS"]
      if (names.every(name => headers.has(name))) { columns = names.map(name => headers.get(name)!); return }
      if (!columns) return
      const [dateCol, equipmentCol, srsCol, freqCol, picCol, taskCol] = columns
      if (!text(equipmentCol) || !text(freqCol)) return
      const cell = row.getCell(dateCol).master || row.getCell(dateCol)
      let date = ""
      if (cell.value instanceof Date) {
        const d = cell.value
        date = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`
      } else {
        const raw = getCellString(cell).trim()
        const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(raw)
        date = match ? `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}` : raw
      }
      if (!validDate(date)) throw new Error(`${sheet.name}, baris ${number}: tarikh tiada/tidak sah.`)
      if (!text(taskCol) || !text(picCol)) throw new Error(`${sheet.name}, baris ${number}: arahan/PIC tiada.`)
      frequencyRule(text(freqCol))
      output.push({ sheet: sheet.name, row: number, date, equipment: text(equipmentCol), srs: text(srsCol) || null, frequency: text(freqCol), pic: text(picCol), task: text(taskCol) })
    })
  }
  if (!output.length) throw new Error("Tiada jadual SGMP-03 dijumpai. Semak enam header Excel.")
  if (output.length > 2000) throw new Error("Maksimum 2,000 baris kerja setiap import.")
  return output
}
