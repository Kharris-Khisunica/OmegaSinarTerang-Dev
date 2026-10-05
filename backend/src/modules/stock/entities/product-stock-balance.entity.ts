import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

// CACHE turunan dari SUM(stock_movements.qty_base_unit), BUKAN sumber
// kebenaran (CLAUDE.md §2.5) — StockRecorderService.reconcile() membandingkan
// keduanya. Boleh negatif: stok minus diizinkan, tidak ditolak (§2.8).
@Entity('product_stock_balance')
export class ProductStockBalance {
  @PrimaryColumn({ name: 'product_id' })
  productId: string;

  @PrimaryColumn({ name: 'warehouse_id' })
  warehouseId: string;

  @Column({
    name: 'qty_base_unit',
    type: 'numeric',
    precision: 16,
    scale: 4,
    default: 0,
  })
  qtyBaseUnit: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
