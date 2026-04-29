const xlsx = require('xlsx');

const workbook = xlsx.readFile('New folder/TeacherDB.xlsx');
const sheetNames = workbook.SheetNames;
console.log("Sheets:", sheetNames);

for (const name of sheetNames) {
  console.log(`\nSheet: ${name}`);
  const data = xlsx.utils.sheet_to_json(workbook.Sheets[name]);
  console.log(data.slice(0, 2));
}
