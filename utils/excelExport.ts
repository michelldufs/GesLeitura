import { Workbook } from 'exceljs';

export type ExcelColumn = { header: string; key: string; width?: number };

export async function exportToExcel(
  fileName: string,
  sheetName: string,
  columns: ExcelColumn[],
  rows: Record<string, any>[]
): Promise<Blob> {
  const workbook = new Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  sheet.columns = columns.map(c => ({ header: c.header, key: c.key, width: c.width || 20 }));

  rows.forEach(row => sheet.addRow(row));

  // Estilo simples de header
  sheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
