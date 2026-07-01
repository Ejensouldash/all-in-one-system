const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Fetching all tables in the public schema...');
  const tables = await prisma.$queryRaw`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public';
  `;

  for (const table of tables) {
    const tableName = table.tablename;
    if (tableName === '_prisma_migrations') continue;
    
    console.log(`Enabling RLS on table: "${tableName}"...`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "${tableName}" ENABLE ROW LEVEL SECURITY;`);
  }
  
  console.log('Successfully enabled RLS on all public tables!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
