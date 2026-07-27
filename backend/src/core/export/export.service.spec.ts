import * as ExcelJS from 'exceljs';
import { ExportColumn, ExportRow } from './export.types';
import { ExportService } from './export.service';

describe('ExportService', () => {
  const service = new ExportService();

  const columns: ExportColumn[] = [
    { key: 'name', label: 'Nama Produk', format: 'text' },
    { key: 'qty', label: 'Qty', format: 'qty', align: 'right' },
    { key: 'total', label: 'Total', format: 'currency', align: 'right' },
  ];

  const rows: ExportRow[] = [
    { name: 'Indomie Goreng', qty: 120, total: 1500000 },
    { name: 'Teh Botol', qty: 50.5, total: 750000 },
    { name: 'Beras 5kg', qty: 10, total: 500000 },
  ];

  const meta = {
    title: 'Laporan Dummy 3 Kolom',
    subtitle: 'Periode 01/07/2026 - 27/07/2026',
    printedBy: 'master',
    printedAt: new Date('2026-07-27T10:30:00'),
    filters: { gudang: 'Toko Utama' },
  };

  it('exportToExcel menghasilkan buffer xlsx yang bisa dibuka ulang (ExcelJS)', async () => {
    const buffer = await service.exportToExcel(rows, columns, meta);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);

    // xlsx sebenarnya adalah zip (magic bytes 'PK')
    expect(buffer.subarray(0, 2).toString()).toBe('PK');

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.worksheets[0];
    expect(sheet).toBeDefined();

    // Cari baris header perusahaan & judul benar-benar tertulis
    const allText: string[] = [];
    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        if (typeof cell.value === 'string' || typeof cell.value === 'number') {
          allText.push(String(cell.value));
        }
      });
    });
    expect(allText).toContain('Omega Sinar Terang');
    expect(allText).toContain('Laporan Dummy 3 Kolom');
    expect(allText).toContain('Indomie Goreng');
    expect(allText.some((t) => t.includes('Dicetak oleh master pada'))).toBe(
      true,
    );
  });

  it('exportToPdf menghasilkan buffer pdf valid (magic bytes %PDF / %%EOF)', async () => {
    const buffer = await service.exportToPdf(rows, columns, meta);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');

    const tail = buffer.subarray(-32).toString('latin1');
    expect(tail).toMatch(/%%EOF/);
  });

  it('exportToExcel & exportToPdf tetap jalan untuk data kosong', async () => {
    const excelBuffer = await service.exportToExcel([], columns, meta);
    expect(excelBuffer.subarray(0, 2).toString()).toBe('PK');

    const pdfBuffer = await service.exportToPdf([], columns, meta);
    expect(pdfBuffer.subarray(0, 5).toString()).toBe('%PDF-');
  });
});
