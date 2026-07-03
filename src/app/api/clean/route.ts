import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET() {
  try {
    const targetDate = new Date("2026-07-02T23:59:59.999Z")

    // Find all TransferInItem that match the criteria
    const items = await prisma.transferInItem.findMany({
      where: {
        category: {
          in: ["BOTTLE 800ml", "BOTTLE 425ml"]
        },
        transferIn: {
          receiveDate: { lte: targetDate },
          doNumber: { notIn: ["020726", "DO - 020726"] }
        }
      },
      include: {
        transferIn: true
      }
    })

    // Delete them
    let deletedCount = 0;
    const deletedItemsList = [];
    if (items.length > 0) {
      const itemIds = items.map(i => i.id)
      const result = await prisma.transferInItem.deleteMany({
        where: {
          id: { in: itemIds }
        }
      })
      deletedCount = result.count;
      deletedItemsList.push(...items.map(i => ({ id: i.id, doNumber: i.transferIn.doNumber, batchNo: i.batchNo })));

      // Check for empty TransferIn records
      const transferInIds = [...new Set(items.map(i => i.transferInId))]
      for (const tiId of transferInIds) {
        const remainingItems = await prisma.transferInItem.count({
          where: { transferInId: tiId }
        })
        if (remainingItems === 0) {
          await prisma.transferIn.delete({
            where: { id: tiId }
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Deleted ${deletedCount} bottle items.`,
      deletedItems: deletedItemsList
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
