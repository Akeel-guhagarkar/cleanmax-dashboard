const ExcelJS = require('exceljs');

async function readExcel() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile('C:\\Users\\user\\OneDrive\\Desktop\\ARFAT 123.xlsx');
  
  workbook.eachSheet((worksheet, sheetId) => {
    console.log('--- Sheet:', worksheet.name, '---');
    worksheet.eachRow((row, rowNumber) => {
      console.log('Row ' + rowNumber + ' = ' + JSON.stringify(row.values));
    });
  });
}

readExcel().catch(console.error);
