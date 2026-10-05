import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PurchaseReturn } from './purchase-return.entity';

// Tidak ada UpdateDateColumn/trigger dengan sengaja — append-only, pola sama
// purchase_invoice_lines/warehouse_mutation_lines.
@Entity('purchase_return_lines')
export class PurchaseReturnLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'purchase_return_id', type: 'uuid' })
  purchaseReturnId: string;

  @ManyToOne(() => PurchaseReturn, (ret) => ret.lines)
  @JoinColumn({ name: 'purchase_return_id' })
  purchaseReturn: PurchaseReturn;

  @Column({ name: 'line_order' })
  lineOrder: number;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  // Angka mentah sesuai unit_mode HEADER dokumen (satuan besar produk kalau
  // BESAR, base unit kalau KECIL) — TIDAK ADA unit_id di baris, satuan besar
  // di-resolve dari product.unitConversions (CLAUDE.md §3: 1 produk = 1
  // satuan besar, dikonfirmasi user).
  @Column({ name: 'qty_input', type: 'numeric', precision: 16, scale: 4 })
  qtyInput: string;

  @Column({ name: 'qty_base_unit', type: 'numeric', precision: 16, scale: 4 })
  qtyBaseUnit: string;

  // Rupiah PER qty_input (per DUS kalau BESAR, per PCS kalau KECIL) — BUKAN
  // per base unit. Pola sama purchase_invoice_lines.unit_price.
  @Column({
    name: 'agreed_unit_price',
    type: 'numeric',
    precision: 16,
    scale: 2,
  })
  agreedUnitPrice: string;

  @Column({ name: 'agreed_amount', type: 'numeric', precision: 16, scale: 2 })
  agreedAmount: string;

  // Rata-rata FIFO per base unit dari lot BAD_STOCK yang dikonsumsi baris
  // ini — informasional (harga pokok, CLAUDE.md §14 presisi 4).
  @Column({
    name: 'cost_basis_unit_cost',
    type: 'numeric',
    precision: 16,
    scale: 4,
    default: 0,
  })
  costBasisUnitCost: string;

  @Column({
    name: 'cost_basis_amount',
    type: 'numeric',
    precision: 16,
    scale: 2,
    default: 0,
  })
  costBasisAmount: string;

  @Column({ name: 'stock_movement_id', type: 'uuid' })
  stockMovementId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
