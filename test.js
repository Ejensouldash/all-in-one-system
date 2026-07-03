const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 

prisma.asset.findUnique({ 
  where: { id: 'a74c6c90-8dbf-4ad5-a295-650c3255a0bd' }, 
  include: { department: true, location: true, maintenance: true } 
})
.then(console.log)
.catch(console.error)
.finally(() => prisma.$disconnect());
