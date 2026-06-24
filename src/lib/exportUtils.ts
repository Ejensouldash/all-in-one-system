import * as XLSX from 'xlsx';

export function exportSageX3Data(reports: any[]) {
  const flatData: any[] = [];

  reports.forEach(report => {
    const reportDate = new Date(report.date).toLocaleDateString('en-GB');
    const approvedAt = report.approvedAt ? new Date(report.approvedAt).toLocaleString('en-GB') : '';
    
    // Calculate total Input Material Qty
    const totalInputQty = report.inventory
      .filter((inv: any) => inv.type === "Usage")
      .reduce((sum: number, inv: any) => sum + (inv.bags * inv.mult), 0);

    // Calculate total Scrap Qty
    const totalScrapQty = report.rejects
      .reduce((sum: number, rej: any) => sum + rej.after, 0); // "after" is usually the final reject count

    // We generate one row per production batch
    report.productions.forEach((prod: any) => {
      prod.batches.forEach((batch: any) => {
        flatData.push({
          "Date": reportDate,
          "Shift": report.shift,
          "Operator Name": report.preparedBy,
          "Machine/Line": report.line,
          "Lot Number": batch.batchNo,
          "Input Material Qty": totalInputQty,
          "Output Yield Qty": batch.qty,
          "Scrap Qty": totalScrapQty,
          "Supervisor Approval Timestamp": approvedAt,
        });
      });
    });

    // If there is no production output but we still need to export the report for scrap/usage
    if (report.productions.length === 0 || report.productions.every((p:any) => p.batches.length === 0)) {
      flatData.push({
        "Date": reportDate,
        "Shift": report.shift,
        "Operator Name": report.preparedBy,
        "Machine/Line": report.line,
        "Lot Number": "N/A",
        "Input Material Qty": totalInputQty,
        "Output Yield Qty": 0,
        "Scrap Qty": totalScrapQty,
        "Supervisor Approval Timestamp": approvedAt,
      });
    }
  });

  // Create workbook
  const worksheet = XLSX.utils.json_to_sheet(flatData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "SageX3_Export");

  // Generate Excel file
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  
  // Create Blob and trigger download
  const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `SageX3_Export_${new Date().getTime()}.xlsx`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
