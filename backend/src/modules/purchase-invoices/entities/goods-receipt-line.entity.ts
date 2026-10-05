import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { GoodsReceipt } from './goods-receipt.entity';

// Append-only, satu baris per baris faktur (termasuk baris bonus — bonus
// tetap masuk stok penuh, CLAUDE.md §3 "Bonus").
@Entity('goods_receipt_lines')
export class GoodsReceiptLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'goods_receipt_id', type: 'uuid' })
  goodsReceiptId: string;

  @ManyToOne(() => GoodsReceipt, (receipt) => receipt.lines)
  @JoinColumn({ name: 'goods_receipt_id' })
  goodsReceipt: GoodsReceipt;

  @Column({ name: 'purchase_invoice_line_id', type: 'uuid' })
  purchaseInvoiceLineId: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({ name: 'qty_base_unit', type: 'numeric', precision: 16, scale: 4 })
  qtyBaseUnit: string;

  @Column({
    name: 'unit_cost',
    type: 'numeric',
    precision: 16,
    scale: 4,
    default: 0,
  })
  unitCost: string;

  // Rujukan ke stock_movements yang dihasilkan StockRecorderService.recordIn()
  // untuk baris ini — bukti "barang ini sudah masuk stok lewat gerakan itu".
  @Column({ name: 'stock_movement_id', type: 'uuid' })
  stockMovementId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
