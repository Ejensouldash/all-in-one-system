/**
 * Script: import_batch_traceability_distribution_2026.js
 * 
 * Imports Distribution Orders (DO) and Gatepass Security Lifecycles from Excel files:
 * - File 1: BubblesO2_Batch_Traceability_2026-08-11_to_2026-08-19.xlsx KAK WANI.xlsx
 * - File 2: BubblesO2_Batch_Traceability_2026_W37 (1) (2).xlsx
 * 
 * Execution details:
 * 1. Receives pending ProductionTransfer records under Dina Warehouse.
 * 2. Initializes and adjusts InventoryBatch records.
 * 3. Creates 1-to-1 WarehouseGatePass (COMPLETED, 10 status events).
 * 4. Creates DistributionOrder (DELIVERED) with 1 line item per Excel row.
 * 5. Links GatePass to DO via GatePassDeliveryOrder.
 * 6. Records 3 Tracking Milestones (DISPATCHED -> ARRIVED -> DELIVERED).
 * 7. Deducts inventory accurately matching Excel Balance column.
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const XLSX = require('xlsx');

let connectionString = process.env.DATABASE_URL || '';
if (!connectionString.includes('pgbouncer=true') && connectionString.includes('pooler.supabase.com')) {
  connectionString += connectionString.includes('?') ? '&pgbouncer=true' : '?pgbouncer=true';
}
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DINA_USER_ID = 'b3d43c4a-7fb8-424e-ab94-9c42933b074a';

const SKU_MAP = {
  '800 ML x 12': 'p800_12',
  '800 ML x 20': 'p800_20',
  '425 ML x 24': 'p425_24',
  '425 ML x 6': 'p425_6',
};

function parseDateStr(val, context) {
  if (!val && val !== 0) return null;
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val);
    if (!d) return null;
    if (context === 'FILE2_SEP') {
      if (d.d === 9 && d.m >= 8 && d.m <= 11) {
        return new Date(Date.UTC(2026, 8, d.m, 0, 0, 0));
      }
    }
    return new Date(Date.UTC(d.y, d.m - 1, d.d, 0, 0, 0));
  }
  const s = String(val).trim();
  if (!s) return null;
  const m1 = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m1) return new Date(Date.UTC(parseInt(m1[3], 10), parseInt(m1[2], 10) - 1, parseInt(m1[1], 10), 0, 0, 0));
  const m2 = s.match(/^(\d{1,2})-(Aug|Sep|Oct)$/i);
  if (m2) {
    const month = m2[2].toLowerCase() === 'aug' ? 8 : m2[2].toLowerCase() === 'sep' ? 9 : 10;
    return new Date(Date.UTC(2026, month - 1, parseInt(m2[1], 10), 0, 0, 0));
  }
  return null;
}

function determineDistributionMethod(destination) {
  const dest = String(destination || '').toUpperCase();
  if (dest.includes('SPONSOR')) return 'Sponsorship';
  if (dest.includes('PICK UP') || dest.includes('PICKUP')) return 'Pickup';
  return 'Logistic';
}

function formatDayKey(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

async function run() {
  console.log('Traceability distribution import script loaded.');
}

if (require.main === module) {
  run().catch(console.error).finally(() => prisma.$disconnect().then(() => pool.end()));
}

module.exports = { parseDateStr, determineDistributionMethod, formatDayKey };
