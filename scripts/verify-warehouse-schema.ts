import "dotenv/config"
import { createHash, randomUUID } from "node:crypto"
import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import { Pool } from "pg"

const expectedTables = [
  "WarehouseGatePass",
  "WarehouseGatePassItem",
  "GatePassExternalToken",
  "GatePassVerificationToken",
  "GatePassStatusEvent",
  "GatePassDeliveryOrder",
  "PalletType",
  "PalletCustodian",
  "PalletTransfer",
  "PalletTransferLine",
  "PalletMovement",
] as const

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured.")
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
    connectionTimeoutMillis: 10_000,
  })

  let transactionOpen = false
  try {
    const dryRunMigration = process.argv.includes("--dry-run-migration")
    const smokeTransaction = process.argv.includes("--smoke-transaction")
    if (dryRunMigration || smokeTransaction) {
      await pool.query("BEGIN")
      transactionOpen = true
    }
    if (dryRunMigration) {
      const sql = await readFile(resolve("prisma/warehouse_gatepass_pallet_migration.sql"), "utf8")
      await pool.query(sql)
    }

    const tableResult = await pool.query<{ table_name: string }>(
      `SELECT table_name
         FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = ANY($1::text[])
        ORDER BY table_name`,
      [expectedTables],
    )
    const existing = new Set(tableResult.rows.map(row => row.table_name))
    const missing = expectedTables.filter(table => !existing.has(table))

    let seedCounts = { palletTypes: 0, systemCustodians: 0 }
    let persistentSmokeArtifacts = { gatePasses: 0, palletTransfers: 0 }
    if (missing.length === 0) {
      const seedResult = await pool.query<{ pallet_types: number; system_custodians: number }>(`
        SELECT
          (SELECT COUNT(*)::int FROM "PalletType" WHERE "code" = 'WOODEN_STANDARD') AS pallet_types,
          (SELECT COUNT(*)::int FROM "PalletCustodian"
            WHERE "kind" IN ('SYSTEM_OPENING', 'WAREHOUSE_USABLE', 'WAREHOUSE_DAMAGED', 'WRITTEN_OFF')) AS system_custodians
      `)
      seedCounts = {
        palletTypes: seedResult.rows[0]?.pallet_types || 0,
        systemCustodians: seedResult.rows[0]?.system_custodians || 0,
      }
      const artifactResult = await pool.query<{ gate_passes: number; pallet_transfers: number }>(`
        SELECT
          (SELECT COUNT(*)::int FROM "WarehouseGatePass" WHERE "gatePassNo" LIKE 'GP-SMOKE-%') AS gate_passes,
          (SELECT COUNT(*)::int FROM "PalletTransfer" WHERE "transferNo" LIKE 'PT-SMOKE-%') AS pallet_transfers
      `)
      persistentSmokeArtifacts = {
        gatePasses: artifactResult.rows[0]?.gate_passes || 0,
        palletTransfers: artifactResult.rows[0]?.pallet_transfers || 0,
      }
    }

    let smokeCounts: { gatePasses: number; palletTransfers: number; palletMovements: number } | null = null
    if (smokeTransaction) {
      if (missing.length) throw new Error(`Smoke test cannot run; missing tables: ${missing.join(", ")}`)
      const userResult = await pool.query<{ id: string }>(`SELECT "id" FROM "User" ORDER BY "createdAt" LIMIT 1`)
      const userId = userResult.rows[0]?.id
      if (!userId) throw new Error("Smoke test requires at least one existing AIO user for foreign-key validation.")

      const seedResult = await pool.query<{ pallet_type_id: string; opening_id: string; usable_id: string }>(`
        SELECT
          (SELECT "id" FROM "PalletType" WHERE "code" = 'WOODEN_STANDARD') AS pallet_type_id,
          (SELECT "id" FROM "PalletCustodian" WHERE "kind" = 'SYSTEM_OPENING' LIMIT 1) AS opening_id,
          (SELECT "id" FROM "PalletCustodian" WHERE "kind" = 'WAREHOUSE_USABLE' LIMIT 1) AS usable_id
      `)
      const seed = seedResult.rows[0]
      if (!seed?.pallet_type_id || !seed.opening_id || !seed.usable_id) throw new Error("Pallet seed data is incomplete.")

      const gatePassId = randomUUID()
      const itemId = randomUUID()
      const transferId = randomUUID()
      const transferLineId = randomUUID()
      const suffix = randomUUID().slice(0, 8).toUpperCase()
      await pool.query(`
        INSERT INTO "WarehouseGatePass" (
          "id", "gatePassNo", "purpose", "requestedPickupAt", "pickupLocation",
          "destination", "customerName", "createdById", "updatedAt"
        ) VALUES ($1, $2, 'Transactional smoke test', CURRENT_TIMESTAMP, 'TEST', 'TEST', 'TEST', $3, CURRENT_TIMESTAMP)
      `, [gatePassId, `GP-SMOKE-${suffix}`, userId])
      await pool.query(`
        INSERT INTO "WarehouseGatePassItem" ("id", "gatePassId", "description", "plannedQty")
        VALUES ($1, $2, 'Smoke item', 1)
      `, [itemId, gatePassId])
      await pool.query(`
        INSERT INTO "GatePassExternalToken" ("id", "gatePassId", "tokenHash", "expiresAt")
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP + INTERVAL '1 day')
      `, [randomUUID(), gatePassId, createHash("sha256").update(suffix).digest("hex")])
      await pool.query(`
        INSERT INTO "GatePassVerificationToken" ("id", "gatePassId", "publicCode")
        VALUES ($1, $2, $3)
      `, [randomUUID(), gatePassId, `VERIFY-${suffix}`])
      await pool.query(`
        INSERT INTO "GatePassStatusEvent" (
          "id", "gatePassId", "toStatus", "actorType", "actorUserId", "actorLabel"
        ) VALUES ($1, $2, 'DRAFT', 'INTERNAL_USER', $3, 'Schema smoke test')
      `, [randomUUID(), gatePassId, userId])
      await pool.query(`
        INSERT INTO "PalletTransfer" (
          "id", "transferNo", "status", "movementType", "gatePassId", "occurredAt",
          "fromCustodianId", "toCustodianId", "createdById", "postedById", "postedAt", "updatedAt"
        ) VALUES ($1, $2, 'POSTED', 'OPENING_BALANCE', $3, CURRENT_TIMESTAMP, $4, $5, $6, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [transferId, `PT-SMOKE-${suffix}`, gatePassId, seed.opening_id, seed.usable_id, userId])
      await pool.query(`
        INSERT INTO "PalletTransferLine" ("id", "transferId", "palletTypeId", "quantity")
        VALUES ($1, $2, $3, 1)
      `, [transferLineId, transferId, seed.pallet_type_id])
      await pool.query(`
        INSERT INTO "PalletMovement" (
          "id", "transferId", "transferLineId", "palletTypeId", "movementType",
          "fromCustodianId", "toCustodianId", "quantity", "createdById"
        ) VALUES ($1, $2, $3, $4, 'OPENING_BALANCE', $5, $6, 1, $7)
      `, [randomUUID(), transferId, transferLineId, seed.pallet_type_id, seed.opening_id, seed.usable_id, userId])

      const smokeResult = await pool.query<{ gate_passes: number; pallet_transfers: number; pallet_movements: number }>(`
        SELECT
          (SELECT COUNT(*)::int FROM "WarehouseGatePass" WHERE "id" = $1) AS gate_passes,
          (SELECT COUNT(*)::int FROM "PalletTransfer" WHERE "id" = $2) AS pallet_transfers,
          (SELECT COUNT(*)::int FROM "PalletMovement" WHERE "transferId" = $2) AS pallet_movements
      `, [gatePassId, transferId])
      const counts = smokeResult.rows[0]
      smokeCounts = {
        gatePasses: counts?.gate_passes || 0,
        palletTransfers: counts?.pallet_transfers || 0,
        palletMovements: counts?.pallet_movements || 0,
      }
      if (Object.values(smokeCounts).some(count => count !== 1)) throw new Error("Transactional smoke records were not created as expected.")
    }

    const result = {
      mode: dryRunMigration ? "migration-dry-run" : smokeTransaction ? "transactional-smoke-test" : "read-only-verification",
      installed: missing.length === 0,
      existingTables: expectedTables.length - missing.length,
      expectedTables: expectedTables.length,
      missing,
      seedCounts,
      persistentSmokeArtifacts,
      smokeCounts,
      rolledBack: dryRunMigration || smokeTransaction,
    }

    if (dryRunMigration || smokeTransaction) {
      await pool.query("ROLLBACK")
      transactionOpen = false
    }
    console.log(JSON.stringify(result, null, 2))
  } finally {
    if (transactionOpen) await pool.query("ROLLBACK")
    await pool.end()
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
