import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  ExportColumn,
  ExportableResponse,
} from '../../core/export/export.types';
import {
  computeQtyBreakdown,
  QtyConversionLevel,
} from '../../core/stock-recorder/qty-breakdown';
import { StockRecorderService } from '../../core/stock-recorder/stock-recorder.service';

interface ProductRow {
  id: string;
  code: string;
  display_name: string;
  base_unit: string;
}

interface ConversionRow {
  product_id: string;
  unit_name: string;
  qty_in_base_unit: string;
}

interface BalanceByTypeRow {
  product_id: string;
  store_qty: string | null;
  bad_stock_qty: string | null;
}

interface StoreBalanceRow {
  product_id: string;
  store_qty: string | null;
}

interface TitipanRawRow {
  product_id: string;
  customer_id: string;
  customer_name: string;
  sales_invoice_id: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  qty_base_unit: string;
}

interface WarehouseRow {
  id: string;
  name: string;
  warehouse_type: string;
}

export interface StockReportRow {
  productId: string;
  code: string;
  displayName: string;
  storeQty: string;
  badStockQty: string;
  totalQty: string;
  [key: string]: unknown;
}

// Paket R8 (docs/RENCANA_REVISI_TESTING_KLIEN.md §2A K7) — bentuknya berubah
// dari pivot Nama Barang x Pelanggan (satu baris per produk, satu kolom per
// pelanggan) menjadi baris FLAT dikelompokkan per pelanggan PER FAKTUR: satu
// baris per (pelanggan, faktur, produk). Pivot lama tidak bisa menunjukkan
// faktur mana yang dititipkan — itu justru yang diminta klien.
export interface TitipanReportRow {
  productId: string;
  displayName: string;
  customerId: string;
  customerName: string;
  salesInvoiceId: string | null;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  qtyText: string;
  [key: string]: unknown;
}

export interface StockOpnameRow {
  productId: string;
  code: string;
  displayName: string;
  baseUnit: string;
  systemQtyBase: number;
  systemQtyText: string;
  titipanQtyBase: number;
  titipanQtyText: string;
  titipanDetail: { customerName: string; qtyText: string }[];
  [key: string]: unknown;
}

export interface StockReconciliationRow {
  productId: string;
  warehouseId: string;
  code: string;
  displayName: string;
  warehouseName: string;
  warehouseType: string;
  movementSumText: string;
  balanceQtyText: string;
  differenceText: string;
  /** true kalau balanceQty (cache) != movementSum (ledger) — HARUS false di DB sehat. */
  hasDifference: boolean;
  titipanQtyText: string;
  titipanDetail: { customerName: string; qtyText: string }[];
  [key: string]: unknown;
}

const STOCK_COLUMNS: ExportColumn[] = [
  { key: 'code', label: 'Kode', width: 16, format: 'text' },
  { key: 'displayName', label: 'Nama Barang', width: 36, format: 'text' },
  { key: 'storeQty', label: 'Stok Toko', width: 20, format: 'text' },
  { key: 'badStockQty', label: 'Stok BS', width: 20, format: 'text' },
  { key: 'totalQty', label: 'Total', width: 20, format: 'text' },
];

// Paket R8 K7 — flat per (pelanggan, faktur, produk), lihat TitipanReportRow.
const TITIPAN_COLUMNS: ExportColumn[] = [
  { key: 'customerName', label: 'Pelanggan', width: 28, format: 'text' },
  { key: 'invoiceNumber', label: 'No. Faktur', width: 20, format: 'text' },
  { key: 'invoiceDate', label: 'Tanggal Faktur', width: 16, format: 'date' },
  { key: 'displayName', label: 'Nama Barang', width: 36, format: 'text' },
  {
    key: 'qtyText',
    label: 'Qty Titipan',
    width: 20,
    format: 'text',
    align: 'right',
  },
];

const RECONCILIATION_COLUMNS: ExportColumn[] = [
  { key: 'code', label: 'Kode', width: 16, format: 'text' },
  { key: 'displayName', label: 'Nama Barang', width: 36, format: 'text' },
  { key: 'warehouseName', label: 'Gudang', width: 22, format: 'text' },
  { key: 'movementSumText', label: 'Σ Pergerakan', width: 18, format: 'text' },
  { key: 'balanceQtyText', label: 'Saldo Sistem', width: 18, format: 'text' },
  { key: 'differenceText', label: 'Selisih', width: 18, format: 'text' },
  {
    key: 'titipanQtyText',
    label: 'Titipan (penjelas)',
    width: 20,
    format: 'text',
  },
];

const OPNAME_COLUMNS: ExportColumn[] = [
  { key: 'code', label: 'Kode', width: 16, format: 'text' },
  { key: 'displayName', label: 'Nama Barang', width: 36, format: 'text' },
  {
    key: 'systemQtyText',
    label: 'Stok Sistem (Toko)',
    width: 22,
    format: 'text',
  },
  {
    key: 'titipanQtyText',
    label: 'Titipan (Total)',
    width: 22,
    format: 'text',
  },
];

/**
 * Laporan Stok, Laporan Barang Titipan, dan worksheet Stok Opname (Hari 29,
 * CLAUDE.md §3 "Gudang" — "daftar titipan wajib muncul di proses stok opname
 * sebagai penjelasan selisih fisik").
 *
 * `TITIPAN_PELANGGAN` sengaja tidak muncul sebagai kolom di Laporan Stok:
 * `WarehouseMutationsService.processTitipan()` tidak pernah menyentuh
 * `product_stock_balance` (mutasi titipan hanya insert `warehouse_mutations`,
 * CLAUDE.md §3), jadi warehouse jenis itu tidak pernah punya baris saldo.
 * Qty titipan HANYA bisa dihitung dari `warehouse_mutation_lines`.
 *
 * Stok Opname di sini adalah worksheet baca-saja: backend tidak menerima
 * atau menyimpan angka fisik — itu murni input & hitungan di FE per sesi
 * browser. Versi tersimpan/beraudit (dengan penyesuaian jurnal) tetap milik
 * Hari 32 dan belum dibahas.
 *
 * Rekonsiliasi Stok (Hari 32) ditambahkan di kelas yang sama: pengecekan
 * integritas ledger (SUM(stock_movements) vs product_stock_balance cache)
 * memakai StockRecorderService.reconcile() Hari 10, plus kolom Titipan yang
 * memakai ulang getTitipanRawRows() di bawah — satu sumber angka titipan
 * untuk ketiga laporan (Titipan, Stok Opname, Rekonsiliasi Stok).
 */
@Injectable()
export class StockReportsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly stockRecorderService: StockRecorderService,
  ) {}

  async getStockBalanceReport(): Promise<ExportableResponse<StockReportRow>> {
    const manager = this.dataSource.manager;
    const products = await this.loadActiveProducts();
    if (products.length === 0) {
      return {
        rows: [],
        columns: STOCK_COLUMNS,
        meta: { title: 'Laporan Stok' },
      };
    }
    const productIds = products.map((p) => p.id);
    const conversions = await this.loadConversions(productIds);

    const balances: BalanceByTypeRow[] = await manager.query(
      `SELECT b.product_id,
              SUM(b.qty_base_unit) FILTER (WHERE w.warehouse_type = 'STORE') AS store_qty,
              SUM(b.qty_base_unit) FILTER (WHERE w.warehouse_type = 'BAD_STOCK') AS bad_stock_qty
         FROM product_stock_balance b
         JOIN warehouses w ON w.id = b.warehouse_id
        WHERE b.product_id = ANY($1)
        GROUP BY b.product_id`,
      [productIds],
    );
    const balanceByProduct = new Map(balances.map((b) => [b.product_id, b]));

    const rows: StockReportRow[] = products.map((p) => {
      const balance = balanceByProduct.get(p.id);
      const storeQty = Number(balance?.store_qty ?? 0);
      const badStockQty = Number(balance?.bad_stock_qty ?? 0);
      const conv = conversions.get(p.id) ?? [];
      return {
        productId: p.id,
        code: p.code,
        displayName: p.display_name,
        storeQty: this.formatQtyText(storeQty, p.base_unit, conv),
        badStockQty: this.formatQtyText(badStockQty, p.base_unit, conv),
        totalQty: this.formatQtyText(storeQty + badStockQty, p.base_unit, conv),
      };
    });

    return {
      rows,
      columns: STOCK_COLUMNS,
      meta: { title: 'Laporan Stok' },
    };
  }

  async getTitipanPivotReport(): Promise<ExportableResponse<TitipanReportRow>> {
    const raw = await this.getTitipanRawRows();
    if (raw.length === 0) {
      return {
        rows: [],
        columns: TITIPAN_COLUMNS,
        meta: { title: 'Laporan Barang Titipan' },
      };
    }

    const productIds = [...new Set(raw.map((r) => r.product_id))];
    const products = await this.loadProductsByIds(productIds);
    const conversions = await this.loadConversions(productIds);

    const rows: TitipanReportRow[] = raw
      .map((r): TitipanReportRow | null => {
        const product = products.get(r.product_id);
        if (!product) return null;
        const conv = conversions.get(r.product_id) ?? [];
        return {
          productId: r.product_id,
          displayName: product.display_name,
          customerId: r.customer_id,
          customerName: r.customer_name,
          // NULL hanya untuk baris pra-R8 yang lolos dari cleanup (tidak
          // seharusnya ada — lihat migration
          // AddSalesInvoiceRefToWarehouseMutations) — dibiarkan NULL
          // (tampil kosong di export, bukan "NaN/NaN/NaN" dari Date invalid)
          // daripada memecahkan laporan.
          salesInvoiceId: r.sales_invoice_id,
          invoiceNumber: r.invoice_number,
          invoiceDate: r.invoice_date,
          qtyText: this.formatQtyText(
            Number(r.qty_base_unit),
            product.base_unit,
            conv,
          ),
        };
      })
      .filter((r): r is TitipanReportRow => r !== null)
      .sort((a, b) => {
        const byCustomer = a.customerName.localeCompare(b.customerName);
        if (byCustomer !== 0) return byCustomer;
        const byInvoice = (a.invoiceNumber ?? '').localeCompare(
          b.invoiceNumber ?? '',
        );
        if (byInvoice !== 0) return byInvoice;
        return a.displayName.localeCompare(b.displayName);
      });

    return {
      rows,
      columns: TITIPAN_COLUMNS,
      meta: { title: 'Laporan Barang Titipan' },
    };
  }

  async getStockOpnameWorksheet(): Promise<ExportableResponse<StockOpnameRow>> {
    const manager = this.dataSource.manager;
    const products = await this.loadActiveProducts();
    if (products.length === 0) {
      return {
        rows: [],
        columns: OPNAME_COLUMNS,
        meta: { title: 'Stok Opname (Worksheet)' },
      };
    }
    const productIds = products.map((p) => p.id);
    const conversions = await this.loadConversions(productIds);

    const storeBalances: StoreBalanceRow[] = await manager.query(
      `SELECT b.product_id, SUM(b.qty_base_unit) AS store_qty
         FROM product_stock_balance b
         JOIN warehouses w ON w.id = b.warehouse_id
        WHERE w.warehouse_type = 'STORE' AND b.product_id = ANY($1)
        GROUP BY b.product_id`,
      [productIds],
    );
    const storeByProduct = new Map(
      storeBalances.map((b) => [b.product_id, Number(b.store_qty ?? 0)]),
    );

    const titipanRaw = await this.getTitipanRawRows(productIds);
    const titipanByProduct = new Map<
      string,
      { customerName: string; qty: number }[]
    >();
    for (const r of titipanRaw) {
      if (!titipanByProduct.has(r.product_id)) {
        titipanByProduct.set(r.product_id, []);
      }
      titipanByProduct
        .get(r.product_id)!
        .push({ customerName: r.customer_name, qty: Number(r.qty_base_unit) });
    }

    const rows: StockOpnameRow[] = products.map((p) => {
      const conv = conversions.get(p.id) ?? [];
      const systemQtyBase = storeByProduct.get(p.id) ?? 0;
      const detail = titipanByProduct.get(p.id) ?? [];
      const titipanQtyBase = detail.reduce((sum, d) => sum + d.qty, 0);
      return {
        productId: p.id,
        code: p.code,
        displayName: p.display_name,
        baseUnit: p.base_unit,
        systemQtyBase,
        systemQtyText: this.formatQtyText(systemQtyBase, p.base_unit, conv),
        titipanQtyBase,
        titipanQtyText: this.formatQtyText(titipanQtyBase, p.base_unit, conv),
        titipanDetail: detail.map((d) => ({
          customerName: d.customerName,
          qtyText: this.formatQtyText(d.qty, p.base_unit, conv),
        })),
      };
    });

    return {
      rows,
      columns: OPNAME_COLUMNS,
      meta: {
        title: 'Stok Opname (Worksheet)',
        subtitle:
          'Perbandingan fisik vs sistem dihitung di layar, tidak disimpan ke database.',
      },
    };
  }

  /**
   * Endpoint pemanggil pertama untuk StockRecorderService.reconcile() (ada
   * sejak Hari 10, belum pernah dipanggil dari mana pun). Selisih di sini
   * WAJIB 0 pada DB sehat — kalau tidak, movement INSERT dan upsertBalance()
   * sudah lepas dari transaction yang sama (bug integritas, bukan hal yang
   * "dijelaskan" barang titipan).
   *
   * Kolom Titipan bersifat KONTEKS TAMBAHAN, bukan penjelas untuk kolom
   * Selisih: mutasi titipan sengaja tidak pernah menyentuh
   * stock_movements/product_stock_balance (CLAUDE.md §3 "Gudang"), jadi
   * secara matematis ia tidak bisa menyebabkan ledger != cache. Yang
   * dijelaskannya adalah pembacaan "Saldo Sistem" gudang STORE oleh manusia
   * saat opname fisik — sebagian dari angka itu sudah terjual & dititip,
   * bukan barang yang seharusnya ada di rak. Hanya diisi untuk baris
   * gudang STORE; ditambahkan lewat getTitipanRawRows() yang sama dipakai
   * getTitipanPivotReport()/getStockOpnameWorksheet(), tidak disalin.
   */
  async getStockReconciliationReport(): Promise<
    ExportableResponse<StockReconciliationRow>
  > {
    const reconcileRows = await this.stockRecorderService.reconcile();
    if (reconcileRows.length === 0) {
      return {
        rows: [],
        columns: RECONCILIATION_COLUMNS,
        meta: { title: 'Rekonsiliasi Stok' },
      };
    }

    const productIds = [...new Set(reconcileRows.map((r) => r.productId))];
    const warehouseIds = [...new Set(reconcileRows.map((r) => r.warehouseId))];
    const products = await this.loadProductsByIds(productIds);
    const conversions = await this.loadConversions(productIds);
    const warehouses = await this.loadWarehousesByIds(warehouseIds);

    const storeProductIds = [
      ...new Set(
        reconcileRows
          .filter(
            (r) => warehouses.get(r.warehouseId)?.warehouse_type === 'STORE',
          )
          .map((r) => r.productId),
      ),
    ];
    const titipanRaw = await this.getTitipanRawRows(storeProductIds);
    const titipanByProduct = new Map<
      string,
      { customerName: string; qty: number }[]
    >();
    for (const r of titipanRaw) {
      if (!titipanByProduct.has(r.product_id)) {
        titipanByProduct.set(r.product_id, []);
      }
      titipanByProduct
        .get(r.product_id)!
        .push({ customerName: r.customer_name, qty: Number(r.qty_base_unit) });
    }

    const rows: StockReconciliationRow[] = reconcileRows
      .map((r): StockReconciliationRow | null => {
        const product = products.get(r.productId);
        const warehouse = warehouses.get(r.warehouseId);
        if (!product || !warehouse) return null;
        const conv = conversions.get(r.productId) ?? [];
        const isStore = warehouse.warehouse_type === 'STORE';
        const detail = isStore ? (titipanByProduct.get(r.productId) ?? []) : [];
        const titipanQtyBase = detail.reduce((sum, d) => sum + d.qty, 0);
        return {
          productId: r.productId,
          warehouseId: r.warehouseId,
          code: product.code,
          displayName: product.display_name,
          warehouseName: warehouse.name,
          warehouseType: warehouse.warehouse_type,
          movementSumText: this.formatQtyText(
            r.movementSum,
            product.base_unit,
            conv,
          ),
          balanceQtyText: this.formatQtyText(
            r.balanceQty,
            product.base_unit,
            conv,
          ),
          differenceText: this.formatQtyText(
            r.difference,
            product.base_unit,
            conv,
          ),
          hasDifference: r.difference !== 0,
          titipanQtyText: this.formatQtyText(
            titipanQtyBase,
            product.base_unit,
            conv,
          ),
          titipanDetail: detail.map((d) => ({
            customerName: d.customerName,
            qtyText: this.formatQtyText(d.qty, product.base_unit, conv),
          })),
        };
      })
      .filter((r): r is StockReconciliationRow => r !== null)
      .sort((a, b) => {
        if (a.hasDifference !== b.hasDifference) {
          return a.hasDifference ? -1 : 1;
        }
        return a.displayName.localeCompare(b.displayName);
      });

    return {
      rows,
      columns: RECONCILIATION_COLUMNS,
      meta: { title: 'Rekonsiliasi Stok' },
    };
  }

  /**
   * Dipakai bersama oleh getTitipanPivotReport() dan getStockOpnameWorksheet()
   * — satu sumber angka titipan, tidak disalin (template laporan §"ATURAN
   * WAJIB": "kalau butuh rumus yang sama, panggil fungsinya, jangan salin").
   */
  private async getTitipanRawRows(
    productIds?: string[],
  ): Promise<TitipanRawRow[]> {
    if (productIds && productIds.length === 0) return [];
    const manager = this.dataSource.manager;
    const params: unknown[] = [];
    let filterClause = '';
    if (productIds) {
      params.push(productIds);
      filterClause = `AND wml.product_id = ANY($${params.length})`;
    }
    // LEFT JOIN sales_invoices (bukan JOIN) — pola sama defensive read di
    // migration AddSalesInvoiceRefToWarehouseMutations: baris pra-R8 yang
    // entah bagaimana lolos tanpa sales_invoice_id tidak boleh menghilang
    // dari laporan, hanya tampil tanpa nomor/tanggal faktur. GROUP BY diberi
    // wm.sales_invoice_id (bukan hanya product_id+customer_id) supaya
    // laporan Titipan (getTitipanPivotReport) bisa pecah per faktur —
    // getStockOpnameWorksheet()/getStockReconciliationReport() tetap benar
    // karena mereka menjumlahkan ulang seluruh baris per produk, jadi
    // pecahan per faktur di sini tidak mengubah totalnya.
    return manager.query(
      `SELECT wml.product_id, w.customer_id, c.name AS customer_name,
              wm.sales_invoice_id, si.invoice_number, si.invoice_date,
              SUM(wml.qty_base_unit) AS qty_base_unit
         FROM warehouse_mutation_lines wml
         JOIN warehouse_mutations wm ON wm.id = wml.mutation_id
         JOIN warehouses w ON w.id = wm.to_warehouse_id
         JOIN customers c ON c.id = w.customer_id
         LEFT JOIN sales_invoices si ON si.id = wm.sales_invoice_id
        WHERE wm.mutation_type = 'TITIPAN_PELANGGAN'
          AND wm.posting_status = 'POSTED'
          ${filterClause}
        GROUP BY wml.product_id, w.customer_id, c.name,
                 wm.sales_invoice_id, si.invoice_number, si.invoice_date
        HAVING SUM(wml.qty_base_unit) <> 0`,
      params,
    );
  }

  private async loadActiveProducts(): Promise<ProductRow[]> {
    return this.dataSource.manager.query(
      `SELECT id, code, display_name, base_unit FROM products WHERE is_active = true ORDER BY display_name`,
    );
  }

  private async loadProductsByIds(
    productIds: string[],
  ): Promise<Map<string, ProductRow>> {
    if (productIds.length === 0) return new Map();
    const rows: ProductRow[] = await this.dataSource.manager.query(
      `SELECT id, code, display_name, base_unit FROM products WHERE id = ANY($1)`,
      [productIds],
    );
    return new Map(rows.map((r) => [r.id, r]));
  }

  private async loadWarehousesByIds(
    warehouseIds: string[],
  ): Promise<Map<string, WarehouseRow>> {
    if (warehouseIds.length === 0) return new Map();
    const rows: WarehouseRow[] = await this.dataSource.manager.query(
      `SELECT id, name, warehouse_type FROM warehouses WHERE id = ANY($1)`,
      [warehouseIds],
    );
    return new Map(rows.map((r) => [r.id, r]));
  }

  private async loadConversions(
    productIds: string[],
  ): Promise<Map<string, QtyConversionLevel[]>> {
    if (productIds.length === 0) return new Map();
    const rows: ConversionRow[] = await this.dataSource.manager.query(
      `SELECT product_id, unit_name, qty_in_base_unit FROM product_unit_conversions WHERE product_id = ANY($1)`,
      [productIds],
    );
    const map = new Map<string, QtyConversionLevel[]>();
    for (const r of rows) {
      if (!map.has(r.product_id)) map.set(r.product_id, []);
      map.get(r.product_id)!.push({
        unitName: r.unit_name,
        qtyInBaseUnit: Number(r.qty_in_base_unit),
      });
    }
    return map;
  }

  // Nol tampil "-" (PANDUAN_UI.md §14.2) — computeQtyBreakdown() sendiri akan
  // menghasilkan "0 <base_unit>" untuk qty 0 (dirancang supaya hasil tidak
  // pernah string kosong), jadi kasus nol ditangani terpisah di sini.
  private formatQtyText(
    qtyBaseUnit: number,
    baseUnit: string,
    conversions: QtyConversionLevel[],
  ): string {
    if (qtyBaseUnit === 0) return '-';
    return computeQtyBreakdown(qtyBaseUnit, baseUnit, conversions);
  }
}
