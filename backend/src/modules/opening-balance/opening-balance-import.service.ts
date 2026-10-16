import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import * as ExcelJS from 'exceljs';
import { DataSource } from 'typeorm';

/**
 * Impor Saldo Awal dari Excel (need_fixing.md #21, opsi 4b — 6 Okt 2026).
 * FORMAT TEMPLATE ADALAH USULAN DEVELOPER, belum keputusan klien (PR terbuka
 * KONTEKS_REVISI §4.1) — kalau klien nanti memakai bentuk lain, hanya file
 * ini yang berubah.
 *
 * SENGAJA hanya MENGURAI + memvalidasi, TIDAK memposting: hasilnya pratinjau
 * yang dikirim ulang FE ke POST /opening-balance (OpeningBalanceService.
 * submit()) — CLAUDE.md §3 "Saldo Awal": stok, piutang, hutang SATU alur
 * lewat StockRecorder/JournalPoster yang sama, tidak ada jalur khusus.
 *
 * Qty stok diketik "angka + satuan" (need_fixing.md #28), harga pokok per
 * satuan yang diketik; dikonversi ke satuan dasar di sini (qty × isi,
 * harga ÷ isi, 4 desimal — NUMERIC(16,4), §2.14).
 */

export const SHEET_STOCK = 'Stok';
export const SHEET_RECEIVABLE = 'Piutang';
export const SHEET_PAYABLE = 'Hutang';

export interface ImportedStockLine {
  row: number;
  productId: string;
  productLabel: string;
  qty: number;
  unitName: string;
  qtyBaseUnit: number;
  unitCostInput: number;
  unitCost: number;
}
export interface ImportedPartyLine {
  row: number;
  partyId: string;
  partyLabel: string;
  amount: number;
  description?: string;
}
export interface ImportError {
  sheet: string;
  row: number;
  message: string;
}
export interface OpeningBalanceImportResult {
  stockLines: ImportedStockLine[];
  receivableLines: ImportedPartyLine[];
  payableLines: ImportedPartyLine[];
  errors: ImportError[];
}

const MAX_FILE_BYTES = 2 * 1024 * 1024;

@Injectable()
export class OpeningBalanceImportService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async buildTemplate(): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const addSheet = (name: string, headers: string[], example: unknown[]) => {
      const ws = wb.addWorksheet(name);
      ws.addRow(headers);
      ws.getRow(1).font = { bold: true };
      ws.addRow(example);
      ws.columns.forEach((col) => {
        col.width = 24;
      });
    };
    addSheet(
      SHEET_STOCK,
      ['Kode Produk', 'Qty', 'Satuan', 'Harga Pokok per Satuan'],
      ['2401200001', 10, 'DUS', 120000],
    );
    addSheet(
      SHEET_RECEIVABLE,
      ['Kode Pelanggan', 'Nominal', 'Keterangan'],
      ['C0001', 5000000, 'Saldo piutang per 31 Agustus'],
    );
    addSheet(
      SHEET_PAYABLE,
      ['Kode Supplier', 'Nominal', 'Keterangan'],
      ['S0001', 7500000, 'Saldo hutang per 31 Agustus'],
    );
    const info = wb.addWorksheet('Petunjuk');
    [
      'Baris 1 tiap sheet = judul kolom, JANGAN diubah. Baris contoh (baris 2) boleh ditimpa/dihapus.',
      'Sheet boleh dikosongkan kalau tidak ada saldo jenis itu.',
      'Stok: Satuan boleh dikosongkan = satuan terbesar produk. Harga Pokok per satuan yang ditulis di kolom Satuan.',
      'Gudang stok selalu STORE. Tanggal saldo awal selalu settings.opening_balance_date (tidak diisi di file).',
      'File hanya DIBACA sebagai pratinjau — posting baru terjadi setelah tombol Posting di layar ditekan.',
    ].forEach((line) => info.addRow([line]));
    info.getColumn(1).width = 110;
    return Buffer.from(await wb.xlsx.writeBuffer());
  }

  async parse(file: {
    buffer: Buffer;
    size: number;
  }): Promise<OpeningBalanceImportResult> {
    if (!file?.buffer) {
      throw new BadRequestException('File Excel wajib diunggah.');
    }
    if (file.size > MAX_FILE_BYTES) {
      throw new BadRequestException('File terlalu besar (maksimal 2 MB).');
    }
    const wb = new ExcelJS.Workbook();
    try {
      await wb.xlsx.load(file.buffer as unknown as ArrayBuffer);
    } catch {
      throw new BadRequestException(
        'File tidak bisa dibaca sebagai Excel (.xlsx). Unduh template dari layar Saldo Awal.',
      );
    }

    const result: OpeningBalanceImportResult = {
      stockLines: [],
      receivableLines: [],
      payableLines: [],
      errors: [],
    };
    await this.parseStock(wb.getWorksheet(SHEET_STOCK), result);
    await this.parseParty(
      wb.getWorksheet(SHEET_RECEIVABLE),
      'customer',
      result,
    );
    await this.parseParty(wb.getWorksheet(SHEET_PAYABLE), 'supplier', result);

    if (
      result.stockLines.length === 0 &&
      result.receivableLines.length === 0 &&
      result.payableLines.length === 0 &&
      result.errors.length === 0
    ) {
      throw new BadRequestException(
        `File tidak berisi baris saldo awal — isi sheet "${SHEET_STOCK}", "${SHEET_RECEIVABLE}", atau "${SHEET_PAYABLE}".`,
      );
    }
    return result;
  }

  private async parseStock(
    ws: ExcelJS.Worksheet | undefined,
    result: OpeningBalanceImportResult,
  ): Promise<void> {
    if (!ws) return;
    const products: {
      id: string;
      code: string;
      display_name: string;
      base_unit: string;
      is_active: boolean;
    }[] = await this.dataSource.query(
      `SELECT id, code, display_name, base_unit, is_active FROM products`,
    );
    const conversions: {
      product_id: string;
      unit_name: string;
      qty_in_base_unit: string;
    }[] = await this.dataSource.query(
      `SELECT product_id, unit_name, qty_in_base_unit FROM product_unit_conversions`,
    );
    const byCode = new Map(products.map((p) => [p.code.trim(), p]));

    ws.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const code = cellText(row.getCell(1));
      const qtyRaw = cellNumber(row.getCell(2));
      const unitRaw = cellText(row.getCell(3));
      const costRaw = cellNumber(row.getCell(4));
      if (!code && qtyRaw === null && !unitRaw && costRaw === null) return;
      const err = (message: string) =>
        result.errors.push({ sheet: SHEET_STOCK, row: rowNumber, message });

      const product = byCode.get(code);
      if (!product) return err(`Kode produk "${code}" tidak ditemukan.`);
      if (!product.is_active) return err(`Produk ${code} tidak aktif.`);
      if (qtyRaw === null || qtyRaw <= 0) return err('Qty wajib angka > 0.');
      if (costRaw === null || costRaw < 0) {
        return err('Harga pokok wajib angka ≥ 0.');
      }

      const units = [
        { name: product.base_unit, factor: 1 },
        ...conversions
          .filter((c) => c.product_id === product.id)
          .map((c) => ({
            name: c.unit_name,
            factor: Number(c.qty_in_base_unit),
          })),
      ].sort((a, b) => b.factor - a.factor);
      const unit = unitRaw
        ? units.find(
            (u) => u.name.trim().toLowerCase() === unitRaw.toLowerCase(),
          )
        : units[0];
      if (!unit) {
        return err(
          `Satuan "${unitRaw}" tidak dikenal untuk produk ${code} (pilihan: ${units.map((u) => u.name).join(', ')}).`,
        );
      }
      result.stockLines.push({
        row: rowNumber,
        productId: product.id,
        productLabel: `${product.display_name} (${product.code})`,
        qty: qtyRaw,
        unitName: unit.name,
        qtyBaseUnit: round4(qtyRaw * unit.factor),
        unitCostInput: costRaw,
        unitCost: round4(costRaw / unit.factor),
      });
    });
  }

  private async parseParty(
    ws: ExcelJS.Worksheet | undefined,
    kind: 'customer' | 'supplier',
    result: OpeningBalanceImportResult,
  ): Promise<void> {
    if (!ws) return;
    const sheet = kind === 'customer' ? SHEET_RECEIVABLE : SHEET_PAYABLE;
    const parties: { id: string; code: string; name: string }[] =
      kind === 'customer'
        ? await this.dataSource.query(`SELECT id, code, name FROM customers`)
        : await this.dataSource.query(
            `SELECT id, display_code AS code, name FROM suppliers`,
          );
    const byCode = new Map(parties.map((p) => [p.code.trim(), p]));
    const target =
      kind === 'customer' ? result.receivableLines : result.payableLines;

    ws.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const code = cellText(row.getCell(1));
      const amount = cellNumber(row.getCell(2));
      const description = cellText(row.getCell(3));
      if (!code && amount === null && !description) return;
      const err = (message: string) =>
        result.errors.push({ sheet, row: rowNumber, message });

      const party = byCode.get(code);
      if (!party) {
        return err(
          `Kode ${kind === 'customer' ? 'pelanggan' : 'supplier'} "${code}" tidak ditemukan.`,
        );
      }
      if (amount === null || amount <= 0) {
        return err('Nominal wajib angka > 0.');
      }
      target.push({
        row: rowNumber,
        partyId: party.id,
        partyLabel: `${party.code} - ${party.name}`,
        amount: Math.round(amount * 100) / 100,
        description: description || undefined,
      });
    });
  }
}

// cell.text = teks tampilan ExcelJS untuk SEMUA jenis nilai (rich text,
// hyperlink, hasil formula) — tidak perlu membedah cell.value sendiri.
function cellText(cell: ExcelJS.Cell): string {
  return (cell.text ?? '').trim();
}

function cellNumber(cell: ExcelJS.Cell): number | null {
  const v = cell.value;
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return v;
  if (typeof v === 'object' && 'result' in v && typeof v.result === 'number') {
    return v.result;
  }
  // Angka yang diketik sebagai teks "1.500.000" / "1500000,5" (format id-ID).
  const normalized = cellText(cell).replace(/\./g, '').replace(',', '.');
  const n = Number(normalized);
  return Number.isFinite(n) && normalized !== '' ? n : null;
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}
