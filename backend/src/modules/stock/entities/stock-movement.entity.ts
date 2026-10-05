import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// Jenis pergerakan stok (jantung Stock Recorder, CLAUDE.md §2.5). Arah
// ditentukan tanda qty_base_unit (positif=masuk, negatif=keluar), bukan tipe.
export enum StockMovementType {
  PURCHASE = 'purchase',
  SALE = 'sale',
  TRANSFER = 'transfer',
  RETURN_IN = 'return_in',
  RETURN_OUT = 'return_out',
  ADJUSTMENT = 'adjustment',
  OPENING = 'opening',
}

// Ledger append-only — satu-satunya jalan menulis baris di sini adalah
// StockRecorderService (CLAUDE.md §2.5: "dilarang UPDATE langsung ke
// product_stock_balance dari modul lain", diperluas ke seluruh tabel stok).
@Entity('stock_movements')
export class StockMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id' })
  productId: string;

  @Column({ name: 'warehouse_id' })
  warehouseId: string;

  @Column({
    name: 'movement_type',
    type: 'enum',
    enum: StockMovementType,
    enumName: 'stock_movement_type',
  })
  movementType: StockMovementType;

  @Column({
    name: 'qty_base_unit',
    type: 'numeric',
    precision: 16,
    scale: 4,
  })
  qtyBaseUnit: string;

  @Column({
    name: 'unit_cost',
    type: 'numeric',
    precision: 16,
    scale: 4,
  })
  unitCost: string;

  @Column({ name: 'source_type' })
  sourceType: string;

  @Column({ name: 'source_id', nullable: true, type: 'uuid' })
  sourceId: string | null;

  @Column({ name: 'movement_date', type: 'date' })
  movementDate: string;

  @Column({ name: 'created_by' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
