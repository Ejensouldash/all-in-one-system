const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const batchNos = [
    'B4/052424-02',
    'B4/032426-02',
    'B4/012526-01',
    'B4/07262601',
    'B4/07262602'
  ]

  const result = await prisma.transferInItem.deleteMany({
    where: {
      batchNo: {
        in: batchNos
      }
    }
  })

  console.log(`Deleted ${result.count} transfer in items.`)
  
  // They might also exist in inventoryLog?
  const logResult = await prisma.inventoryLog.deleteMany({
    where: {
      batchNo: {
        in: batchNos
      }
    }
  })
  
  console.log(`Deleted ${logResult.count} inventory logs.`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
