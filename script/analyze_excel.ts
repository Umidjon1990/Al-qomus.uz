import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

const filePath = path.resolve('attached_assets/Qomus_1765212443815.xlsx');

try {
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  // console.log('XLSX keys:', Object.keys(XLSX));

  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Get headers
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
  const headers = [];
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const address = XLSX.utils.encode_cell({ r: range.s.r, c: C });
    const cell = worksheet[address];
    headers.push(cell ? cell.v : `UNKNOWN_${C}`);
  }

  console.log('Sheet Name:', sheetName);
  console.log('Headers:', headers);

  // Get first 3 rows of data
  const data = XLSX.utils.sheet_to_json(worksheet, { limit: 3 });
  console.log('First 3 rows:', JSON.stringify(data, null, 2));
  
  // Get total rows count approximation
  console.log('Total rows (approx):', range.e.r + 1);

} catch (error) {
  console.error('Error reading Excel file:', error);
}
