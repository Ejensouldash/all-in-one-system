import "dotenv/config";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";

interface RecallItem {
  page: string;
  customer: string;
  sku: string;
  batchNumber: string;
  quantity: number;
}

const recallItems: RecallItem[] = [
  // Page 1 (4 items)
  { page: "Page 1", customer: "MyNews", sku: "425ml", batchNumber: "043426-02", quantity: 27 },
  { page: "Page 1", customer: "MyNews", sku: "425ml", batchNumber: "043426-04", quantity: 6 },
  { page: "Page 1", customer: "MyNews", sku: "425ml", batchNumber: "013326-01", quantity: 10 },
  { page: "Page 1", customer: "MyNews", sku: "425ml", batchNumber: "013326-04", quantity: 1 },

  // Page 2 (10 items)
  { page: "Page 2", customer: "MyNews", sku: "425ml", batchNumber: "042426-03", quantity: 4 },
  { page: "Page 2", customer: "MyNews", sku: "425ml", batchNumber: "042426-01", quantity: 5 },
  { page: "Page 2", customer: "MyNews", sku: "425ml", batchNumber: "042426-02", quantity: 8 },
  { page: "Page 2", customer: "MyNews", sku: "425ml", batchNumber: "052426-01", quantity: 1 },
  { page: "Page 2", customer: "MyNews", sku: "425ml", batchNumber: "041926-02", quantity: 8 },
  { page: "Page 2", customer: "MyNews", sku: "425ml", batchNumber: "022226-01", quantity: 15 },
  { page: "Page 2", customer: "MyNews", sku: "425ml", batchNumber: "031926-03", quantity: 3 },
  { page: "Page 2", customer: "MyNews", sku: "425ml", batchNumber: "052226-01", quantity: 2 },
  { page: "Page 2", customer: "MyNews", sku: "425ml", batchNumber: "041226-01", quantity: 1 },
  { page: "Page 2", customer: "MyNews", sku: "425ml", batchNumber: "031926-02", quantity: 3 },

  // Page 3 (5 items)
  { page: "Page 3", customer: "MyNews", sku: "425ml", batchNumber: "013326-04", quantity: 10 },
  { page: "Page 3", customer: "MyNews", sku: "425ml", batchNumber: "013326-01", quantity: 24 },
  { page: "Page 3", customer: "MyNews", sku: "425ml", batchNumber: "042426-02", quantity: 7 },
  { page: "Page 3", customer: "MyNews", sku: "425ml", batchNumber: "042426-03", quantity: 8 },
  { page: "Page 3", customer: "MyNews", sku: "425ml", batchNumber: "023426-04", quantity: 1 },

  // Page 4 (7 items)
  { page: "Page 4", customer: "MyNews", sku: "800ml", batchNumber: "043426-02", quantity: 9 },
  { page: "Page 4", customer: "MyNews", sku: "800ml", batchNumber: "043426-04", quantity: 19 },
  { page: "Page 4", customer: "MyNews", sku: "800ml", batchNumber: "023526-04", quantity: 6 },
  { page: "Page 4", customer: "MyNews", sku: "800ml", batchNumber: "023526-01", quantity: 6 },
  { page: "Page 4", customer: "MyNews", sku: "800ml", batchNumber: "032726-04", quantity: 5 },
  { page: "Page 4", customer: "MyNews", sku: "800ml", batchNumber: "053026-04", quantity: 4 },
  { page: "Page 4", customer: "MyNews", sku: "800ml", batchNumber: "042926-02", quantity: 1 },

  // Page 5 (8 items)
  { page: "Page 5", customer: "MyNews", sku: "425ml", batchNumber: "031926-03", quantity: 1 },
  { page: "Page 5", customer: "MyNews", sku: "425ml", batchNumber: "052226-01", quantity: 1 },
  { page: "Page 5", customer: "MyNews", sku: "425ml", batchNumber: "031526-03", quantity: 8 },
  { page: "Page 5", customer: "MyNews", sku: "425ml", batchNumber: "031926-02", quantity: 10 },
  { page: "Page 5", customer: "MyNews", sku: "425ml", batchNumber: "013026-03", quantity: 1 },
  { page: "Page 5", customer: "MyNews", sku: "425ml", batchNumber: "013326-01", quantity: 24 },
  { page: "Page 5", customer: "MyNews", sku: "425ml", batchNumber: "053226-03", quantity: 2 },
  { page: "Page 5", customer: "MyNews", sku: "425ml", batchNumber: "022226-01", quantity: 1 },

  // Page 6 (2 items)
  { page: "Page 6", customer: "MyNews", sku: "425ml", batchNumber: "013326-01", quantity: 40 },
  { page: "Page 6", customer: "MyNews", sku: "425ml", batchNumber: "013326-04", quantity: 10 },

  // Page 7 (2 items)
  { page: "Page 7", customer: "MyNews", sku: "425ml", batchNumber: "013326-01", quantity: 29 },
  { page: "Page 7", customer: "MyNews", sku: "425ml", batchNumber: "013326-04", quantity: 21 },

  // Page 8 (4 items)
  { page: "Page 8", customer: "MyNews", sku: "425ml", batchNumber: "043426-02", quantity: 27 },
  { page: "Page 8", customer: "MyNews", sku: "425ml", batchNumber: "043426-04", quantity: 4 },
  { page: "Page 8", customer: "MyNews", sku: "425ml", batchNumber: "023426-04", quantity: 16 },
  { page: "Page 8", customer: "MyNews", sku: "425ml", batchNumber: "043426-01", quantity: 3 },

  // Page 9 (2 items)
  { page: "Page 9", customer: "MyNews", sku: "425ml", batchNumber: "043426-01", quantity: 24 },
  { page: "Page 9", customer: "MyNews", sku: "425ml", batchNumber: "013326-04", quantity: 26 },

  // Page 10 (3 items)
  { page: "Page 10", customer: "MyNews", sku: "425ml", batchNumber: "023426-04", quantity: 24 },
  { page: "Page 10", customer: "MyNews", sku: "425ml", batchNumber: "043426-04", quantity: 2 },
  { page: "Page 10", customer: "MyNews", sku: "425ml", batchNumber: "043426-01", quantity: 24 },

  // Page 11 (2 items)
  { page: "Page 11", customer: "MyNews", sku: "425ml", batchNumber: "013326-01", quantity: 38 },
  { page: "Page 11", customer: "MyNews", sku: "425ml", batchNumber: "013326-04", quantity: 12 },

  // Page 12 (17 items)
  { page: "Page 12", customer: "MyNews", sku: "800ml", batchNumber: "042426-02", quantity: 1 },
  { page: "Page 12", customer: "MyNews", sku: "800ml", batchNumber: "042526-01", quantity: 1 },
  { page: "Page 12", customer: "MyNews", sku: "800ml", batchNumber: "043226-04", quantity: 2 },
  { page: "Page 12", customer: "MyNews", sku: "800ml", batchNumber: "043426-04", quantity: 4 },
  { page: "Page 12", customer: "MyNews", sku: "800ml", batchNumber: "042826-04", quantity: 1 },
  { page: "Page 12", customer: "MyNews", sku: "800ml", batchNumber: "053026-04", quantity: 3 },
  { page: "Page 12", customer: "MyNews", sku: "800ml", batchNumber: "042826-03", quantity: 5 },
  { page: "Page 12", customer: "MyNews", sku: "800ml", batchNumber: "043426-02", quantity: 3 },
  { page: "Page 12", customer: "MyNews", sku: "800ml", batchNumber: "023526-01", quantity: 1 },
  { page: "Page 12", customer: "MyNews", sku: "800ml", batchNumber: "032526-01", quantity: 1 },
  { page: "Page 12", customer: "MyNews", sku: "800ml", batchNumber: "023526-04", quantity: 4 },
  { page: "Page 12", customer: "MyNews", sku: "800ml", batchNumber: "042226-04", quantity: 1 },
  { page: "Page 12", customer: "MyNews", sku: "800ml", batchNumber: "042626-02", quantity: 1 },
  { page: "Page 12", customer: "MyNews", sku: "800ml", batchNumber: "022926-04", quantity: 2 },
  { page: "Page 12", customer: "MyNews", sku: "800ml", batchNumber: "042926-03", quantity: 1 },
  { page: "Page 12", customer: "MyNews", sku: "800ml", batchNumber: "013326-03", quantity: 1 },
  { page: "Page 12", customer: "MyNews", sku: "800ml", batchNumber: "013326-04", quantity: 3 },

  // Page 13 (14 items)
  { page: "Page 13", customer: "MyNews", sku: "800ml", batchNumber: "043426-04", quantity: 11 },
  { page: "Page 13", customer: "MyNews", sku: "800ml", batchNumber: "042926-02", quantity: 3 },
  { page: "Page 13", customer: "MyNews", sku: "800ml", batchNumber: "043826-04", quantity: 10 },
  { page: "Page 13", customer: "MyNews", sku: "800ml", batchNumber: "042826-04", quantity: 1 },
  { page: "Page 13", customer: "MyNews", sku: "800ml", batchNumber: "032526-01", quantity: 2 },
  { page: "Page 13", customer: "MyNews", sku: "800ml", batchNumber: "042826-03", quantity: 2 },
  { page: "Page 13", customer: "MyNews", sku: "800ml", batchNumber: "043726-04", quantity: 16 },
  { page: "Page 13", customer: "MyNews", sku: "800ml", batchNumber: "053026-04", quantity: 7 },
  { page: "Page 13", customer: "MyNews", sku: "800ml", batchNumber: "043226-04", quantity: 6 },
  { page: "Page 13", customer: "MyNews", sku: "800ml", batchNumber: "023526-01", quantity: 4 },
  { page: "Page 13", customer: "MyNews", sku: "800ml", batchNumber: "023526-04", quantity: 6 },
  { page: "Page 13", customer: "MyNews", sku: "800ml", batchNumber: "042526-01", quantity: 3 },
  { page: "Page 13", customer: "MyNews", sku: "800ml", batchNumber: "013326-04", quantity: 2 },
  { page: "Page 13", customer: "MyNews", sku: "800ml", batchNumber: "042926-02", quantity: 1 },

  // Page 14 (4 items)
  { page: "Page 14", customer: "MyNews", sku: "425ml", batchNumber: "031526-03", quantity: 43 },
  { page: "Page 14", customer: "MyNews", sku: "425ml", batchNumber: "043426-01", quantity: 2 },
  { page: "Page 14", customer: "MyNews", sku: "425ml", batchNumber: "043426-02", quantity: 3 },
  { page: "Page 14", customer: "MyNews", sku: "425ml", batchNumber: "023426-04", quantity: 2 },

  // Page 15 (1 item)
  { page: "Page 15", customer: "MyNews", sku: "425ml", batchNumber: "031526-03", quantity: 50 },

  // Page 16 (1 item)
  { page: "Page 16", customer: "MyNews", sku: "425ml", batchNumber: "031526-03", quantity: 50 },

  // Page 17 (4 items)
  { page: "Page 17", customer: "MyNews", sku: "425ml", batchNumber: "023426-04", quantity: 23 },
  { page: "Page 17", customer: "MyNews", sku: "425ml", batchNumber: "043426-02", quantity: 8 },
  { page: "Page 17", customer: "MyNews", sku: "425ml", batchNumber: "043426-01", quantity: 18 },
  { page: "Page 17", customer: "MyNews", sku: "425ml", batchNumber: "043426-04", quantity: 1 },

  // Page 18 (3 items)
  { page: "Page 18", customer: "MyNews", sku: "425ml", batchNumber: "023426-04", quantity: 28 },
  { page: "Page 18", customer: "MyNews", sku: "425ml", batchNumber: "043426-02", quantity: 10 },
  { page: "Page 18", customer: "MyNews", sku: "425ml", batchNumber: "043426-01", quantity: 12 },

  // Page 19 (4 items)
  { page: "Page 19", customer: "MyNews", sku: "425ml", batchNumber: "043426-01", quantity: 10 },
  { page: "Page 19", customer: "MyNews", sku: "425ml", batchNumber: "043426-02", quantity: 14 },
  { page: "Page 19", customer: "MyNews", sku: "425ml", batchNumber: "023426-04", quantity: 24 },
  { page: "Page 19", customer: "MyNews", sku: "425ml", batchNumber: "043426-04", quantity: 2 },
];

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
    console.log("=== MEMULAKAN PROSES KEMASUKAN PRODUCT RECALL ===");
    console.log(`Jumlah baris data untuk dimasukkan: ${recallItems.length}`);
    const totalQty = recallItems.reduce((sum, item) => sum + item.quantity, 0);
    console.log(`Jumlah kuantiti botol: ${totalQty}`);

    // Pre-flight validation
    if (recallItems.length !== 97) {
      throw new Error(`Integriti terjejas: Dijangka 97 baris, tetapi mendapat ${recallItems.length}`);
    }
    if (totalQty !== 951) {
      throw new Error(`Integriti terjejas: Dijangka 951 botol, tetapi mendapat ${totalQty}`);
    }

    await client.query("BEGIN");

    // 1. Dapatkan recallNo seterusnya bagi PR-202610-XXX
    const prefix = "PR-202610";
    const countRes = await client.query(
      `SELECT COUNT(*)::int AS count FROM "ProductRecall" WHERE "recallNo" LIKE $1`,
      [`${prefix}%`]
    );
    const nextSeq = (countRes.rows[0]?.count || 0) + 1;
    const recallNo = `${prefix}-${String(nextSeq).padStart(3, "0")}`;
    console.log(`Menjana Nombor Rujukan Recall: ${recallNo}`);

    // 2. Maklumat pegawai penyedia
    const preparedById = "be11b8a7-3c16-44b1-ab32-77eda73b25bb";
    const preparedByName = "Syazwani";
    const recallDate = new Date("2026-10-14T00:00:00.000Z");
    const reason = "MyNews Product Recall / Customer Return";
    const masterRemarks = null;
    const recallId = randomUUID();
    const now = new Date();

    // 3. Masukkan rekod induk ProductRecall
    await client.query(
      `INSERT INTO "ProductRecall" (
        "id", "recallNo", "recallDate", "reason", "remarks", 
        "preparedById", "preparedByName", "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        recallId,
        recallNo,
        recallDate,
        reason,
        masterRemarks,
        preparedById,
        preparedByName,
        now,
        now,
      ]
    );
    console.log(`Rekod induk ProductRecall (${recallNo}) berjaya dimasukkan.`);

    // 4. Masukkan kesemua 97 baris item
    let insertedItemsCount = 0;
    for (const item of recallItems) {
      const itemId = randomUUID();
      await client.query(
        `INSERT INTO "ProductRecallItem" (
          "id", "recallId", "customer", "sku", "batchNumber", 
          "quantity", "remarks", "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          itemId,
          recallId,
          item.customer,
          item.sku,
          item.batchNumber,
          item.quantity,
          null,
          now,
          now,
        ]
      );
      insertedItemsCount++;
    }
    console.log(`Kesemua ${insertedItemsCount} baris item berjaya dimasukkan.`);

    // 5. Rekod Audit Log
    const auditId = randomUUID();
    await client.query(
      `INSERT INTO "AuditLog" (
        "id", "userId", "userName", "action", "details", "createdAt"
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        auditId,
        preparedById,
        preparedByName,
        `Created Product Recall ${recallNo}`,
        JSON.stringify({
          recallId,
          recallNo,
          itemCount: insertedItemsCount,
          totalQuantity: totalQty,
          source: "PDF Physical Audit Sheets (19 Pages)",
        }),
        now,
      ]
    );
    console.log(`Audit log direkodkan.`);

    // 6. Commit transaksi
    await client.query("COMMIT");
    console.log("=== TRANSAKSI BERJAYA DI-COMMIT (ZERO MISTAKE) ===");
    console.log({
      status: "SUCCESS",
      recallId,
      recallNo,
      itemCount: insertedItemsCount,
      totalQuantity: totalQty,
      preparedByName,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("TRANSAKSI DIBATALKAN (ROLLBACK):", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
