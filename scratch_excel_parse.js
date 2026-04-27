const XLSX = require('xlsx');

const filePath = 'd:\\edu_dist_standalone\\New folder\\جدول بيانات بدون عنوان.xlsx';

try {
  const workbook = XLSX.readFile(filePath);
  const sheetNames = workbook.SheetNames;
  console.log('Sheets found:', sheetNames);

  sheetNames.forEach(sheetName => {
    console.log(`\n--- First few rows of sheet: ${sheetName} ---`);
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    console.log(data.slice(0, 5));
  });
} catch (error) {
  console.error('Error reading excel file:', error);
}
