import * as ExcelJS from 'exceljs';
import { DataSource } from 'typeorm';
import {
  OpeningBalanceImportService,
  SHEET_PAYABLE,
  SHEET_RECEIVABLE,
  SHEET_STOCK,
} from './opening-balance-import.service';

/**
 * Impor Excel Saldo Awal (need_fixing.md #21) — parser murni baca DB
 * (produk/pelanggan/supplier yang sudah ada), tidak menulis apa pun.
 */
describe('OpeningBalanceImportService', () => {
  let dataSource: DataSource;
  let service: OpeningBalanceImportService;
  let product: {
    code: string;
    base_unit: string;
    unit_name: string | null;
    factor: string | null;
  };
  let customerCode: string;
  let supplierCode: string;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USERNAME ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'postgres',
      database: process.env.DB_NAME ?? 'omega_dev',
    });
    await dataSource.initialize();
    service = new OpeningBalanceImportService(dataSource);

    // Produk aktif yang punya tepat satu satuan besar.
    const products: (typeof product)[] = await dataSource.query(
      `SELECT p.code, p.base_unit, c.unit_name, c.qty_in_base_unit AS factor
       FROM products p
       JOIN product_unit_conversions c ON c.product_id = p.id
       WHERE p.is_active = true AND c.qty_in_base_unit::numeric > 1
       ORDER BY p.code LIMIT 1`,
    );
    product = products[0];
    const customers: { code: string }[] = await dataSource.query(
      `SELECT code FROM customers ORDER BY code LIMIT 1`,
    );
    customerCode = customers[0].code;
    const suppliers: { code: string }[] = await dataSource.query(
      `SELECT display_code AS code FROM suppliers ORDER BY display_code LIMIT 1`,
    );
    supplierCode = suppliers[0].code;
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  async function fileFrom(
    template: Buffer,
    fill: (wb: ExcelJS.Workbook) => void,
  ) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(template as unknown as ArrayBuffer);
    fill(wb);
    const buffer = Buffer.from(await wb.xlsx.writeBuffer());
    return { buffer, size: buffer.length };
  }

  it('template punya sheet Stok/Piutang/Hutang; baris contoh yang kodenya tidak ada -> error per baris, bukan crash', async () => {
    const template = await service.buildTemplate();
    const result = await service.parse({
      buffer: template,
      size: template.length,
    });
    // Baris contoh memakai kode fiktif — sebagian besar akan jadi error, tapi
    // tidak pernah melempar exception.
    expect(Array.isArray(result.errors)).toBe(true);
  });

  it('mengurai stok (satuan besar -> satuan dasar), piutang, hutang; baris salah dilaporkan dengan nomor barisnya', async () => {
    const template = await service.buildTemplate();
    const file = await fileFrom(template, (wb) => {
      const stok = wb.getWorksheet(SHEET_STOCK)!;
      stok.spliceRows(2, 1);
      stok.addRow([product.code, 2, product.unit_name, 120000]);
      stok.addRow([product.code, 5, '', 1000]); // satuan kosong = terbesar
      stok.addRow(['TIDAK-ADA', 1, '', 1000]);
      stok.addRow([product.code, 1, 'SATUAN-ANEH', 1000]);

      const piutang = wb.getWorksheet(SHEET_RECEIVABLE)!;
      piutang.spliceRows(2, 1);
      piutang.addRow([customerCode, '1.500.000', 'teks id-ID']);
      piutang.addRow([customerCode, 0, 'nol']);

      const hutang = wb.getWorksheet(SHEET_PAYABLE)!;
      hutang.spliceRows(2, 1);
      hutang.addRow([supplierCode, 7500000.5, '']);
    });

    const result = await service.parse(file);
    const factor = Number(product.factor);

    expect(result.stockLines).toHaveLength(2);
    expect(result.stockLines[0].qtyBaseUnit).toBe(2 * factor);
    expect(result.stockLines[0].unitCost).toBeCloseTo(120000 / factor, 4);
    expect(result.stockLines[1].unitName).toBe(product.unit_name);

    expect(result.receivableLines).toHaveLength(1);
    expect(result.receivableLines[0].amount).toBe(1500000);
    expect(result.payableLines).toHaveLength(1);
    expect(result.payableLines[0].amount).toBe(7500000.5);

    const stockErrors = result.errors.filter((e) => e.sheet === SHEET_STOCK);
    expect(stockErrors.map((e) => e.row)).toEqual([4, 5]);
    expect(stockErrors[0].message).toMatch(/tidak ditemukan/);
    expect(stockErrors[1].message).toMatch(/Satuan .* tidak dikenal/);
    expect(result.errors.find((e) => e.sheet === SHEET_RECEIVABLE)?.row).toBe(
      3,
    );
  });

  it('file bukan Excel -> 400 dengan pesan yang jelas', async () => {
    const junk = Buffer.from('bukan excel');
    await expect(
      service.parse({ buffer: junk, size: junk.length }),
    ).rejects.toThrow(/tidak bisa dibaca sebagai Excel/i);
  });
});
