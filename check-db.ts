import { prisma } from './src/lib/prisma.ts';
prisma.dailyReport.findUnique({
  where: { id: '33c3b9e0-5590-47fd-a73d-45f2487a5be3' },
  include: { productions: true, inventory: true }
}).then(console.log).finally(() => process.exit(0));
