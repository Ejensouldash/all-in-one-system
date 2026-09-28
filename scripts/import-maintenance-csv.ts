import fs from "fs"
import path from "path"
import { prisma } from "../src/lib/prisma"
const MaintenanceTicketType = {
  MECHANICAL: "MECHANICAL",
  CIVIL: "CIVIL",
  ELECTRICAL: "ELECTRICAL",
  OTHERS: "OTHERS",
} as const
type MaintenanceTicketType = typeof MaintenanceTicketType[keyof typeof MaintenanceTicketType]

const MaintenanceTicketPriority = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  URGENT: "URGENT",
} as const
type MaintenanceTicketPriority = typeof MaintenanceTicketPriority[keyof typeof MaintenanceTicketPriority]

const MaintenanceTicketStatus = {
  OPEN: "OPEN",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  REJECTED: "REJECTED",
} as const
type MaintenanceTicketStatus = typeof MaintenanceTicketStatus[keyof typeof MaintenanceTicketStatus]

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ""
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

function parsePriority(val: string): MaintenanceTicketPriority {
  const v = val.toLowerCase()
  if (v.includes("high") || v.includes("<3 days")) return MaintenanceTicketPriority.HIGH
  if (v.includes("low") || v.includes(">14 days")) return MaintenanceTicketPriority.LOW
  return MaintenanceTicketPriority.MEDIUM
}

function parseStatus(val: string): MaintenanceTicketStatus {
  const v = val.toLowerCase()
  if (v.includes("completed")) return MaintenanceTicketStatus.COMPLETED
  if (v.includes("in progress")) return MaintenanceTicketStatus.IN_PROGRESS
  if (v.includes("cancel")) return MaintenanceTicketStatus.CANCELLED
  if (v.includes("not approved")) return MaintenanceTicketStatus.REJECTED
  return MaintenanceTicketStatus.OPEN
}

function detectTicketType(desc: string, reason: string): MaintenanceTicketType {
  const text = `${desc} ${reason}`.toLowerCase()
  if (
    text.includes("wiring") || 
    text.includes("cable") || 
    text.includes("lan") || 
    text.includes("socket") || 
    text.includes("plug") || 
    text.includes("lampu") || 
    text.includes("light") || 
    text.includes("electric") || 
    text.includes("power") || 
    text.includes("charger")
  ) {
    return MaintenanceTicketType.ELECTRICAL
  }

  if (
    text.includes("floor") || 
    text.includes("dinding") || 
    text.includes("wall") || 
    text.includes("roof") || 
    text.includes("bumbung") || 
    text.includes("siling") || 
    text.includes("ceiling") || 
    text.includes("tandas") || 
    text.includes("toilet") || 
    text.includes("sinki") || 
    text.includes("sink") || 
    text.includes("paint") || 
    text.includes("cat") || 
    text.includes("papan tanda") || 
    text.includes("signboard") || 
    text.includes("tank house") || 
    text.includes("epoxy")
  ) {
    return MaintenanceTicketType.CIVIL
  }

  return MaintenanceTicketType.MECHANICAL
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === "" || dateStr === "0") return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  return d
}

async function main() {
  const csvPath = "C:\\Users\\user\\Downloads\\BOSB-PFMD-850-001-QR01 (Work Request Form)(Sheet1).csv"
  if (!fs.existsSync(csvPath)) {
    console.error(`CSV file not found at: ${csvPath}`)
    return
  }

  const content = fs.readFileSync(csvPath, "utf-8")
  // Normalize multi-line records in CSV
  const rawRows: string[] = []
  let currentRow = ""
  let inQuotes = false

  for (let i = 0; i < content.length; i++) {
    const char = content[i]
    if (char === '"') {
      if (inQuotes && content[i + 1] === '"') {
        currentRow += '""'
        i++
      } else {
        inQuotes = !inQuotes
        currentRow += char
      }
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && content[i + 1] === '\n') {
        i++
      }
      if (currentRow.trim()) {
        rawRows.push(currentRow)
      }
      currentRow = ""
    } else {
      currentRow += char
    }
  }
  if (currentRow.trim()) rawRows.push(currentRow)

  console.log(`Total raw lines parsed: ${rawRows.length}`)
  // Skip the first 2 rows (header banner and column headers)
  const dataRows = rawRows.slice(2)

  let importedCount = 0
  let skippedCount = 0

  for (const row of dataRows) {
    const cols = parseCsvLine(row)
    if (cols.length < 5) {
      skippedCount++
      continue
    }

    const srNo = cols[0]?.trim()
    const requestDateTime = parseDate(cols[1]?.trim()) || new Date()
    const workDescription = cols[2]?.trim() || "No Description"
    const reasonOfWork = cols[3]?.trim() || null
    const locationArea = cols[4]?.trim() || "Kilang Botol Pedas (KBP)"
    const levelOfPriority = cols[5]?.trim() || "Medium"
    const requestBy = cols[6]?.trim() || "Staff"
    const pic = cols[7]?.trim() || null
    const projectId = cols[8]?.trim() || null
    const targetStartDate = parseDate(cols[9]?.trim())
    const targetDateline = parseDate(cols[10]?.trim())
    const estimatedDays = parseFloat(cols[11]?.trim()) || null
    const statusStr = cols[12]?.trim() || "Open"
    const remark = cols[13]?.trim() || null
    const completedDate = parseDate(cols[14]?.trim())
    const kpiStatus = cols[16]?.trim() || (statusStr.toLowerCase().includes("completed") ? "On Time" : null)

    const ticketType = detectTicketType(workDescription, reasonOfWork || "")
    const priority = parsePriority(levelOfPriority)
    const status = parseStatus(statusStr)

    // Check if record with this legacyProjectId or workDescription already imported
    const existing = await prisma.maintenanceTicket.findFirst({
      where: {
        OR: [
          ...(projectId ? [{ legacyProjectId: projectId }] : []),
          { title: workDescription, createdAt: requestDateTime },
        ],
      },
    })

    if (!existing) {
      await prisma.maintenanceTicket.create({
        data: {
          title: workDescription,
          reasonOfWork,
          ticketType,
          priority,
          status,
          location: locationArea,
          requesterName: requestBy,
          requesterPhone: "-",
          legacyProjectId: projectId,
          assigneeName: pic,
          targetStartDate,
          targetDateline,
          estimatedDays,
          completedAt: completedDate,
          kpiStatus,
          internalNotes: remark,
          createdAt: requestDateTime,
        },
      })
      importedCount++
    } else {
      skippedCount++
    }
  }

  console.log(`Import completed: ${importedCount} records imported, ${skippedCount} skipped.`)
}

main()
  .catch((e) => {
    console.error("Migration error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
