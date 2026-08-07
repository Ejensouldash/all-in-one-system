import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import ExcelJS from "exceljs"

export async function GET() {
  try {
    // 1. Fetch only APPROVED Sales Orders
    const orders = await prisma.salesOrder.findMany({
      where: { status: "APPROVED" },
      orderBy: { createdAt: "desc" },
      include: {
        customer: true,
        items: true,
        createdBy: { select: { name: true } },
      },
    })

    // 2. Create Excel Workbook and Worksheet
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet("Sales Orders")

    // 3. Define Columns
    worksheet.columns = [
      { header: "No", key: "index", width: 5 },
      { header: "SO Number", key: "soNumber", width: 20 },
      { header: "PO Number", key: "poNumber", width: 20 },
      { header: "Date", key: "date", width: 15 },
      { header: "Customer Name", key: "customerName", width: 40 },
      { header: "Items Count", key: "itemsCount", width: 12 },
      { header: "Grand Total (RM)", key: "total", width: 20 },
      { header: "Created By", key: "createdBy", width: 25 },
    ]

    // 4. Style Header Row
    worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } }
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0EA5E9" }, // cyan-500
    }
    worksheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" }

    // 5. Add Data Rows
    orders.forEach((order, idx) => {
      worksheet.addRow({
        index: idx + 1,
        soNumber: order.internalSoNo,
        poNumber: order.poNumber || "-",
        date: order.orderDate ? order.orderDate.toISOString().slice(0, 10) : order.createdAt.toISOString().slice(0, 10),
        customerName: order.customer?.legalName || "Unknown",
        itemsCount: order.items.length,
        total: Number(order.grandTotal),
        createdBy: order.createdBy?.name || "System",
      })
    })

    // 6. Format Total Column as Currency
    worksheet.getColumn("total").numFmt = '"RM" #,##0.00'

    // 7. Auto-filter for easy searching in Excel
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: orders.length + 1, column: 8 }
    }

    // 8. Generate Buffer
    const buffer = await workbook.xlsx.writeBuffer()

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="Sales_Orders_Export_${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    })
  } catch (error) {
    console.error("Excel Export Error:", error)
    return new NextResponse("Failed to export Excel", { status: 500 })
  }
}
