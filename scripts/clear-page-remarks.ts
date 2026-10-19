import "dotenv/config";
import { Pool } from "pg";

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
    connectionTimeoutMillis: 10_000,
  });

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Dapatkan rekod induk PR-202610-002
    const recallRes = await client.query(
      `SELECT id FROM "ProductRecall" WHERE "recallNo" = $1`,
      ["PR-202610-002"]
    );

    if (recallRes.rows.length === 0) {
      throw new Error("Rekod PR-202610-002 tidak dijumpai.");
    }

    const recallId = recallRes.rows[0].id;

    // 2. Kosongkan remarks pada semua baris item
    const updateItemsRes = await client.query(
      `UPDATE "ProductRecallItem" SET "remarks" = NULL, "updatedAt" = NOW() WHERE "recallId" = $1`,
      [recallId]
    );
    console.log(`Mengosongkan remarks pada ${updateItemsRes.rowCount} baris item.`);

    // 3. Kosongkan remarks pada rekod induk
    await client.query(
      `UPDATE "ProductRecall" SET "remarks" = NULL, "updatedAt" = NOW() WHERE "id" = $1`,
      [recallId]
    );
    console.log(`Mengosongkan remarks pada rekod induk.`);

    await client.query("COMMIT");
    console.log("=== BERJAYA: SEMUA CATATAN 'PAGE' TELAH DIKELUARKAN DENGAN BERSIH ===");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Gagal mengemaskini remarks:", err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
