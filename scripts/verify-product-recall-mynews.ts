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
    console.log("=== MEMULAKAN PENGESAHAN DATA PRODUCT RECALL ===");

    // 1. Semak rekod induk
    const recallRes = await client.query(
      `SELECT * FROM "ProductRecall" WHERE "recallNo" = $1`,
      ["PR-202610-002"]
    );

    if (recallRes.rows.length === 0) {
      throw new Error("Rekod PR-202610-002 tidak dijumpai dalam pangkalan data!");
    }

    const recall = recallRes.rows[0];
    console.log("Rekod Induk Dijumpai:", {
      id: recall.id,
      recallNo: recall.recallNo,
      recallDate: recall.recallDate.toISOString().split("T")[0],
      reason: recall.reason,
      preparedByName: recall.preparedByName,
      remarks: recall.remarks,
    });

    // 2. Semak item
    const itemsRes = await client.query(
      `SELECT COUNT(*)::int AS count, SUM("quantity")::int AS total_qty FROM "ProductRecallItem" WHERE "recallId" = $1`,
      [recall.id]
    );

    const { count, total_qty } = itemsRes.rows[0];
    console.log(`Jumlah Baris Item: ${count} (Dijangka: 97)`);
    console.log(`Jumlah Kuantiti Botol: ${total_qty} (Dijangka: 951)`);

    if (count !== 97 || total_qty !== 951) {
      throw new Error(`Pengesahan gagal: Kiraan tidak sepadan!`);
    }

    // 3. Pecahan mengikut SKU
    const skuRes = await client.query(
      `SELECT "sku", COUNT(*)::int AS line_count, SUM("quantity")::int AS qty FROM "ProductRecallItem" WHERE "recallId" = $1 GROUP BY "sku" ORDER BY "sku"`,
      [recall.id]
    );
    console.log("Pecahan Mengikut SKU:", skuRes.rows);

    // 4. Semak Remarks (Harus NULL / tiada Page)
    const remarksRes = await client.query(
      `SELECT COUNT(*)::int AS count_with_remarks FROM "ProductRecallItem" WHERE "recallId" = $1 AND "remarks" IS NOT NULL`,
      [recall.id]
    );
    console.log(`Bilangan Item Yang Masih Ada Remarks: ${remarksRes.rows[0].count_with_remarks} (Dijangka: 0)`);
    if (remarksRes.rows[0].count_with_remarks !== 0) {
      throw new Error("Masih terdapat remarks pada item!");
    }

    // 5. Semak Audit Log
    const auditRes = await client.query(
      `SELECT "action", "userName", "details", "createdAt" FROM "AuditLog" WHERE "action" LIKE $1 ORDER BY "createdAt" DESC LIMIT 1`,
      ["%PR-202610-002%"]
    );
    console.log("Audit Log Disahkan:", auditRes.rows[0]);

    console.log("=== STATUS PENGESAHAN: SEMUA 97 BARIS & 951 BOTOL DISAHKAN 100% TEPAT ===");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Ralat Pengesahan:", err);
  process.exit(1);
});
