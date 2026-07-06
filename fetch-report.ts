import { prisma } from './src/lib/prisma';
async function run(){ 
  const r = await prisma.dailyReport.findUnique({ 
    where: { id: '33c3b9e0-5590-47fd-a73d-45f2487a5be3' }, 
    include: { inventory: true, productions: { include: { batches: true } } } 
  }); 
  console.log(JSON.stringify(r, null, 2)); 
} 
run().catch(console.error).finally(() => prisma.$disconnect());
