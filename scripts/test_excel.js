const xlsx = require('xlsx');

function analyzeExcel() {
  const filePath = "C:\\Users\\user\\Documents\\All in One System\\public\\assets\\Master List Aset bubblesO2.xlsx";
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    if (data.length > 0) {
      console.log("HEADERS:");
      console.log(data[0]);
      console.log("\nSAMPLE DATA (Row 1):");
      console.log(data[1]);
    } else {
      console.log("No data found");
    }
  } catch (err) {
    console.error("Error reading file:", err.message);
  }
}

analyzeExcel();
