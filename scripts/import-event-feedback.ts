/**
 * Backfill event satisfaction feedback from an external spreadsheet (e.g. a Google Forms
 * export used when a past event did not run through the in-system QR feedback link).
 *
 * Safety model:
 *   - Dry-run by default. Nothing is written unless `--apply` is passed.
 *   - Header-driven mapping (column order does not matter, Google Forms headers are matched
 *     by name), strict validation, and per-row error reporting.
 *   - Idempotent: rows already present for the event (same respondent + satisfaction +
 *     comments + timestamp) are skipped, so the script can be re-run safely.
 *   - Every inserted row is tagged `source = EXCEL_IMPORT` and the batch is recorded in
 *     AuditLog with the file name and inserted row ids.
 *   - The Event Success Rate snapshot is recomputed with the app's own engine afterwards.
 *
 * Usage (Windows PowerShell, from the repo root):
 *   $env:TS_NODE_TRANSPILE_ONLY="true"; $env:TS_NODE_PROJECT="tsconfig.scripts.json"
 *   node node_modules/ts-node/dist/bin.js -r tsconfig-paths/register `
 *     scripts/import-event-feedback.ts --file "C:\path\form.xlsx" --event EV-MKT-2026-0007
 *   # then add --apply (and optionally --analyze) once the dry-run looks right
 *
 * Options:
 *   --event <requestNumber|id|exact event name>   (required)
 *   --file <xlsx path>                            (required)
 *   --sheet <name>                                (default: first sheet)
 *   --apply                                       write to the database
 *   --analyze                                     run Gemini sentiment after insert (implies --apply)
 *   --created-at start|completion|now             (default: start)
 *   --trim-typos                                  apply a small fixed typo map (off by default)
 */

import ExcelJS from "exceljs"
import fs from "node:fs"
import path from "node:path"
import { prisma } from "@/lib/prisma"
import { recomputeEventScore } from "@/lib/marketing/event-success-rate-server"
import {
  analyzeFeedbackBatch,
  buildFeedbackText,
  chunkArray,
  feedbackTextHash,
  SENTIMENT_BATCH_SIZE,
  SENTIMENT_MODEL,
} from "@/lib/marketing/feedback-sentiment"

const SATISFACTION_MAP: Record<string, string> = {
  "extremely satisfied": "EXTREMELY_SATISFIED",
  "very satisfied": "VERY_SATISFIED",
  "somewhat satisfied": "SOMEWHAT_SATISFIED",
  "not so satisfied": "NOT_SO_SATISFIED",
  "not at all satisfied": "NOT_AT_ALL_SATISFIED",
}

const SATISFACTION_ENUM = new Set(Object.values(SATISFACTION_MAP))

/** Excel wall-clock times are Malaysia time (UTC+8); Prisma stores UTC. */
const KL_OFFSET_MS = 8 * 60 * 60 * 1000

const TYPO_MAP: Array<[RegExp, string]> = [[/\benviromenr\b/gi, "environment"]]

type Args = {
  event: string
  file: string
  sheet?: string
  apply: boolean
  analyze: boolean
  createdAt: "start" | "completion" | "now"
  trimTypos: boolean
}

type ColumnMap = {
  name: number
  likedMost: number
  likedLeast: number
  satisfaction: number
  wellOrganized: number
  comments: number
  start: number
  completion: number
}

type ParsedRow = {
  excelRow: number
  respondentName: string
  likedMost: string
  likedLeast: string
  satisfaction: string
  wellOrganized: boolean
  comments: string
  createdAt: Date
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    event: "",
    file: "",
    apply: false,
    analyze: false,
    createdAt: "start",
    trimTypos: false,
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    switch (arg) {
      case "--event":
        args.event = argv[++i] ?? ""
        break
      case "--file":
        args.file = argv[++i] ?? ""
        break
      case "--sheet":
        args.sheet = argv[++i]
        break
      case "--apply":
        args.apply = true
        break
      case "--analyze":
        args.analyze = true
        args.apply = true
        break
      case "--created-at": {
        const value = argv[++i]
        if (value !== "start" && value !== "completion" && value !== "now") {
          throw new Error("--created-at must be start, completion or now")
        }
        args.createdAt = value
        break
      }
      case "--trim-typos":
        args.trimTypos = true
        break
      default:
        throw new Error(`Unknown argument: ${arg}`)
    }
  }

  if (!args.event) throw new Error("Missing --event <requestNumber|id|event name>")
  if (!args.file) throw new Error("Missing --file <xlsx path>")
  return args
}

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[^a-z0-9/ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function locateColumns(headers: Map<number, string>): ColumnMap {
  const tryFind = (test: (header: string) => boolean): number | null => {
    for (const [col, header] of headers) {
      if (test(header)) return col
    }
    return null
  }

  const find = (test: (header: string) => boolean, label: string): number => {
    const col = tryFind(test)
    if (col === null) {
      throw new Error(
        `Cannot find the "${label}" column. Headers found: ${[...headers.values()]
          .map((h) => `"${h}"`)
          .join(", ")}`
      )
    }
    return col
  }

  // Google Forms exports carry an empty "Name" column before "Please enter your name";
  // prefer the answered question and only fall back to a generic name column.
  const nameCol =
    tryFind((h) => h === "please enter your name") ??
    tryFind((h) => h === "respondent name") ??
    find((h) => h === "name", "Please enter your name")

  return {
    name: nameCol,
    likedMost: find((h) => h.includes("what did you like most"), "What did you like most"),
    likedLeast: find((h) => h.includes("what did you like least"), "What did you like least"),
    satisfaction: find((h) => h.includes("how satisfied"), "How satisfied were you"),
    wellOrganized: find((h) => h.includes("well organized") || h.includes("well organised"), "Well organized"),
    comments: find((h) => h.includes("comments") || h.includes("suggestions"), "Comments/Suggestions"),
    start: find((h) => h === "start time" || h === "timestamp", "Start time"),
    completion: find((h) => h === "completion time", "Completion time"),
  }
}

function cellText(ws: ExcelJS.Worksheet, row: number, col: number): string {
  const value = ws.getRow(row).getCell(col).value
  if (value === null || value === undefined) return ""
  if (typeof value === "object" && "text" in (value as object)) {
    return String((value as { text: string }).text ?? "")
  }
  if (typeof value === "object" && "richText" in (value as object)) {
    return (value as { richText: Array<{ text: string }> }).richText.map((part) => part.text).join("")
  }
  if (typeof value === "object" && "result" in (value as object)) {
    return String((value as { result: unknown }).result ?? "")
  }
  return String(value)
}

/**
 * exceljs returns spreadsheet wall-clock dates as UTC components (14:34 becomes 14:34Z).
 * Treat those components as Malaysia time and shift to the real UTC instant.
 */
function klWallClockToUtc(value: unknown): Date {
  if (value instanceof Date) {
    return new Date(value.getTime() - KL_OFFSET_MS)
  }
  throw new Error("Expected a date cell")
}

function normalizeSatisfaction(raw: string): string | null {
  const value = raw.trim().toLowerCase().replace(/\s+/g, " ")
  if (SATISFACTION_MAP[value]) return SATISFACTION_MAP[value]
  const upper = value.toUpperCase().replace(/ /g, "_")
  return SATISFACTION_ENUM.has(upper) ? upper : null
}

function normalizeBoolean(raw: string): boolean | null {
  const value = raw.trim().toLowerCase()
  if (["yes", "y", "true", "1"].includes(value)) return true
  if (["no", "n", "false", "0"].includes(value)) return false
  return null
}

function applyTypos(text: string): string {
  return TYPO_MAP.reduce((acc, [pattern, replacement]) => acc.replace(pattern, replacement), text)
}

function normalizeText(raw: string, trimTypos: boolean): string {
  const trimmed = raw.trim()
  return trimTypos ? applyTypos(trimmed) : trimmed
}

function fmtKl(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kuala_Lumpur",
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(date)
}

async function resolveEvent(selector: string) {
  const byId = await prisma.marketingEventRequisition.findUnique({
    where: { id: selector },
    select: { id: true, requestNumber: true, eventName: true, status: true },
  })
  if (byId) return byId

  const byRequestNumber = await prisma.marketingEventRequisition.findUnique({
    where: { requestNumber: selector },
    select: { id: true, requestNumber: true, eventName: true, status: true },
  })
  if (byRequestNumber) return byRequestNumber

  const byName = await prisma.marketingEventRequisition.findMany({
    where: { eventName: { equals: selector, mode: "insensitive" } },
    select: { id: true, requestNumber: true, eventName: true, status: true },
  })
  if (byName.length === 1) return byName[0]
  if (byName.length > 1) {
    throw new Error(`Event name "${selector}" is ambiguous: ${byName.map((e) => e.requestNumber).join(", ")}`)
  }
  throw new Error(`No event matches "${selector}" (id, request number or exact name).`)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  if (!fs.existsSync(args.file)) {
    throw new Error(`File not found: ${args.file}`)
  }

  const event = await resolveEvent(args.event)
  const report = await prisma.marketingPostEventReport.findUnique({
    where: { requisitionId: event.id },
    select: { id: true, status: true, eventSuccessRate: true, scoreComputedAt: true },
  })

  console.log("=".repeat(78))
  console.log(`Event      : ${event.eventName} (${event.requestNumber}) [${event.status}]`)
  console.log(`Report     : ${report ? `${report.status}, score ${report.eventSuccessRate}` : "none"}`)
  console.log(`File       : ${args.file}`)
  console.log(`Mode       : ${args.apply ? "APPLY (writes to database)" : "DRY-RUN (no writes)"}`)
  console.log(`createdAt  : ${args.createdAt}`)
  console.log("=".repeat(78))

  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(args.file)
  const ws = args.sheet ? wb.getWorksheet(args.sheet) : wb.worksheets[0]
  if (!ws) throw new Error(`Sheet "${args.sheet ?? ""}" not found`)

  const headers = new Map<number, string>()
  ws.getRow(1).eachCell((cell, col) => headers.set(col, normalizeHeader(cell.value)))
  const cols = locateColumns(headers)

  const rows: ParsedRow[] = []
  const errors: string[] = []

  for (let r = 2; r <= ws.rowCount; r++) {
    const name = cellText(ws, r, cols.name).trim()
    const likedMost = cellText(ws, r, cols.likedMost)
    const likedLeast = cellText(ws, r, cols.likedLeast)
    const satisfactionRaw = cellText(ws, r, cols.satisfaction)
    const organizedRaw = cellText(ws, r, cols.wellOrganized)
    const comments = cellText(ws, r, cols.comments)

    // Skip fully empty rows (trailing formatting rows are common in form exports).
    if (!name && !likedMost && !likedLeast && !satisfactionRaw && !comments) continue

    const rowErrors: string[] = []
    if (!name) rowErrors.push("missing respondent name")
    if (!likedMost.trim()) rowErrors.push("missing 'liked most'")
    if (!likedLeast.trim()) rowErrors.push("missing 'liked least'")
    if (!comments.trim()) rowErrors.push("missing comments")
    if (name.length > 100) rowErrors.push("name exceeds 100 characters")
    if (likedMost.length > 2000) rowErrors.push("'liked most' exceeds 2000 characters")
    if (likedLeast.length > 2000) rowErrors.push("'liked least' exceeds 2000 characters")
    if (comments.length > 5000) rowErrors.push("comments exceed 5000 characters")

    const satisfaction = normalizeSatisfaction(satisfactionRaw)
    if (!satisfaction) rowErrors.push(`unrecognised satisfaction "${satisfactionRaw}"`)

    const wellOrganized = normalizeBoolean(organizedRaw)
    if (wellOrganized === null) rowErrors.push(`unrecognised well-organized answer "${organizedRaw}"`)

    let createdAt: Date | null = null
    if (args.createdAt !== "now") {
      const sourceCol = args.createdAt === "start" ? cols.start : cols.completion
      const rawDate = ws.getRow(r).getCell(sourceCol).value
      try {
        createdAt = klWallClockToUtc(rawDate)
      } catch {
        rowErrors.push(`invalid ${args.createdAt} date`)
      }
    } else {
      createdAt = new Date()
    }

    if (rowErrors.length > 0) {
      errors.push(`row ${r}: ${rowErrors.join("; ")}`)
      continue
    }

    rows.push({
      excelRow: r,
      respondentName: name,
      likedMost: normalizeText(likedMost, args.trimTypos),
      likedLeast: normalizeText(likedLeast, args.trimTypos),
      satisfaction: satisfaction!,
      wellOrganized: wellOrganized!,
      comments: normalizeText(comments, args.trimTypos),
      createdAt: createdAt!,
    })
  }

  console.log(`Parsed ${rows.length} valid response(s); ${errors.length} row(s) with errors.`)
  for (const error of errors) console.log(`  ERROR ${error}`)
  if (errors.length > 0) {
    throw new Error("Fix the rows above (or export a clean sheet) before importing. Nothing was written.")
  }

  // Existing rows for idempotency.
  const existing = await prisma.marketingEventFeedback.findMany({
    where: { requisitionId: event.id },
    select: { respondentName: true, satisfaction: true, comments: true, createdAt: true },
  })
  const keyOf = (row: { respondentName: string; satisfaction: string; comments: string; createdAt: Date }) =>
    [row.respondentName.trim().toLowerCase(), row.satisfaction, row.comments.trim().toLowerCase(), row.createdAt.toISOString()].join("|")

  const existingKeys = new Set(existing.map(keyOf))
  const seen = new Set<string>()
  const toInsert: ParsedRow[] = []
  const skipped: ParsedRow[] = []

  for (const row of rows) {
    const key = keyOf(row)
    if (existingKeys.has(key) || seen.has(key)) {
      skipped.push(row)
      continue
    }
    seen.add(key)
    toInsert.push(row)
  }

  console.log(`To insert: ${toInsert.length}; already present/skipped: ${skipped.length}`)
  for (const row of toInsert) {
    console.log(
      `  row ${String(row.excelRow).padStart(3)} | ${row.respondentName.slice(0, 30).padEnd(30)} | ${row.satisfaction.padEnd(20)} | ${fmtKl(row.createdAt)} MYT`
    )
  }
  for (const row of skipped) {
    console.log(`  SKIP row ${row.excelRow} | ${row.respondentName} (already imported)`)
  }

  if (!args.apply) {
    console.log("\nDry-run complete. Nothing written. Re-run with --apply to insert.")
    return
  }

  if (toInsert.length === 0) {
    console.log("\nNothing new to insert (all rows are already present).")
  } else {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-")
    const manifestDir = path.join(process.cwd(), "backups")
    fs.mkdirSync(manifestDir, { recursive: true })
    const manifestFile = path.join(manifestDir, `${event.requestNumber}-feedback-import-${stamp}.json`)

    const insertedIds: string[] = []

    await prisma.$transaction(async (tx) => {
      for (const row of toInsert) {
        const created = await tx.marketingEventFeedback.create({
          data: {
            requisitionId: event.id,
            respondentName: row.respondentName,
            likedMost: row.likedMost,
            likedLeast: row.likedLeast,
            satisfaction: row.satisfaction,
            wellOrganized: row.wellOrganized,
            comments: row.comments,
            source: "EXCEL_IMPORT",
            createdAt: row.createdAt,
          },
          select: { id: true },
        })
        insertedIds.push(created.id)
      }

      await tx.auditLog.create({
        data: {
          userId: null,
          userName: "System Import (Excel)",
          action: "Imported event satisfaction feedback from Excel",
          details: JSON.stringify({
            file: path.basename(args.file),
            eventId: event.id,
            requestNumber: event.requestNumber,
            eventName: event.eventName,
            imported: insertedIds.length,
            skipped: skipped.length,
            source: "EXCEL_IMPORT",
            createdAtSource: args.createdAt,
            ids: insertedIds,
          }),
        },
      })
    })

    fs.writeFileSync(
      manifestFile,
      JSON.stringify(
        {
          importedAt: new Date().toISOString(),
          file: args.file,
          event,
          createdAtSource: args.createdAt,
          insertedIds,
          rows: toInsert.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
        },
        null,
        2
      ),
      "utf8"
    )

    console.log(`\nInserted ${insertedIds.length} response(s). Manifest: ${manifestFile}`)
  }

  const before = report?.eventSuccessRate ?? null
  const breakdown = await recomputeEventScore(event.id)
  if (breakdown) {
    console.log(
      `Success rate recomputed: ${before ?? "n/a"} -> ${breakdown.total} | flags: ${
        breakdown.flags.length ? breakdown.flags.join(", ") : "none"
      }`
    )
    console.log(
      `  satisfaction ${breakdown.components.satisfaction.earned}/${breakdown.components.satisfaction.max} (index ${breakdown.components.satisfaction.index}, ${breakdown.components.satisfaction.responses} responses)`
    )
  } else {
    console.log("No post-event report found; score was not recomputed.")
  }

  if (args.analyze) {
    console.log("\nRunning Gemini sentiment analysis...")
    const all = await prisma.marketingEventFeedback.findMany({
      where: { requisitionId: event.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, likedLeast: true, comments: true, aiSentiment: true, aiTextHash: true },
    })

    const pending = all
      .map((row) => {
        const text = buildFeedbackText({ likedLeast: row.likedLeast, comments: row.comments })
        return { row, text, hash: feedbackTextHash(text) }
      })
      .filter((item) => item.text.length > 0)
      .filter((item) => !item.row.aiSentiment || item.row.aiTextHash !== item.hash)

    let analyzed = 0
    const failures: string[] = []

    for (const chunk of chunkArray(pending, SENTIMENT_BATCH_SIZE)) {
      const inputs = chunk.map((item, index) => ({ index: index + 1, text: item.text }))
      try {
        const results = await analyzeFeedbackBatch(inputs)
        await Promise.all(
          results.map((result) => {
            const item = chunk[result.index - 1]
            if (!item) return Promise.resolve(null)
            return prisma.marketingEventFeedback.update({
              where: { id: item.row.id },
              data: {
                aiSentiment: result.sentiment,
                aiConfidence: result.confidence,
                aiReason: result.reason || null,
                aiModel: SENTIMENT_MODEL,
                aiTextHash: item.hash,
                aiAnalyzedAt: new Date(),
              },
            })
          })
        )
        analyzed += results.length
      } catch (error) {
        failures.push(error instanceof Error ? error.message : String(error))
      }
    }

    console.log(`Gemini analysed ${analyzed}/${pending.length} response(s).`)
    for (const failure of failures) console.log(`  AI ERROR ${failure}`)

    const after = await recomputeEventScore(event.id)
    if (after) {
      console.log(
        `Success rate after analysis: ${after.total} | suggestion ${after.components.suggestion.earned}/${after.components.suggestion.max} (good ${after.components.suggestion.good}, neutral ${after.components.suggestion.neutral}, bad ${after.components.suggestion.bad})`
      )
    }
    if (failures.length > 0) {
      process.exitCode = 2
    }
  }
}

main()
  .catch((error) => {
    console.error("\nIMPORT FAILED:", error instanceof Error ? error.message : error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
