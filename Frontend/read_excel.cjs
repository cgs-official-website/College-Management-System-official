const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const dirPath = path.join('C:', 'College-Management-System-official', 'CMS File Format');
const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.xlsx'));

for (const file of files) {
  const filePath = path.join(dirPath, file);
  const workbook = xlsx.readFile(filePath);
  
  console.log(`\n=== ${file} ===`);
  console.log(`Sheets: ${workbook.SheetNames.join(', ')}`);
  
  const dataSheetName = workbook.SheetNames.find(s => s !== 'Instructions' && s !== 'Sheet1') || workbook.SheetNames[1] || workbook.SheetNames[0];
  
  if (dataSheetName) {
    const worksheet = workbook.Sheets[dataSheetName];
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    console.log(`Data Sheet: ${dataSheetName}`);
    if (data.length > 0) {
      console.log(`Header Row:`, data[0].join(', '));
    } else {
      console.log('Empty data sheet');
    }
  }
}
