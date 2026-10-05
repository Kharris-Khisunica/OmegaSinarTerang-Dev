import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DeliveryOrder } from './delivery-order.entity';

// Tidak ada UpdateDateColumn dengan sengaja — append-only, pola sama
// sales_return_lines/sales_invoice_lines. TIDAK ADA kolom rupiah/harga/HPP —
// surat jalan bukan dokumen uang (CLAUDE.md §1: nota dibawa sopir menagih,
// bukan surat jalan).
@Entity('delivery_order_lines')
export class DeliveryOrderLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'delivery_order_id', type: 'uuid' })
  deliveryOrderId: string;

  @ManyToOne(() => DeliveryOrder, (order) => order.lines)
  @JoinColumn({ name: 'delivery_order_id' })
  deliveryOrder: DeliveryOrder;

  @Column({ name: 'line_order' })
  lineOrder: number;

  // Anchor ke baris faktur asal — baris disalin APA ADANYA dari sini
  // (product/unit/qty), tidak pernah dihitung ulang.
  @Column({ name: 'sales_invoice_line_id', type: 'uuid' })
  salesInvoiceLineId: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({ name: 'unit_id', type: 'uuid' })
  unitId: string;

  @Column({ name: 'qty_input', type: 'numeric', precision: 16, scale: 4 })
  qtyInput: string;

  @Column({ name: 'qty_base_unit', type: 'numeric', precision: 16, scale: 4 })
  qtyBaseUnit: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
