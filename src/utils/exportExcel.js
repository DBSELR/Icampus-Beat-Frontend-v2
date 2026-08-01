import * as XLSX from 'xlsx';

/**
 * Export one or more sheets to an .xlsx file
 * sheets: [{ name: 'Sheet1', data: [[col1, col2], [val1, val2], ...] }]
 */
export const exportToExcel = (sheets, fileName = 'export.xlsx') => {
  const wb = XLSX.utils.book_new();

  sheets.forEach(({ name, data }) => {
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Auto column widths based on content
    const colWidths = data[0]?.map((_, colIdx) => ({
      wch: Math.max(
        ...data.map((row) => String(row[colIdx] ?? '').length),
        10
      ),
    })) ?? [];
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, name.substring(0, 31));
  });

  XLSX.writeFile(wb, fileName);
};
