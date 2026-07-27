import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import {
  COMPANY_NAME,
  defaultAlign,
  excelNumFmt,
  formatDateTimeId,
  formatDisplayValue,
  formatFilters,
  toExcelCellValue,
} from './format-value';
import { ExportColumn, ExportMeta, ExportRow } from './export.types';

@Injectable()
export class ExportService {
  async exportToExcel(
    rows: ExportRow[],
    columns: ExportColumn[],
    meta: ExportMeta,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = COMPANY_NAME;
    workbook.created = meta.printedAt;

    const sheetName = (meta.title || 'Laporan').slice(0, 31);
    const sheet = workbook.addWorksheet(sheetName || 'Laporan');
    const colCount = columns.length;

    let currentRow = 1;
    sheet.mergeCells(currentRow, 1, currentRow, colCount);
    sheet.getCell(currentRow, 1).value = COMPANY_NAME;
    sheet.getCell(currentRow, 1).font = { bold: true, size: 14 };
    currentRow += 1;

    sheet.mergeCells(currentRow, 1, currentRow, colCount);
    sheet.getCell(currentRow, 1).value = meta.title;
    sheet.getCell(currentRow, 1).font = { bold: true, size: 12 };
    currentRow += 1;

    if (meta.subtitle) {
      sheet.mergeCells(currentRow, 1, currentRow, colCount);
      sheet.getCell(currentRow, 1).value = meta.subtitle;
      currentRow += 1;
    }

    if (meta.filters && Object.keys(meta.filters).length > 0) {
      const filterText = formatFilters(meta.filters);
      if (filterText) {
        sheet.mergeCells(currentRow, 1, currentRow, colCount);
        sheet.getCell(currentRow, 1).value = `Filter: ${filterText}`;
        sheet.getCell(currentRow, 1).font = { italic: true, size: 9 };
        currentRow += 1;
      }
    }

    currentRow += 1; // baris kosong pemisah

    const headerRow = sheet.getRow(currentRow);
    columns.forEach((col, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = col.label;
      cell.font = { bold: true };
      cell.alignment = { horizontal: col.align ?? 'left' };
      sheet.getColumn(idx + 1).width = col.width ?? 18;
    });
    currentRow += 1;

    for (const row of rows) {
      const excelRow = sheet.getRow(currentRow);
      columns.forEach((col, idx) => {
        const cell = excelRow.getCell(idx + 1);
        cell.value = toExcelCellValue(row[col.key], col.format);
        const numFmt = excelNumFmt(col.format);
        if (numFmt) {
          cell.numFmt = numFmt;
        }
        cell.alignment = { horizontal: col.align ?? defaultAlign(col.format) };
      });
      currentRow += 1;
    }

    currentRow += 1;
    sheet.mergeCells(currentRow, 1, currentRow, colCount);
    sheet.getCell(currentRow, 1).value =
      `Dicetak oleh ${meta.printedBy} pada ${formatDateTimeId(meta.printedAt)}`;
    sheet.getCell(currentRow, 1).font = { italic: true, size: 9 };

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async exportToPdf(
    rows: ExportRow[],
    columns: ExportColumn[],
    meta: ExportMeta,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        layout: columns.length > 6 ? 'landscape' : 'portrait',
        margin: 40,
        bufferPages: true,
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      drawPdfHeader(doc, meta);
      const tableTop = doc.y;
      const widths = computeColumnWidths(doc, columns);
      drawPdfTableHeader(doc, columns, widths);

      const rowHeight = 16;
      const bottomLimit = doc.page.height - doc.page.margins.bottom - 24;

      for (const row of rows) {
        if (doc.y + rowHeight > bottomLimit) {
          doc.addPage();
          doc.y = doc.page.margins.top;
          drawPdfTableHeader(doc, columns, widths);
        }
        drawPdfTableRow(doc, row, columns, widths, rowHeight);
      }

      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i += 1) {
        doc.switchToPage(i);
        drawPdfFooter(doc, meta, i - range.start + 1, range.count);
      }

      void tableTop;
      doc.end();
    });
  }
}

function drawPdfHeader(doc: PDFKit.PDFDocument, meta: ExportMeta): void {
  doc
    .font('Helvetica-Bold')
    .fontSize(14)
    .text(COMPANY_NAME, { align: 'center' });
  doc.font('Helvetica-Bold').fontSize(12).text(meta.title, { align: 'center' });
  doc.font('Helvetica').fontSize(9);
  if (meta.subtitle) {
    doc.text(meta.subtitle, { align: 'center' });
  }
  if (meta.filters && Object.keys(meta.filters).length > 0) {
    const filterText = formatFilters(meta.filters);
    if (filterText) {
      doc.text(`Filter: ${filterText}`, { align: 'center' });
    }
  }
  doc.moveDown(1);
}

function computeColumnWidths(
  doc: PDFKit.PDFDocument,
  columns: ExportColumn[],
): number[] {
  const availableWidth =
    doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const weights = columns.map((c) => c.width ?? 15);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  return weights.map((w) => (w / totalWeight) * availableWidth);
}

function drawPdfTableHeader(
  doc: PDFKit.PDFDocument,
  columns: ExportColumn[],
  widths: number[],
): void {
  const left = doc.page.margins.left;
  const y = doc.y;
  let x = left;
  doc.font('Helvetica-Bold').fontSize(9);
  columns.forEach((col, idx) => {
    doc.text(col.label, x, y, {
      width: widths[idx],
      align: col.align ?? 'left',
    });
    x += widths[idx];
  });
  doc.moveDown(0.5);
  doc
    .moveTo(left, doc.y)
    .lineTo(left + widths.reduce((a, b) => a + b, 0), doc.y)
    .strokeColor('#999999')
    .stroke();
  doc.moveDown(0.3);
}

function drawPdfTableRow(
  doc: PDFKit.PDFDocument,
  row: ExportRow,
  columns: ExportColumn[],
  widths: number[],
  rowHeight: number,
): void {
  const left = doc.page.margins.left;
  const y = doc.y;
  let x = left;
  doc.font('Helvetica').fontSize(9);
  columns.forEach((col, idx) => {
    doc.text(formatDisplayValue(row[col.key], col.format), x, y, {
      width: widths[idx],
      align: col.align ?? defaultAlign(col.format),
    });
    x += widths[idx];
  });
  doc.y = y + rowHeight;
}

function drawPdfFooter(
  doc: PDFKit.PDFDocument,
  meta: ExportMeta,
  pageNumber: number,
  pageCount: number,
): void {
  const y = doc.page.height - doc.page.margins.bottom + 8;
  const left = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  doc.font('Helvetica').fontSize(8).fillColor('#555555');
  doc.text(
    `Dicetak oleh ${meta.printedBy} pada ${formatDateTimeId(meta.printedAt)}`,
    left,
    y,
    { width: width / 2, align: 'left' },
  );
  doc.text(`Halaman ${pageNumber} dari ${pageCount}`, left + width / 2, y, {
    width: width / 2,
    align: 'right',
  });
  doc.fillColor('#000000');
}
