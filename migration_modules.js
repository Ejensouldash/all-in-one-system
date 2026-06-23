const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd());

const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const connectionString = process.env.DATABASE_URL + (process.env.DATABASE_URL.includes("?") ? "&pgbouncer=true" : "?pgbouncer=true");
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const result = await prisma.user.updateMany({
    data: {
      modules: { set: ["TICKETS", "EVENTS", "NOTICES", "FORMS", "WAREHOUSE"] }
    }
  });
  console.log(`Updated ${result.count} users with legacy modules.`);
}

main().finally(() => prisma.$disconnect());
