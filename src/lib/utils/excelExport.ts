import * as XLSX from 'xlsx';

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
}

/**
 * Exports data to an Excel file (.xlsx)
 * @param data Array of objects representing the rows
 * @param columns Array of column definitions (header/key)
 * @param filename Name of the exported file (without extension)
 */
export const exportToExcel = (data: any[], columns: ExcelColumn[], filename: string) => {
  // Create a mapping of keys to headers for the worksheet
  const worksheetData = data.map(item => {
    const row: any = {};
    columns.forEach(col => {
      row[col.header] = item[col.key] ?? '-';
    });
    return row;
  });

  // Create workbook and worksheet
  const worksheet = XLSX.utils.json_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');

  // Set column widths if provided
  if (columns.some(c => c.width)) {
    worksheet['!cols'] = columns.map(col => ({ wch: col.width || 15 }));
  }

  // Generate date string for filename
  const dateStr = new Date().toISOString().split('T')[0];
  const fullFilename = `${filename}_${dateStr}.xlsx`;

  // Trigger download
  XLSX.writeFile(workbook, fullFilename);
};
