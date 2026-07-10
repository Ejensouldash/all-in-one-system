const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const categories = await prisma.transferInItem.groupBy({
    by: ['category', 'mult']
  })
  console.log(categories)
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())
