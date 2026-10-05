import { StockMovementType } from '../../../modules/stock/entities/stock-movement.entity';

// Union bantuan tipe TypeScript (source_type tetap VARCHAR bebas di DB) —
// pola sama dengan JournalSourceType di core/journal-poster.
export type StockSourceType =
  | 'MANUAL'
  | 'OPENING_BALANCE'
  | 'PURCHASE_INVOICE'
  | 'PURCHASE_RETURN'
  | 'SALES_INVOICE'
  | 'SALES_RETURN'
  | 'WAREHOUSE_MUTATION'
  | 'STOCK_ADJUSTMENT'
  | 'VOID_REVERSAL'
  | 'REVISION_REVERSAL';

export interface RecordInDto {
  productId: string;
  warehouseId: string;
  /** Selalu > 0 — arah "masuk" ditentukan method-nya (recordIn), bukan tanda field ini. */
  qtyBaseUnit: number;
  /** Harga pokok per satuan dasar. Boleh 0 untuk baris bonus supplier (CLAUDE.md §3). */
  unitCost: number;
  /**
   * Tanggal lot untuk urutan FIFO — untuk pembelian ini WAJIB receipt_date
   * (tanggal terima barang), BUKAN supplier_invoice_date (CLAUDE.md §3).
   */
  lotDate: Date;
  movementDate: Date;
  movementType: StockMovementType;
  /** Nullable — hanya terisi kalau lot punya asal supplier yang jelas (mis. pembelian). */
  supplierId?: string | null;
  sourceType: StockSourceType;
  sourceId?: string | null;
  createdBy: string;
}

export interface RecordOutDto {
  productId: string;
  warehouseId: string;
  /** Selalu > 0 — disimpan sebagai movement negatif di dalam service. */
  qtyBaseUnit: number;
  movementDate: Date;
  movementType: StockMovementType;
  sourceType: StockSourceType;
  sourceId?: string | null;
  createdBy: string;
  /**
   * Opsional — kalau terisi, FIFO HANYA mengonsumsi lot bersupplier ini
   * (Retur Pembelian Hari 16: pilih supplier dulu, retur cuma boleh ambil
   * lot BAD_STOCK milik supplier itu). Default undefined = perilaku lama
   * (semua lot produk+gudang, tanpa filter supplier) untuk semua caller lain.
   */
  supplierId?: string;
  /**
   * Opsional — kalau true, shortfall (stok tidak cukup, dengan/tanpa filter
   * supplier) MELEMPAR BadRequestException alih-alih fallback ke
   * getLatestCostBasis() (§2.8 "stok minus diizinkan" HANYA berlaku untuk
   * penjualan, bukan retur pembelian yang wajib mengambil lot nyata).
   * Default undefined/false = perilaku lama.
   */
  disallowNegativeStock?: boolean;
}

export interface RecordOutResult {
  movement: import('../../../modules/stock/entities/stock-movement.entity').StockMovement;
  totalCost: number;
  consumptions: import('../../../modules/stock/entities/stock-cost-consumption.entity').StockCostConsumption[];
  /** Terisi kalau balance jatuh di bawah 0 setelah movement ini (CLAUDE.md §2.8). */
  stockWarning?: string;
}

export interface TransferDto {
  productId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  qtyBaseUnit: number;
  movementDate: Date;
  sourceType: StockSourceType;
  sourceId?: string | null;
  createdBy: string;
}

export interface TransferResult {
  movementOut: import('../../../modules/stock/entities/stock-movement.entity').StockMovement;
  movementIn: import('../../../modules/stock/entities/stock-movement.entity').StockMovement;
  stockWarning?: string;
}

export interface ReconcileFilter {
  productId?: string;
  warehouseId?: string;
}

export interface ReconcileRow {
  productId: string;
  warehouseId: string;
  /** SUM(stock_movements.qty_base_unit) — turunan dari ledger, sumber kebenaran. */
  movementSum: number;
  /** product_stock_balance.qty_base_unit — cache. */
  balanceQty: number;
  /** balanceQty - movementSum. 0 kalau cache konsisten dengan ledger. */
  difference: number;
}
