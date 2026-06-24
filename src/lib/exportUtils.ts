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

export function exportDailyReportDetailed(report: any) {
  const aoaData: any[][] = [];

  // Title
  aoaData.push([`DAILY PRODUCTION REPORT (${report.line})`]);
  aoaData.push([]);
  
  // 1. Shift Information
  aoaData.push(["1. SHIFT INFORMATION"]);
  aoaData.push(["Date:", new Date(report.date).toLocaleDateString('en-GB'), "Time:", report.time || "N/A"]);
  aoaData.push(["Shift:", report.shift, "Prepared By:", report.preparedBy]);
  aoaData.push(["Status:", report.status, "Approved By:", report.verifiedBy || "N/A"]);
  aoaData.push([]);

  // 2. Production Output
  aoaData.push(["2. PRODUCTION OUTPUT"]);
  aoaData.push(["Product Type", "Total Box", "Batch No", "Type", "Qty"]);
  report.productions.forEach((prod: any) => {
    prod.batches.forEach((batch: any, index: number) => {
      if (index === 0) {
        aoaData.push([prod.productType, prod.totalBox, batch.batchNo, batch.type === 'OTHER' ? batch.otherType : batch.type, batch.qty]);
      } else {
        aoaData.push(["", "", batch.batchNo, batch.type === 'OTHER' ? batch.otherType : batch.type, batch.qty]);
      }
    });
  });
  if (report.productions.length === 0) aoaData.push(["No production output logged."]);
  aoaData.push([]);

  // 3. Reject Logs
  aoaData.push(["3. REJECT LOGS"]);
  aoaData.push(["Item", "Before", "After", "Total (After)"]);
  report.rejects.forEach((rej: any) => {
    aoaData.push([rej.item, rej.before, rej.after, rej.after]);
  });
  if (report.rejects.length === 0) aoaData.push(["No reject logs."]);
  aoaData.push([]);

  // 4. Inventory Summary
  aoaData.push(["4. INVENTORY SUMMARY"]);
  aoaData.push(["Category", "Type", "Period", "Batch No", "Bags/Boxes", "Multiplier"]);
  report.inventory.forEach((inv: any) => {
    aoaData.push([inv.sectionKey, inv.type, inv.period || "N/A", inv.batchNo, inv.bags, inv.mult]);
  });
  if (report.inventory.length === 0) aoaData.push(["No inventory logs."]);
  aoaData.push([]);

  // 5. Remarks
  aoaData.push(["5. REMARKS / DOWNTIME"]);
  aoaData.push([report.remarks || "No remarks."]);

  // Create workbook and sheet
  const worksheet = XLSX.utils.aoa_to_sheet(aoaData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Daily_Report_Detailed");

  // Generate Excel file
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  
  // Create Blob and trigger download
  const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  const fileNameDate = new Date(report.date).toISOString().split('T')[0];
  link.setAttribute('download', `DailyReport_${report.line}_${fileNameDate}.xlsx`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
