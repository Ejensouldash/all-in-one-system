const xlsx = require('xlsx');
const wb = xlsx.readFile('public/assets/Aset IT New.xlsx');
const data = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
console.log(JSON.stringify(data.slice(0, 5), null, 2));
