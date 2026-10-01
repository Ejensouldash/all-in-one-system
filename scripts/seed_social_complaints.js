const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

dotenv.config({ path: '.env', override: true });

let connectionString = process.env.DATABASE_URL || '';
if (connectionString.includes('pooler.supabase.com')) {
  connectionString = connectionString.replace(':5432/', ':6543/');
  if (!connectionString.includes('pgbouncer=true')) {
    connectionString += connectionString.includes('?') ? '&pgbouncer=true' : '?pgbouncer=true';
  }
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const jsonPath = path.join(__dirname, '../src/data/threads_complaints.json');
  const items = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  console.log(`Loading ${items.length} items into database...`);

  // Clear existing social media complaints
  const deleted = await prisma.socialMediaComplaint.deleteMany({});
  console.log(`Cleared ${deleted.count} existing records.`);

  // Prepare batch insert
  const data = items.map(c => ({
    complaintId: c.complaintId,
    categoryGroup: c.categoryGroup || 'General Chatter',
    date: c.rawDate ? new Date(c.rawDate) : new Date(),
    takenAt: c.takenAt ? BigInt(c.takenAt) : null,
    username: c.username || 'anonymous',
    fullName: c.fullName || null,
    customerNumber: c.customerNumber || 'N/A (Threads)',
    platform: c.platform || 'Threads',
    postUrl: c.postUrl || null,
    mainComplaint: c.mainComplaint,
    rawText: c.rawText,
    detectedBatchNo: c.detectedBatchNo || null,
    symptoms: c.symptoms || [],
    priority: c.priority, // High, Medium, Low, Info
    status: c.status || 'Open',
    picHandling: c.picHandling || 'Unassigned',
    likeCount: c.likeCount || 0,
    replyCount: c.replyCount || 0
  }));

  // Insert in batches of 50
  const batchSize = 50;
  for (let i = 0; i < data.length; i += batchSize) {
    const chunk = data.slice(i, i + batchSize);
    await prisma.socialMediaComplaint.createMany({
      data: chunk,
      skipDuplicates: true
    });
    console.log(`Inserted chunk ${i + 1} - ${Math.min(i + batchSize, data.length)} / ${data.length}`);
  }

  const count = await prisma.socialMediaComplaint.count();
  console.log(`Successfully seeded ${count} SocialMediaComplaint records into database!`);
}

main()
  .catch(e => {
    console.error('Error seeding social complaints:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
